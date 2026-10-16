/**
 * Локальная проверка оракула G-011 на синтетическом HTML (сеть не нужна).
 *
 * Тестируются РЕАЛЬНЫЕ байты scripts/verify-payment-path.mjs: файл читается,
 * хвостовой запуск main() срезается, дописывается экспорт — и модуль кладётся
 * рядом с оригиналом (repoRoot и импорт ./lib/… резолвятся от пути файла).
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(REPO, 'scripts/verify-payment-path.mjs');
const TMP = join(REPO, 'scripts/.payment-path-test.mjs');

const src = readFileSync(SRC, 'utf8')
  .replace(/try \{\s*await main\(\);[\s\S]*$/, '')
  + '\nexport { checkPaymentBlock, checkDemoFigures, checkRepoArtifacts, payLinksInBody, failures };\n';
writeFileSync(TMP, src);

const mod = await import(TMP);
unlinkSync(TMP);

let failed = 0;

/** Прогоняет проверку на изолированном наборе находок. */
function run(label, fn, expected) {
  mod.failures.length = 0;
  fn();
  const got = mod.failures.length;
  const ok = expected === 'any' ? got > 0 : got === expected;
  if (ok) {
    const first = mod.failures[0] ? ` — ${mod.failures[0].slice(0, 90)}` : '';
    console.log(`OK   ${label} — находок ${got}${first}`);
  } else {
    failed = 1;
    console.log(`FAIL ${label} — ожидалось ${expected}, получено ${got}`);
    for (const line of mod.failures) console.log(`       ${line}`);
  }
}

// Реквизиты синтетические: тест не должен зависеть от настоящего ИНН и не
// должен печатать его в выводе прогона.
const REQUISITES = '<dd data-payment-requisites>Тестовый Исполнитель, ИНН 123456789012</dd>';
const DOCS = '<div data-payment-docs><a href="/terms">Оферта</a> <a href="/requisites">Реквизиты</a></div>';

const block = (inner, status = 'absent') =>
  `<main><section data-payment data-payment-link-status="${status}">${inner}</section></main>`;

const FULL = block(`
  <dl>
    <dt>Услуга</dt><dd data-payment-subject>Аудит видимости в AI-поиске</dd>
    <dt>Стоимость</dt><dd data-payment-amount>29 000 ₽</dd>
    <dt>Способ</dt><dd data-payment-method>Перевод по счёту или по ссылке СБП</dd>
    ${REQUISITES}
  </dl>
  ${DOCS}
  <a data-payment-cta href="/audit">Запросить счёт</a>
`);

run('полный блок оплаты', () => mod.checkPaymentBlock('/pay', FULL), 0);

run('блока оплаты нет', () => mod.checkPaymentBlock('/pay', '<main><p>Платите как-нибудь</p></main>'), 1);

run('два блока оплаты', () => mod.checkPaymentBlock('/pay', FULL + FULL), 1);

run(
  'блок оплаты в комментарии не считается',
  () => mod.checkPaymentBlock('/pay', `<main><!-- ${FULL} --></main>`),
  1,
);

run(
  'блок оплаты внутри <script> не считается',
  () => mod.checkPaymentBlock('/pay', `<main><script>const t = \`${FULL}\`;</script></main>`),
  1,
);

run(
  'нет суммы',
  () => mod.checkPaymentBlock('/pay', FULL.replace(/<dd data-payment-amount>[^<]*<\/dd>/, '')),
  1,
);

run(
  'сумма без цифр и без «по счёту»',
  () => mod.checkPaymentBlock('/pay', FULL.replace('29 000 ₽', 'договоримся')),
  1,
);

run(
  '«по счёту» вместо цифр допустимо',
  () => mod.checkPaymentBlock('/pay', FULL.replace('29 000 ₽', 'По счёту')),
  0,
);

run(
  'нет ИНН в реквизитах',
  () => mod.checkPaymentBlock('/pay', FULL.replace('ИНН 123456789012', 'реквизиты уточним')),
  1,
);

run(
  'нет ссылки на оферту',
  () => mod.checkPaymentBlock('/pay', FULL.replace('<a href="/terms">Оферта</a>', '')),
  1,
);

run(
  'нет ссылки на реквизиты',
  () => mod.checkPaymentBlock('/pay', FULL.replace('<a href="/requisites">Реквизиты</a>', '')),
  1,
);

run(
  'CTA-заглушка href="#"',
  () => mod.checkPaymentBlock('/pay', FULL.replace('href="/audit"', 'href="#"')),
  1,
);

run(
  'CTA в тупик авторизации',
  () => mod.checkPaymentBlock('/pay', FULL.replace('href="/audit"', 'href="/register"')),
  1,
);

run(
  'CTA не ссылкой',
  () => mod.checkPaymentBlock('/pay', FULL.replace(/<a data-payment-cta([^>]*)>([^<]*)<\/a>/, '<div data-payment-cta>$2</div>')),
  1,
);

run(
  'два CTA',
  () => mod.checkPaymentBlock('/pay', FULL.replace('<a data-payment-cta href="/audit">Запросить счёт</a>', '<a data-payment-cta href="/audit">Счёт</a><a data-payment-cta href="/scan">Замер</a>')),
  1,
);

run(
  'CTA без подписи',
  () => mod.checkPaymentBlock('/pay', FULL.replace('>Запросить счёт<', '><')),
  1,
);

run(
  'блок оплаты не закрыт',
  () => mod.checkPaymentBlock('/pay', '<main><section data-payment><dd data-payment-amount>29 000 ₽</dd></main>'),
  1,
);

// --- состояние платёжной ссылки ---------------------------------------------

run(
  'нет data-payment-link-status',
  () => mod.checkPaymentBlock('/pay', FULL.replace(' data-payment-link-status="absent"', '')),
  1,
);

run(
  'мусор в data-payment-link-status',
  () => mod.checkPaymentBlock('/pay', FULL.replace('"absent"', '"maybe"')),
  1,
);

run(
  'link-status=live с внешней https-ссылкой',
  () => mod.checkPaymentBlock('/pay', FULL.replace('"absent"', '"live"').replace('href="/audit"', 'href="https://pay.example.org/x1"')),
  0,
);

run(
  'link-status=live, но CTA ведёт внутрь сайта',
  () => mod.checkPaymentBlock('/pay', FULL.replace('"absent"', '"live"')),
  1,
);

run(
  'link-status=absent, но CTA ведёт наружу',
  () => mod.checkPaymentBlock('/pay', FULL.replace('href="/audit"', 'href="https://pay.example.org/x1"')),
  1,
);

// --- шаг воронки не подменяется общим футером --------------------------------

const CHROME_ONLY = '<header><a href="/pay">Оплата</a></header><main><p>Цены</p></main>'
  + '<footer><a href="/pay">Оплата</a></footer>';
const IN_BODY = '<main><p>Цены</p><a href="/pay">Как оплатить</a></main>'
  + '<footer><a href="/pay">Оплата</a></footer>';

run('ссылка на /pay только в шапке и подвале — не шаг воронки', () => {
  const found = mod.payLinksInBody(CHROME_ONLY);
  if (found.links !== 0) throw new Error(`ожидалось 0 ссылок в теле, найдено ${found.links}`);
  if (!found.chromeFound) throw new Error('шапка и подвал не распознаны');
}, 0);

run('ссылка на /pay в теле страницы засчитывается', () => {
  const found = mod.payLinksInBody(IN_BODY);
  if (found.links !== 1) throw new Error(`ожидалась 1 ссылка в теле, найдено ${found.links}`);
}, 0);

run('нет footer — вырождение проверки объявляется, а не молчит', () => {
  const found = mod.payLinksInBody('<main><a href="/pay">Оплата</a></main>');
  if (found.chromeFound) throw new Error('несуществующий chrome распознан как найденный');
}, 0);

run('контентный <header> внутри main не считается подвалом', () => {
  const found = mod.payLinksInBody('<main><section><header>Заголовок секции</header><a href="/pay">Оплата</a></section></main>');
  if (found.chromeFound) throw new Error('контентный header принят за chrome');
}, 0);

run(
  'link-status=live с адресом самой страницы оплаты',
  () => mod.checkPaymentBlock('/pay', FULL.replace('"absent"', '"live"').replace('href="/audit"', 'href="https://neuroexpertise.ru/pay"')),
  1,
);

run('ссылка на /pay в комментарии не засчитывается', () => {
  const found = mod.payLinksInBody('<header>x</header><main><!-- <a href="/pay">Оплата</a> --></main>');
  if (found.links !== 0) throw new Error(`ожидалось 0 ссылок, найдено ${found.links}`);
}, 0);

// --- демо-цифры --------------------------------------------------------------

const DEMO_OK = `<section data-demo-figures>
  <p>+38% обращений</p>
  <p data-demo-disclaimer>Пример разбора: цифры условные, показывают формат отчёта.</p>
</section>`;

run('демо-блок с дисклеймером', () => {
  const found = mod.checkDemoFigures('/for-business', DEMO_OK);
  if (found !== 1) throw new Error(`ожидался 1 блок, найдено ${found}`);
}, 0);

run(
  'демо-блок без дисклеймера',
  () => mod.checkDemoFigures('/for-business', DEMO_OK.replace(/<p data-demo-disclaimer>[\s\S]*?<\/p>/, '')),
  1,
);

run(
  'слишком короткая пометка демо-цифр',
  () => mod.checkDemoFigures('/for-business', DEMO_OK.replace(/(<p data-demo-disclaimer>)[\s\S]*?(<\/p>)/, '$1Пример$2')),
  1,
);

run('страница без демо-блоков — не находка', () => {
  const found = mod.checkDemoFigures('/pricing', '<main><p>Цены</p></main>');
  if (found !== 0) throw new Error(`ожидалось 0 блоков, найдено ${found}`);
}, 0);

// --- документы в репозитории -------------------------------------------------

run('документы и страница оплаты на месте', () => mod.checkRepoArtifacts(), 0);

console.log(failed ? '\nЕСТЬ КРАСНЫЕ ПРОВЕРКИ' : '\nВСЕ ПРОВЕРКИ ПРОШЛИ');
process.exit(failed);
