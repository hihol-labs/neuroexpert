#!/bin/bash
# Сериализация мутирующих удалённых шагов.
#
# Дефект (находка ревью, раунд 19): при потере ответа ssh_script повторял шаг,
# а первый процесс на сервере мог всё ещё выполнять `rsync --delete` или
# `docker compose up`. Файловый deploy-lock их не разводил — RUN_ID у ретрая
# тот же самый. Теперь каждый мутирующий шаг берёт flock на сервере.
#
# Проверяем две вещи: преамбула есть во ВСЕХ мутирующих шагах (и её не потеряют
# при рефакторинге), и она действительно не пускает второй экземпляр.
set -u
cd "$(dirname "$0")/../.." || exit 1

FAILED=0
check() { if [ "$2" = "1" ]; then echo "OK   $1"; else echo "FAIL $1"; FAILED=1; fi; }

# --- 1. Преамбула на месте у каждого мутирующего шага ---
# Границы шага — от его heredoc до закрывающего REMOTE.
for step in step1-artifact step1-git step3-build step4-migrate; do
  BODY=$(awk "/cat > \"\\\$TMPDIR_RUN\/${step}.sh\" <<'REMOTE'/,/^REMOTE$/" scripts/deploy.sh)
  HAS=$(printf '%s' "$BODY" | grep -c 'flock -w')
  check "$step сериализован (flock найден: $HAS)" "$([ "$HAS" -ge 1 ] && echo 1 || echo 0)"
done

# Файл блокировки обязан лежать ВНЕ каталога релиза: rsync --delete и git clean
# сносят его вместе с деревом, и flock перестаёт разводить процессы (раунд 21).
IN_APPDIR=$(grep -c 'exec 9>"/opt/neuroexpert' scripts/deploy.sh)
check "lock шага не внутри каталога релиза (найдено таких: $IN_APPDIR)" \
  "$([ "$IN_APPDIR" = "0" ] && echo 1 || echo 0)"
OUTSIDE=$(grep -c 'exec 9>"/tmp/neuroexpert-deploy.step.lock"' scripts/deploy.sh)
check "lock шага в /tmp у всех четырёх шагов (найдено: $OUTSIDE)" \
  "$([ "$OUTSIDE" = "4" ] && echo 1 || echo 0)"

# Read-only шаги сериализовать не нужно: они ничего не меняют и ожидание
# только удлиняло бы деплой. Фиксируем это как осознанное решение.
HEALTH_BODY=$(awk "/cat > \"\\\$TMPDIR_RUN\/step5-health.sh\" <<'REMOTE'/,/^REMOTE\$/" scripts/deploy.sh)
check "health-шаг НЕ сериализован (он read-only)" \
  "$(printf '%s' "$HEALTH_BODY" | grep -qc 'flock -w' && echo 0 || echo 1)"

# --- 2. Преамбула реально держит второй экземпляр ---
WORK="$(mktemp -d -t nx-flock-test-XXXXXX)"
trap 'rm -rf "$WORK"' EXIT
LOCKFILE="$WORK/step.lock"

cat > "$WORK/holder.sh" <<EOF
exec 9>"$LOCKFILE"
flock -w 5 9 || exit 1
sleep 3
EOF
cat > "$WORK/second.sh" <<EOF
exec 9>"$LOCKFILE"
flock -w 1 9 || exit 1
EOF

bash "$WORK/holder.sh" &
HOLDER=$!
sleep 0.5
bash "$WORK/second.sh"
SECOND_RC=$?
wait "$HOLDER"

check "второй экземпляр не вошёл, пока первый работает (код $SECOND_RC)" \
  "$([ "$SECOND_RC" != "0" ] && echo 1 || echo 0)"

# После завершения первого лок свободен — деплой не заклинивает навсегда.
bash "$WORK/second.sh"
check "после завершения первого лок свободен (код $?)" "$([ "$?" = "0" ] && echo 1 || echo 0)"

[ "$FAILED" = "0" ] && echo "ВСЕ ПРОВЕРКИ ПРОШЛИ" || echo "ЕСТЬ ПАДЕНИЯ"
exit "$FAILED"
