#!/bin/bash
# Регрессии на находку раунда 1: одного совпадения дерева для допуска мало.
# Проверяем ровно новые условия — путь, целостность, юнит, свежесть.
cd "$(dirname "$0")/../.." || exit 1
SHA_OK="c6b5717"                                  # кандидат с PASSED-квитанцией
FULL="$(git rev-parse "$SHA_OK")"
R=".itd-memory/verification-loop/receipts/2dd93c4ec7c3be4f/G-010-funnel-cta-adjudication-a1.json"
TMP="$(mktemp -d)"
FAILED=0

expect() { # <ожидаемый код> <метка> <команда…>
  local want="$1" label="$2"; shift 2
  "$@" >/dev/null 2>&1; local got=$?
  if [ "$got" = "$want" ]; then echo "OK   $label (exit $got)"
  else echo "FAIL $label: ожидался exit $want, получен $got"; FAILED=1; fi
}

echo "=== база: одобренный кандидат проходит ==="
expect 0 "квитанция на своё дерево" node scripts/check-gate-receipt.mjs --sha "$FULL"

echo "=== 1) --receipt вне каталога квитанций ==="
cp "$R" "$TMP/outside.json"
expect 2 "абсолютный путь наружу" node scripts/check-gate-receipt.mjs --sha "$FULL" --receipt "$TMP/outside.json"

echo "=== 2) правка квитанции ломает digest ==="
FAKE_DIR=".itd-memory/verification-loop/receipts/.tamper-test"
mkdir -p "$FAKE_DIR"
python3 -c "
import json,sys
d=json.load(open('$R'))
d['outcome']='PASSED'
d['riskTier']='low'          # правка поля, digest не пересчитан
json.dump(d, open('$FAKE_DIR/tampered.json','w'), ensure_ascii=False)
"
expect 1 "изменённая квитанция" node scripts/check-gate-receipt.mjs --sha "$FULL" --receipt "$FAKE_DIR/tampered.json"

echo "=== 3) квитанция другого юнита ==="
expect 1 "unitId не совпал" node scripts/check-gate-receipt.mjs --sha "$FULL" --unit G-999
# Совпадение точное: префикс родительского юнита больше не допускается —
# под-юнит не должен авторизовать соседний (находка раунда 2).
expect 1 "префикс родительского юнита не проходит" node scripts/check-gate-receipt.mjs --sha "$FULL" --unit G-010
expect 0 "точный unitId проходит" node scripts/check-gate-receipt.mjs --sha "$FULL" --unit G-010:funnel-cta

echo "=== 4) просроченная квитанция ==="
expect 1 "старше предела" node scripts/check-gate-receipt.mjs --sha "$FULL" --max-age-days 0.001
expect 2 "нечисловой предел" node scripts/check-gate-receipt.mjs --sha "$FULL" --max-age-days вчера

echo "=== 4b) createdAt из будущего ==="
# Отрицательный возраст обходил предел свежести (находка раунда 6).
FUT_DIR=".itd-memory/verification-loop/receipts/.future-test"
mkdir -p "$FUT_DIR"
python3 -c "
import json, hashlib
d = json.load(open('$R'))
d['createdAt'] = '2099-01-01T00:00:00Z'
d.pop('receiptSha256', None)
canon = json.dumps(d, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()
d['receiptSha256'] = hashlib.sha256(canon).hexdigest()   # digest ПЕРЕСЧИТАН — ловим именно дату
json.dump(d, open('$FUT_DIR/future.json', 'w'), ensure_ascii=False)
"
expect 1 "дата из будущего" node scripts/check-gate-receipt.mjs --sha "$FULL" --receipt "$FUT_DIR/future.json"
rm -rf "$FUT_DIR"

echo "=== 5) сам каталог квитанций подменён симлинком ==="
# Граница обходилась бы целиком: realpath каталога вёл наружу, и «внутри»
# оказывался любой внешний JSON (находка раунда 3).
REAL_DIR=".itd-memory/verification-loop/receipts"
BAK=".itd-memory/verification-loop/receipts.bak-test"
cp "$R" "$TMP/outside2.json"
# Восстановление через trap: без него Ctrl+C посреди теста оставил бы гейт с
# симлинком вместо каталога квитанций и заблокировал деплой (находка раунда 14).
restore_receipts() {
  if [ -L "$REAL_DIR" ]; then rm -f "$REAL_DIR"; fi
  if [ -d "$BAK" ] && [ ! -e "$REAL_DIR" ]; then mv "$BAK" "$REAL_DIR"; fi
}
trap 'restore_receipts; rm -rf "$FAKE_DIR" "$TMP"' EXIT INT TERM
mv "$REAL_DIR" "$BAK"
ln -s "$TMP" "$REAL_DIR"
expect 2 "явный путь через подменённый каталог" node scripts/check-gate-receipt.mjs --sha "$FULL" --receipt "$REAL_DIR/outside2.json"
expect 1 "автопоиск через подменённый каталог" node scripts/check-gate-receipt.mjs --sha "$FULL"
restore_receipts

rm -rf "$FAKE_DIR" "$TMP"
[ "$FAILED" = "0" ] && echo "ВСЕ ПРОВЕРКИ ПРОШЛИ" || echo "ЕСТЬ ПАДЕНИЯ"
exit "$FAILED"
