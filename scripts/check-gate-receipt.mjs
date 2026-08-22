#!/usr/bin/env node
/**
 * Сверка деплоимого кандидата с квитанцией pre-deploy гейта.
 *
 * Зачем: 2026-08-16 коммит документации, сделанный в середине деплоя, незаметно
 * подменил кандидата — deploy.sh брал HEAD, а гейт одобрял другое дерево.
 *
 * Что проверяется (структурно, без доверия к именам файлов и порядку):
 *   среди adjudication-квитанций существует хотя бы одна с outcome === 'PASSED',
 *   у которой candidate.reviewedTree равен git-tree деплоимого коммита.
 *
 * Почему tree, а не SHA коммита: квитанция фиксирует ОТРЕВЬЮИРОВАННОЕ ДЕРЕВО
 * (candidate.reviewedTree), а не идентификатор коммита — кандидат на момент
 * ревью ещё мог быть незакоммиченным. Tree — тот же объект по содержимому:
 * commit^{tree} закоммиченного кандидата равен reviewedTree. Любой лишний
 * коммит (в т.ч. документации) меняет tree и обязан заново пройти гейт.
 *
 * Допуск (после находки независимого ревью, раунд 1 — одного совпадения дерева
 * мало) требует ВСЕГО перечисленного:
 *   1. файл лежит ВНУТРИ .itd-memory/verification-loop/receipts — произвольный
 *      путь через --receipt больше не принимается (иначе годился бы любой JSON
 *      из /tmp);
 *   2. receiptSha256 сходится с пересчитанным по канонической форме (sha256 от
 *      JSON с сортированными ключами без пробелов, поле исключено) — правка
 *      квитанции руками ломает digest;
 *   3. unitId совпадает с --unit, когда он передан;
 *   4. createdAt не старше --max-age-days (по умолчанию 30): просроченная
 *      квитанция описывает уже не тот процесс;
 *   5. candidate.reviewedTree равен git-tree деплоимого коммита.
 *
 * Заявленная граница: digest — это ЦЕЛОСТНОСТЬ, а не подпись. Тот, кто может
 * писать в каталог квитанций, может пересчитать digest под подделку; такую
 * подделку ловит сам pre-deploy гейт (у него есть producer/ключи), не этот
 * скрипт. Качество ревью здесь тоже не оценивается.
 *
 * Использование:
 *   node scripts/check-gate-receipt.mjs --sha <40-hex>
 *   node scripts/check-gate-receipt.mjs --sha <40-hex> --unit G-010b --receipt <path в receipts/>
 * Exit 0 — привязка найдена (путь квитанции печатается), 1 — нет, 2 — ошибка вызова.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RECEIPTS_DIR = '.itd-memory/verification-loop/receipts';

function parseArgs(argv) {
  const out = { sha: '', receipt: '', root: process.cwd(), unit: '', maxAgeDays: 30 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--sha') out.sha = argv[++i] ?? '';
    else if (arg === '--receipt') out.receipt = argv[++i] ?? '';
    else if (arg === '--root') out.root = argv[++i] ?? '';
    else if (arg === '--unit') out.unit = argv[++i] ?? '';
    else if (arg === '--max-age-days') {
      const raw = argv[++i] ?? '';
      const days = Number(raw);
      if (!Number.isFinite(days) || days <= 0) {
        console.error(`✗ --max-age-days должен быть положительным числом, получено: '${raw}'`);
        process.exit(2);
      }
      out.maxAgeDays = days;
    } else {
      console.error(`✗ неизвестный аргумент: ${arg}`);
      process.exit(2);
    }
  }
  return out;
}

/** Полный 40-hex — символические ref'ы (HEAD, main~2) не принимаются. */
function requireFullSha(sha) {
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    console.error(`✗ --sha должен быть полным 40-hex SHA, получено: '${sha}'`);
    process.exit(2);
  }
}

function treeOf(root, sha) {
  try {
    return execFileSync('git', ['-C', root, 'rev-parse', `${sha}^{tree}`], {
      encoding: 'utf8',
    }).trim();
  } catch {
    console.error(`✗ коммит ${sha} не найден в репозитории ${root}`);
    process.exit(2);
  }
}

/**
 * Каноническая форма для digest: та же, что у производителя квитанции —
 * ключи отсортированы рекурсивно, разделители без пробелов, не-ASCII как есть.
 */
/**
 * Сравнение по КОДОВЫМ ТОЧКАМ, а не по UTF-16-единицам. Производитель квитанций
 * (Python, `sort_keys=True`) сортирует по code point, и для ключей вне BMP
 * порядок расходится с обычным `Array.prototype.sort` — валидная квитанция
 * получила бы другой digest и заблокировала деплой (находка раунда 8).
 */
function compareCodePoints(a, b) {
  const left = Array.from(a);
  const right = Array.from(b);
  const shared = Math.min(left.length, right.length);
  for (let i = 0; i < shared; i += 1) {
    const diff = left[i].codePointAt(0) - right[i].codePointAt(0);
    if (diff !== 0) return diff;
  }
  return left.length - right.length;
}

/**
 * Разбор JSON С СОХРАНЕНИЕМ ИСХОДНЫХ ЛИТЕРАЛОВ чисел и строк.
 *
 * Зачем свой разбор вместо JSON.parse: канон обязан совпасть БАЙТ В БАЙТ с тем,
 * что напечатал производитель квитанции (Python). После JSON.parse это
 * недостижимо в принципе — `1` и `1.0` становятся одним значением, а
 * `1e-05` печатается как `0.00001` (находки раундов 9 и 10, две попытки
 * подогнать формат эвристиками провалились). Сохранённый литерал снимает
 * вопрос целиком: мы переставляем ключи, но не переписываем значения.
 *
 * Возвращает дерево, где число и строка — объекты {raw}, объект — Map.
 */
function parsePreservingLiterals(text) {
  let i = 0;

  const error = (why) => {
    throw new Error(`${why} на позиции ${i}`);
  };
  const skipWs = () => {
    while (i < text.length && (text[i] === ' ' || text[i] === '\n' || text[i] === '\r' || text[i] === '\t')) i += 1;
  };
  const readString = () => {
    const from = i;
    i += 1; // открывающая кавычка
    while (i < text.length) {
      if (text[i] === '\\') { i += 2; continue; }
      if (text[i] === '"') { i += 1; return { raw: text.slice(from, i) }; }
      i += 1;
    }
    error('незакрытая строка');
    return null;
  };
  const readNumber = () => {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
    if (!match) error('битое число');
    const raw = match[0];
    i += raw.length;
    return { raw };
  };
  const readValue = () => {
    skipWs();
    const ch = text[i];
    if (ch === '{') {
      i += 1;
      const entries = new Map();
      skipWs();
      if (text[i] === '}') { i += 1; return entries; }
      for (;;) {
        skipWs();
        if (text[i] !== '"') error('ожидался ключ');
        const key = readString().raw;
        skipWs();
        if (text[i] !== ':') error('ожидалось двоеточие');
        i += 1;
        entries.set(key, readValue());
        skipWs();
        if (text[i] === ',') { i += 1; continue; }
        if (text[i] === '}') { i += 1; return entries; }
        error('ожидались , или }');
      }
    }
    if (ch === '[') {
      i += 1;
      const items = [];
      skipWs();
      if (text[i] === ']') { i += 1; return items; }
      for (;;) {
        items.push(readValue());
        skipWs();
        if (text[i] === ',') { i += 1; continue; }
        if (text[i] === ']') { i += 1; return items; }
        error('ожидались , или ]');
      }
    }
    if (ch === '"') return readString();
    if (text.startsWith('true', i)) { i += 4; return { raw: 'true' }; }
    if (text.startsWith('false', i)) { i += 5; return { raw: 'false' }; }
    if (text.startsWith('null', i)) { i += 4; return { raw: 'null' }; }
    return readNumber();
  };

  const value = readValue();
  skipWs();
  if (i !== text.length) error('лишние данные после значения');
  return value;
}

/**
 * Каноническая форма: ключи отсортированы по кодовым точкам, разделители без
 * пробелов, значения — ИСХОДНЫЕ литералы. Это ровно то, что печатает
 * `json.dumps(..., ensure_ascii=False, sort_keys=True, separators=(',', ':'))`
 * над теми же данными.
 */
function canonical(node) {
  if (node instanceof Map) {
    const keys = [...node.keys()].sort(compareCodePoints);
    return `{${keys.map((k) => `${k}:${canonical(node.get(k))}`).join(',')}}`;
  }
  if (Array.isArray(node)) return `[${node.map(canonical).join(',')}]`;
  return node.raw;
}

/**
 * Целостность квитанции: digest пересчитывается по всем полям, кроме себя,
 * ПО ИСХОДНОМУ ТЕКСТУ файла (литералы сохраняются, переставляются только ключи).
 *
 * Заявленная граница: ключи сортируются по литералу, а производитель — по
 * декодированной строке. Для ключа с экранированием (`"a\\"b"`) порядок может
 * разойтись; в квитанциях ключи — простые ASCII-идентификаторы. Расхождение
 * даёт отказ, а не пропуск: деплой блокируется, квитанция перевыпускается.
 */
function receiptDigestValid(rawText) {
  let tree;
  try {
    tree = parsePreservingLiterals(rawText);
  } catch {
    return false; // не разобрали — не подтверждаем
  }
  if (!(tree instanceof Map)) return false;
  const expected = tree.get('"receiptSha256"');
  if (!expected || !/^"[0-9a-f]{64}"$/.test(expected.raw)) return false;
  const rest = new Map(tree);
  rest.delete('"receiptSha256"');
  const actual = createHash('sha256').update(canonical(rest), 'utf8').digest('hex');
  return `"${actual}"` === expected.raw;
}

/**
 * Путь квитанции обязан лежать внутри каталога квитанций репозитория.
 * Сравнение по realpath: симлинк наружу — тот же обход, что и абсолютный путь.
 */
function insideReceipts(root, file) {
  const base = resolve(root, RECEIPTS_DIR);
  let realBase;
  let realFile;
  try {
    realBase = realpathSync(base);
    realFile = realpathSync(file);
  } catch {
    return false;
  }
  // Сам каталог квитанций тоже обязан быть настоящим каталогом внутри репо:
  // если receipts подменён симлинком наружу, realBase станет внешним путём и
  // «внутри границы» окажется что угодно (находка раунда 3).
  if (realBase !== base) return false;
  return realFile === realBase || realFile.startsWith(`${realBase}/`);
}

/** Все *.json в подкаталогах receipts/. Нечитаемый файл — не фатально, но виден. */
function receiptFiles(root, explicit) {
  if (explicit) {
    const path = explicit.startsWith('/') ? explicit : join(root, explicit);
    if (!insideReceipts(root, path)) {
      console.error(`✗ --receipt указывает вне каталога квитанций: ${path}`);
      console.error(`  → допускаются только файлы внутри ${join(root, RECEIPTS_DIR)}`);
      process.exit(2);
    }
    return [path];
  }
  const base = join(root, RECEIPTS_DIR);
  let dirs;
  try {
    dirs = readdirSync(base);
  } catch {
    return [];
  }
  const files = [];
  for (const entry of dirs) {
    const dir = join(base, entry);
    let st;
    try {
      st = statSync(dir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.json')) continue;
      const file = join(dir, name);
      // Автопоиск тоже обязан упираться в каталог квитанций: подкаталог или
      // сам файл может быть симлинком наружу (находка раунда 2). Проверка
      // границы делается ПОФАЙЛОВО, а не один раз по корню.
      if (!insideReceipts(root, file)) continue;
      files.push(file);
    }
  }
  return files;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  requireFullSha(args.sha);
  const tree = treeOf(args.root, args.sha);

  const files = receiptFiles(args.root, args.receipt);
  if (files.length === 0) {
    console.error('✗ квитанций гейта не найдено');
    console.error(`  → искал в ${join(args.root, RECEIPTS_DIR)}`);
    console.error(`  → деплоимый кандидат: ${args.sha} (tree ${tree})`);
    process.exit(1);
  }

  const matches = [];
  const passedOther = [];
  const rejected = [];
  const now = Date.now();
  for (const file of files) {
    let raw;
    let data;
    try {
      raw = readFileSync(file, 'utf8');
      data = JSON.parse(raw);
    } catch {
      continue; // не-квитанция или битый файл — не основание для допуска
    }
    if (data?.kind !== 'adjudication') continue;
    if (data?.outcome !== 'PASSED') continue;

    const reviewed = data?.candidate?.reviewedTree;
    if (reviewed !== tree) {
      if (reviewed) passedOther.push({ file, reviewed });
      continue;
    }

    // Дальше — квитанция НА ЭТО дерево. Молча принимать её нельзя: причину
    // отказа печатаем, иначе отвергнутая квитанция выглядит как «не найдено».
    if (!receiptDigestValid(raw)) {
      rejected.push({ file, why: 'receiptSha256 не сходится — квитанция изменена после выпуска' });
      continue;
    }
    const unitId = String(data?.unitId ?? '');
    // Совпадение точное: под-юнит `G-010:funnel-cta` — это ДРУГОЙ отревьюированный
    // предмет, и префиксный допуск позволил бы одному под-юниту авторизовать
    // соседний (находка раунда 2). Кто передаёт --unit, передаёт полный id.
    if (args.unit && unitId !== args.unit) {
      rejected.push({ file, why: `квитанция юнита '${unitId}', ожидался '${args.unit}'` });
      continue;
    }
    const createdAt = Date.parse(String(data?.createdAt ?? ''));
    if (!Number.isFinite(createdAt)) {
      rejected.push({ file, why: 'нет разбираемого createdAt — свежесть не подтверждается' });
      continue;
    }
    const ageDays = (now - createdAt) / 86_400_000;
    // Дата из будущего давала отрицательный возраст и обходила предел свежести
    // на десятилетия (находка раунда 6). Сутки допуска — на расхождение часов.
    if (ageDays < -1) {
      rejected.push({ file, why: `createdAt в будущем (${data.createdAt}) — часы разошлись или квитанция подделана` });
      continue;
    }
    if (ageDays > args.maxAgeDays) {
      rejected.push({ file, why: `квитанции ${ageDays.toFixed(1)} дн., предел ${args.maxAgeDays}` });
      continue;
    }
    matches.push({ file, data });
  }

  if (matches.length === 0) {
    console.error('✗ нет PASSED-квитанции гейта на это дерево.');
    console.error(`  → деплоимый кандидат: ${args.sha}`);
    console.error(`  → его tree:           ${tree}`);
    if (passedOther.length > 0) {
      console.error('  → PASSED-квитанции есть, но на ДРУГИЕ деревья:');
      for (const item of passedOther.slice(0, 5)) {
        console.error(`     ${item.reviewed}  ${item.file}`);
      }
      if (passedOther.length > 5) {
        console.error(`     … и ещё ${passedOther.length - 5}`);
      }
    }
    if (rejected.length > 0) {
      console.error('  → Квитанции НА ЭТО дерево есть, но допуск не прошли:');
      for (const item of rejected) console.error(`     ${item.why}  ${item.file}`);
    }
    console.error('  → Это ровно тот случай, когда лишний коммит подменил кандидата.');
    console.error('  → Деплой ровно одобренный SHA либо прогони гейт заново.');
    process.exit(1);
  }

  const best = matches[0];
  console.log(`  → Кандидат привязан к квитанции гейта ✓`);
  console.log(`     unit:    ${best.data.unitId ?? '<не указан>'}`);
  console.log(`     tree:    ${tree}`);
  console.log(`     receipt: ${best.file}`);
  process.exit(0);
}

main();
