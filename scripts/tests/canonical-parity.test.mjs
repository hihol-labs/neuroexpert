/**
 * Канон digest квитанции обязан совпадать БАЙТ В БАЙТ с тем, что печатает
 * производитель квитанций (Python: sort_keys=True, ensure_ascii=False,
 * separators=(',', ':')). Сверяем на реальных байтах check-gate-receipt.mjs.
 *
 * Образцы подобраны по находкам ревью: ключи вне BMP и в приватной области
 * (UTF-16-сортировка расходится с сортировкой по кодовым точкам, раунд 8),
 * числа `1.0`, `1e-05`, `1e+20`, `1E5` (после JSON.parse форма терялась,
 * раунды 9 и 10 — теперь литералы сохраняются и вопрос снят).
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(REPO, 'scripts/check-gate-receipt.mjs');
const TMP = join(REPO, 'scripts/.canonical-parity.mjs');

writeFileSync(TMP, `${readFileSync(SRC, 'utf8').replace(/\nmain\(\);\s*$/, '\n')}
export { canonical, parsePreservingLiterals };
`);
const mod = await import(TMP);
unlinkSync(TMP);

// Тексты, а не объекты: проверяется именно сохранение исходной формы литерала.
const samples = [
  '{"b":1,"a":2}',
  '{"z":1,"\\u{10000}":"вне BMP"}'.replace('\\u{10000}', '\u{10000}'),
  '{"ключ":["а",{"вложенный":null,"число":1.5}],"a":true}',
  // Формы, которые печатает сам производитель: целочисленный float и обе
  // экспоненты. Именно они ломались, пока литералы не сохранялись.
  '{"float_integral":1.0,"exp_small":1e-05,"exp_big":1e+20}',
  '{"nested":{"arr":[[1,2],[]],"empty":{}},"minus":-0.0}',
  '{"escaped":"кавычка \\" и слэш \\\\ и \\n"}',
];

let failed = 0;
for (const text of samples) {
  const js = mod.canonical(mod.parsePreservingLiterals(text));
  const py = execFileSync('python3', ['-c', `
import json, sys
value = json.loads(sys.stdin.read())
sys.stdout.write(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')))
`], { input: text, encoding: 'utf8' });
  if (js === py) {
    console.log(`OK   канон совпал: ${py.slice(0, 70)}`);
  } else {
    console.log(`FAIL\n  вход: ${text}\n  js:   ${js}\n  py:   ${py}`);
    failed = 1;
  }
}

// Заявленная граница: литерал НЕ в форме производителя (`1E5` — Python
// напечатал бы `100000.0`) в квитанции появиться не может, потому что файл и
// есть вывод производителя. Если появится — канон не совпадёт с записанным
// digest, и квитанция будет отвергнута. Проверяем именно это направление.
{
  const text = '{"caps":1E5}';
  const js = mod.canonical(mod.parsePreservingLiterals(text));
  const py = execFileSync('python3', ['-c', `
import json, sys
sys.stdout.write(json.dumps(json.loads(sys.stdin.read()), ensure_ascii=False, sort_keys=True, separators=(',', ':')))
`], { input: text, encoding: 'utf8' });
  const differs = js !== py;
  console.log(differs
    ? `OK   не-производительская форма расходится и будет отвергнута: ${js} != ${py}`
    : `FAIL не-производительская форма прошла: ${js}`);
  if (!differs) failed = 1;
}

// Битый JSON не должен «подтверждаться» молча.
for (const broken of ['{"a":1', '{"a":01}', '{a:1}', '']) {
  let threw = false;
  try {
    mod.parsePreservingLiterals(broken);
  } catch {
    threw = true;
  }
  console.log(threw ? `OK   битый JSON отвергнут: ${broken || '<пусто>'}`
                    : `FAIL битый JSON принят: ${broken}`);
  if (!threw) failed = 1;
}

console.log(failed ? 'ЕСТЬ ПАДЕНИЯ' : 'ВСЕ ПРОВЕРКИ ПРОШЛИ');
process.exit(failed);
