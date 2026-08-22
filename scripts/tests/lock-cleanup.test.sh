#!/bin/bash
# Уборка удалённого состояния на аварийном выходе.
#
# Класс дефекта, найденный ревью дважды (раунды 15 и 16): голый `exit` не
# вызывает ERR-trap, и наш deploy-lock оставался на сервере молча, блокируя
# следующий деплой. Тест исполняет РЕАЛЬНЫЙ scripts/deploy.sh с подставным ssh:
# ни одного сетевого вызова наружу не происходит, все команды пишутся в лог.
set -u
cd "$(dirname "$0")/../.." || exit 1

WORK="$(mktemp -d -t nx-lock-test-XXXXXX)"
trap 'rm -rf "$WORK"' EXIT
LOG="$WORK/ssh.log"
FAILED=0

# Подставной ssh: пишет команду в лог и отдаёт код 4 на сверке digest —
# это путь «артефакт доставлен, но не переименован», который завершается ЯВНЫМ
# `exit 1`. Важно брать именно его: аварийный путь через ERR-trap снимал lock и
# до починки, поэтому тест на нём был бы холостым (проверено мутацией).
mkdir -p "$WORK/bin"
cat > "$WORK/bin/ssh" <<'STUB'
#!/bin/bash
printf '%s\n' "$*" >> "$SSH_LOG"
# Тело удалённого шага приходит на stdin — читаем, чтобы писатель не упёрся.
if [ ! -t 0 ]; then cat > "$SSH_LOG.stdin" 2>/dev/null || true; fi
case "$*" in
  *sha256sum*) exit 4 ;;   # отказ переименования — явный exit в deploy.sh
esac
exit 0
STUB
chmod +x "$WORK/bin/ssh"

# rsync/git наружу не зовём: режим artifact работает через ssh, а git-ветка
# требует git-клона на сервере. Берём artifact — основной путь.
SHA="$(git rev-parse HEAD)"
SSH_LOG="$LOG" PATH="$WORK/bin:$PATH" \
SERVER=stub-host DEPLOY_MODE=artifact DEPLOY_SHA="$SHA" \
ALLOW_UNPUSHED=1 ALLOW_UNGATED=1 GATE_UNIT=тест \
NET_RETRIES=3 NET_BACKOFF=1 T_SHORT=5 T_UPLOAD=10 T_SYNC=10 T_BUILD=10 \
bash scripts/deploy.sh > "$WORK/out.txt" 2>&1
RC=$?

check() { if [ "$2" = "1" ]; then echo "OK   $1"; else echo "FAIL $1"; FAILED=1; fi; }

check "деплой завершился ненулевым кодом (получено $RC)" \
  "$([ "$RC" != "0" ] && echo 1 || echo 0)"
# Главное: уборка на выходе СРАБОТАЛА. Проверяем по явному сообщению скрипта,
# а не по наличию команды в логе: команда снятия встречается и на других путях,
# и такая проверка была бы холостой (поймано мутацией при написании теста).
check "cleanup_on_exit снял lock (в выводе есть «Снимаю deploy-lock на выходе»)" \
  "$(grep -q 'Снимаю deploy-lock на выходе' "$WORK/out.txt" && echo 1 || echo 0)"
check "команда снятия ушла на сервер (в логе есть .deploy.lock)" \
  "$(grep -q 'deploy.lock' "$LOG" && echo 1 || echo 0)"
check "снятие идёт по владельцу, а не безусловно (в команде есть owner)" \
  "$(grep 'deploy.lock' "$LOG" | grep -q 'owner' && echo 1 || echo 0)"
# И недоставленный кусок артефакта тоже убирается.
check "недоставленный .part убирался (в логе есть rm .part)" \
  "$(grep -q 'nx-release-.*\.tar\.part' "$LOG" && echo 1 || echo 0)"

# Отказ переименования (код 4) повторять нельзя: повтор ничего не чинит и
# прячет причину. При NET_RETRIES=3 сверка digest обязана быть ровно одна.
DIGEST_CALLS=$(grep -c 'sha256sum' "$LOG")
check "отказ mv не ретраился (вызовов сверки: $DIGEST_CALLS, ожидался 1)" \
  "$([ "$DIGEST_CALLS" = "1" ] && echo 1 || echo 0)"

# --- Тот же аварийный выход в git-ветке ---
# Ветка DEPLOY_MODE=git тоже берёт удалённый lock, и именно в ней флаг уборки
# однажды забыли поставить (находка раунда 16). Сценарий: удалённый шаг git
# отвечает отказом по существу.
LOG_GIT="$WORK/ssh-git.log"
cat > "$WORK/bin/ssh" <<'STUB'
#!/bin/bash
printf '%s\n' "$*" >> "$SSH_LOG"
if [ ! -t 0 ]; then cat > "$SSH_LOG.stdin" 2>/dev/null || true; fi
# Тело шага приходит на stdin; отказываем на шаге доставки кода.
grep -q 'git ' "$SSH_LOG.stdin" 2>/dev/null && exit 9
exit 0
STUB
chmod +x "$WORK/bin/ssh"

SSH_LOG="$LOG_GIT" PATH="$WORK/bin:$PATH" \
SERVER=stub-host DEPLOY_MODE=git DEPLOY_SHA="$SHA" \
ALLOW_UNPUSHED=1 ALLOW_UNGATED=1 GATE_UNIT=тест \
NET_RETRIES=1 NET_BACKOFF=1 T_SHORT=5 T_SYNC=10 T_BUILD=10 \
bash scripts/deploy.sh > "$WORK/out-git.txt" 2>&1
RC_GIT=$?

check "git-ветка завершилась ненулевым кодом (получено $RC_GIT)" \
  "$([ "$RC_GIT" != "0" ] && echo 1 || echo 0)"
# В этой ветке отказ приходит как ненулевой код команды, поэтому первым
# срабатывает ERR-trap; проверяем ФАКТ снятия по команде, ушедшей на сервер
# (захват lock идёт через stdin и такой строки в логе не оставляет).
check "git-ветка тоже сняла свой lock" \
  "$(grep 'deploy.lock' "$LOG_GIT" | grep -q 'rm -rf' && echo 1 || echo 0)"

if [ "$FAILED" != "0" ]; then
  echo "--- вывод deploy.sh ---"; sed -n '1,40p' "$WORK/out.txt"
  echo "--- команды ssh ---"; sed -n '1,40p' "$LOG"
fi
[ "$FAILED" = "0" ] && echo "ВСЕ ПРОВЕРКИ ПРОШЛИ" || echo "ЕСТЬ ПАДЕНИЯ"
exit "$FAILED"
