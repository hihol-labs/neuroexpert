#!/bin/bash
# Прогон всех локальных проверок релизной оснастки: оракул воронки, допуск
# квитанции гейта, канон digest, транспорт деплоя.
# Запуск: bash scripts/tests/run-all.sh
cd "$(dirname "$0")/../.." || exit 1
FAILED=0

run() { # <метка> <команда…>
  echo "=== $1 ==="
  shift
  if "$@"; then echo "--- зелено"; else echo "--- КРАСНО"; FAILED=1; fi
  echo
}

run "оракул оффера (синтетический HTML)" node scripts/tests/offer-parser.test.mjs
run "канон digest квитанции (паритет с python3)" node scripts/tests/canonical-parity.test.mjs
run "допуск квитанции гейта" bash scripts/tests/gate-receipt.test.sh
run "транспорт деплоя (таймауты и ретраи)" bash scripts/tests/transport.test.sh
run "уборка удалённого состояния на аварийном выходе" bash scripts/tests/lock-cleanup.test.sh
run "сериализация мутирующих шагов на сервере" bash scripts/tests/step-serialization.test.sh

[ "$FAILED" = "0" ] && echo "ВСЕ НАБОРЫ ЗЕЛЁНЫЕ" || echo "ЕСТЬ КРАСНЫЕ НАБОРЫ"
exit "$FAILED"
