#!/bin/bash
# Поведенческая проверка транспортных обёрток deploy.sh.
#
# Берём РЕАЛЬНЫЕ строки функций из scripts/deploy.sh (не копию) и гоняем их
# против чёрной дыры 198.51.100.1 (TEST-NET-2, пакеты не доходят) — это модель
# «канал умер молча», ровно того случая, что стоил 12 часов.
#
# Набор УТВЕРЖДАЕТ, а не печатает (находка ревью, раунд 11): обёртка обязана
# вернуть ненулевой код, уложиться в потолок времени и сделать заявленное число
# попыток. Раньше тест заканчивался echo и остался бы зелёным, даже если бы
# обёртка вернула 0 при обрыве.
set -u
cd "$(dirname "$0")/../.." || exit 1

WORK="$(mktemp -d -t nx-transport-test-XXXXXX)"
trap 'rm -rf "$WORK"' EXIT
HARNESS="$WORK/harness.sh"
OUT="$WORK/out.txt"
FAILED=0

# Заголовок до определения RUN_ID: конфиг + обёртки, ровно как в файле.
END=$(grep -n '^RUN_ID=' scripts/deploy.sh | head -1 | cut -d: -f1)
if [ -z "$END" ]; then
  echo "FAIL не нашёл RUN_ID в scripts/deploy.sh — структура файла изменилась"
  exit 1
fi
sed -n "1,$((END-1))p" scripts/deploy.sh > "$HARNESS"
echo "  (взято строк из deploy.sh: $((END-1)))"

cat >> "$HARNESS" <<'EOF'
rc=0
ssh_cmd "$T_SHORT" "проба связи" "echo hi" || rc=$?
echo "SSH_CMD_RC=$rc"

printf 'echo remote\n' > "$WORK/step.sh"
rc=0
ssh_script "$T_SHORT" "удалённый шаг" "$WORK/step.sh" arg1 || rc=$?
echo "SSH_SCRIPT_RC=$rc"
EOF

T0=$(date +%s)
SERVER=198.51.100.1 WORK="$WORK" \
NET_RETRIES=2 NET_BACKOFF=1 T_SHORT=8 \
DEPLOY_SHA=$(git rev-parse HEAD) \
bash "$HARNESS" > "$OUT" 2>&1
T1=$(date +%s)
ELAPSED=$((T1-T0))

check() { # <метка> <условие-истина?>
  if [ "$2" = "1" ]; then echo "OK   $1"; else echo "FAIL $1"; FAILED=1; fi
}

CMD_RC=$(grep -o 'SSH_CMD_RC=[0-9]*' "$OUT" | tail -1 | cut -d= -f2)
SCRIPT_RC=$(grep -o 'SSH_SCRIPT_RC=[0-9]*' "$OUT" | tail -1 | cut -d= -f2)
RETRIES=$(grep -c 'транспортный сбой' "$OUT")
GAVE_UP=$(grep -c 'связь не восстановилась' "$OUT")

# Обрыв обязан быть ВИДЕН как ошибка: код 0 здесь означал бы, что деплой
# поедет дальше на несуществующем соединении.
check "ssh_cmd вернул ненулевой код (получено '${CMD_RC:-нет}')" \
  "$([ -n "$CMD_RC" ] && [ "$CMD_RC" != "0" ] && echo 1 || echo 0)"
check "ssh_script вернул ненулевой код (получено '${SCRIPT_RC:-нет}')" \
  "$([ -n "$SCRIPT_RC" ] && [ "$SCRIPT_RC" != "0" ] && echo 1 || echo 0)"
# Код обязан быть транспортным (124 таймаут / 255 обрыв ssh), иначе ретраи
# не сработают и диагностика соврёт про причину.
check "код ssh_cmd транспортный (124 или 255)" \
  "$([ "$CMD_RC" = "124" ] || [ "$CMD_RC" = "255" ] && echo 1 || echo 0)"
# По одному сообщению о повторе на каждую обёртку при NET_RETRIES=2.
check "ретраи выполнены (сообщений о повторе: $RETRIES, ожидалось 2)" \
  "$([ "$RETRIES" = "2" ] && echo 1 || echo 0)"
check "обе обёртки сдались громко (сообщений: $GAVE_UP, ожидалось 2)" \
  "$([ "$GAVE_UP" = "2" ] && echo 1 || echo 0)"
# Потолок: 2 попытки × 8 с таймаута + 1 с паузы, с запасом на медленный DNS.
check "уложились в потолок времени (${ELAPSED}с < 60с)" \
  "$([ "$ELAPSED" -lt 60 ] && echo 1 || echo 0)"

[ "$FAILED" = "0" ] && echo "ВСЕ ПРОВЕРКИ ПРОШЛИ" || { echo "ЕСТЬ ПАДЕНИЯ"; sed -n '1,40p' "$OUT"; }
exit "$FAILED"
