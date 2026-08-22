/**
 * Локальная проверка checkOfferBlock на синтетическом HTML.
 *
 * Тестируются РЕАЛЬНЫЕ байты scripts/verify-funnel.mjs: файл читается,
 * хвостовой `await main();` убирается, дописывается экспорт — и модуль
 * кладётся рядом с оригиналом (repoRoot резолвится от пути файла).
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(REPO, 'scripts/verify-funnel.mjs');
const TMP = join(REPO, 'scripts/.offer-parser-test.mjs');

const src = readFileSync(SRC, 'utf8')
  .replace(/await main\(\);\s*$/, '')
  + '\nexport { checkOfferBlock, findElementsWithAttribute, failures };\n';
writeFileSync(TMP, src);

const mod = await import(TMP);
unlinkSync(TMP);

const good = `
<main>
  <section data-offer>
    <p data-offer-artifact>Страница результата по постоянной ссылке</p>
    <div><span data-offer-price>Бесплатно</span></div>
    <div><div><span data-offer-term>Сразу</span></div></div>
    <a data-offer-cta href="/scan">Запустить замер</a>
  </section>
</main>`;

const cases = [
  ['блок оффера полный', good, 0],
  ['нет блока', '<main><p>ничего</p></main>', 1],
  ['два блока', good + good, 1],
  ['нет артефакта', good.replace(/<p data-offer-artifact>[^<]*<\/p>/, ''), 1],
  ['артефакт прочерком', good.replace(/(<p data-offer-artifact>)[^<]*/, '$1—'), 1],
  ['цена словами без суммы', good.replace('Бесплатно', 'договорная'), 1],
  ['цена суммой', good.replace('Бесплатно', '7 900 ₽'), 0],
  ['нет срока', good.replace(/<span data-offer-term>[^<]*<\/span>/, ''), 1],
  ['срок прочерком допустим', good.replace('Сразу', '—'), 0],
  // Раунд 18: сущность ПОСЛЕ начального «/» — браузер раскрывает её, выбрасывает
  // перевод строки и уходит на чужой хост; для регулярки это «внутренний путь».
  ['CTA /&NewLine;/чужой-хост отвергается',
    good.replace('href="/scan"', 'href="/&NewLine;/evil.example"'), 1],
  ['CTA с &Tab; в пути отвергается',
    good.replace('href="/scan"', 'href="/&Tab;/evil.example"'), 1],
  ['амперсанд в запросе остаётся допустимым',
    good.replace('href="/scan"', 'href="/scan?a=1&amp;b=2"'), 0],
  ['голый амперсанд в запросе допустим',
    good.replace('href="/scan"', 'href="/scan?a=1&b=2"'), 0],
  // Раунд 17: адрес, который не разбирается как URL, браузер не откроет.
  ['CTA https://% отвергается', good.replace('href="/scan"', 'href="https://%"'), 1],
  ['CTA https://[ отвергается', good.replace('href="/scan"', 'href="https://["'), 1],
  // Раунд 17: оффер вне landmark <main> скринридер пропускает (дефект /pricing).
  ['оффер вне main отвергается', good.replace('<main>', '') .replace('</main>', '') + '<main><p>x</p></main>', 1],
  ['страница без main отвергается', good.replace('<main>', '<div>').replace('</main>', '</div>'), 1],
  // Раунд 14: адрес без хоста — синтаксически ссылка, фактически никуда.
  ['CTA https:/// отвергается', good.replace('href="/scan"', 'href="https:///"'), 1],
  ['CTA https://?x отвергается', good.replace('href="/scan"', 'href="https://?x"'), 1],
  ['CTA https://#frag отвергается', good.replace('href="/scan"', 'href="https://#frag"'), 1],
  // Раунд 13: iframe/noembed/noframes — чужой документ, не эта страница.
  ['оффер в iframe не считается', `<main><iframe>${good}</iframe></main>`, 1],
  ['оффер в noembed не считается', `<main><noembed>${good}</noembed></main>`, 1],
  ['оффер в noframes не считается', `<main><noframes>${good}</noframes></main>`, 1],
  // Раунд 13: символ вне BMP до инертной зоны сдвигал гашение и портил разметку.
  ['эмодзи перед комментарием не ломает разбор',
    `<main><p>🚀🚀🚀</p><!-- x -->${good}</main>`, 0],
  ['эмодзи перед script не ломает разбор',
    `<main><p>𝕏𝕏</p><script>var a=1;</script>${good}</main>`, 0],
  ['эмодзи внутри оффера не ломает поля',
    good.replace('Карта спроса', 'Карта спроса 🚀'), 0],
  // Раунд 12: допуск href списком РАЗРЕШЁННОГО. Именованные сущности (&NewLine;,
  // &colon;) и любые будущие трюки отсекаются самим списком, а не перечнем зол.
  ['CTA с &NewLine; в схеме отвергается',
    good.replace('href="/scan"', 'href="java&NewLine;script:alert(1)"'), 1],
  ['CTA с &colon; отвергается',
    good.replace('href="/scan"', 'href="javascript&colon;alert(1)"'), 1],
  ['CTA с data: отвергается',
    good.replace('href="/scan"', 'href="data:text/html,<h1>x</h1>"'), 1],
  ['CTA на протокол-относительный //host отвергается',
    good.replace('href="/scan"', 'href="//evil.example/scan"'), 1],
  ['CTA телефоном допустим', good.replace('href="/scan"', 'href="tel:+79991234567"'), 0],
  ['CTA почтой допустим', good.replace('href="/scan"', 'href="mailto:hi@example.com"'), 0],
  ['CTA внешним https допустим', good.replace('href="/scan"', 'href="https://t.me/x"'), 0],
  // Ссылка на текущий маршрут = перезагрузка страницы (дефект /scan, раунд 7).
  ['CTA на текущий маршрут отвергается', good.replace('href="/scan"', 'href="/тест"'), 1],
  ['CTA якорем на текущем маршруте допустим',
    good.replace('href="/scan"', 'href="#scan-probe"'), 0],
  // Раунд 11: точка с запятой у числовой ссылки необязательна для браузера.
  ['CTA с &#x0A без ; — заглушка',
    good.replace('href="/scan"', 'href="java&#x0Ascript:alert(1)"'), 1],
  ['CTA с &#10 без ; — заглушка',
    good.replace('href="/scan"', 'href="java&#10script:alert(1)"'), 1],
  // Раунд 10: браузер раскрывает числовые ссылки в href и нормализует URL,
  // поэтому `java&#x0A;script:` для него — обычный javascript: (заглушка).
  ['CTA с &#x0A; внутри схемы — заглушка',
    good.replace('href="/scan"', 'href="java&#x0A;script:alert(1)"'), 1],
  ['CTA с &#10; внутри схемы — заглушка',
    good.replace('href="/scan"', 'href="java&#10;script:alert(1)"'), 1],
  ['экранированный &amp;#10; остаётся текстом и путь не ломает',
    good.replace('href="/scan"', 'href="/scan?a=1&amp;b=2"'), 0],
  // Раунд 7, обе воспроизведены: строка `</template>` в JS больше не закрывает
  // внешний template (был ложный зелёный), а комментарий с `<script>` перед
  // оффером больше не глушит хвост документа (был ложный красный).
  ['строка </template> в script не открывает оффер',
    `<main><template><script>const x = "</template>";</script>${good}</template></main>`, 1],
  ['комментарий с <script> перед оффером не глушит его',
    `<main><!-- <script> -->${good}</main>`, 0],
  ['комментарий с <template> перед оффером не глушит его',
    `<main><!-- <template> -->${good}</main>`, 0],
  // Раунд 6: <xmp> — тоже raw-text, а комментарий ВНУТРИ <script> не должен
  // съедать настоящий закрывающий тег (это давало ложный красный).
  ['оффер в <xmp> не считается', `<main><xmp>${good}</xmp></main>`, 1],
  ['комментарий внутри script не глушит оффер ниже',
    `<main><script><!-- </script> --></script>${good}</main>`, 0],
  ['комментарий с разметкой оффера внутри script',
    `<main><script><!-- ${good} --></script>${good}</main>`, 0],
  // Раунд 5: <plaintext> обрывает разметку, а управляющие символы внутри схемы
  // браузер выбрасывает — `java\nscript:` для него тот же javascript:.
  ['оффер после <plaintext> не считается', `<main><plaintext>${good}</main>`, 1],
  ['CTA с переносом внутри схемы — заглушка',
    good.replace('href="/scan"', 'href="java\nscript:alert(1)"'), 1],
  ['CTA с табуляцией внутри схемы — заглушка',
    good.replace('href="/scan"', 'href="java\tscript:alert(1)"'), 1],
  // Раунд 4, воспроизведено: строка «<script>» в значении чужого атрибута
  // считалась настоящим тегом и глушила хвост документа — ложный КРАСНЫЙ на
  // здоровой странице. Плюс about:blank с хвостом обходил проверку CTA.
  ['тег в значении атрибута не открывает инертную зону',
    `<main><div title="<script>"></div>${good}</main>`, 0],
  ['тег в одинарных кавычках тоже не считается',
    `<main><div data-x='<template>'></div>${good}</main>`, 0],
  // Раунд 9: слэш в `<template/>`/`<script/>` браузер игнорирует (самозакрытие
  // есть только в SVG/MathML), значит содержимое ИНЕРТНО. Прошлый тест
  // закреплял неверное поведение — исправлен вместе с кодом.
  ['самозакрывающийся template глушит хвост, как в браузере',
    `<main><template/>${good}</main>`, 1],
  ['самозакрывающийся script глушит хвост',
    `<main><script/>${good}</main>`, 1],
  ['самозакрывающийся обычный тег ничего не глушит',
    `<main><br/>${good}</main>`, 0],
  ['CTA about:blank с хвостом — заглушка',
    good.replace('href="/scan"', 'href="about:blank?x"'), 1],
  ['имя тега с суффиксом не инертно',
    `<main><templatex></templatex>${good}</main>`, 0],
  // Раунд 3, воспроизведено: ленивая регулярка соединяла ВНЕШНИЙ открывающий
  // тег с ВНУТРЕННИМ закрывающим, а textarea/title вовсе не были инертными.
  ['вложенный template ДО оффера', `<main><template><template></template>${good}</template></main>`, 1],
  ['вложенный template ПОСЛЕ оффера', `<main><template>${good}<template></template></template></main>`, 1],
  ['оффер в textarea не считается', `<main><textarea>${good}</textarea></main>`, 1],
  ['оффер в title не считается', `<main><title>${good}</title></main>`, 1],
  ['незакрытый template глушит хвост', `<main><template>${good}</main>`, 1],
  // Раунд 2: вложенный inert-участок и CTA-заглушка.
  ['оффер во вложенном template не считается',
    `<main><template><template>${good}</template></template></main>`, 1],
  ['оффер в CDATA не считается', `<main><![CDATA[${good}]]></main>`, 1],
  ['CTA href="#" — заглушка', good.replace('href="/scan"', 'href="#"'), 1],
  ['CTA javascript: — заглушка', good.replace('href="/scan"', 'href="javascript:void(0)"'), 1],
  ['CTA якорем с целью допустим', good.replace('href="/scan"', 'href="#funnel-contact"'), 0],
  // Раунд 1 независимого ревью: закомментированный оффер и некликабельный CTA
  // давали зелёный — пользователь при этом не видел ни блока, ни кнопки.
  ['оффер внутри комментария не считается', `<main><!-- ${good} --></main>`, 1],
  ['оффер внутри <script> не считается', `<main><script>${good}</script></main>`, 1],
  ['CTA не-ссылкой отвергается',
    good.replace('<a data-offer-cta href="/scan">', '<div data-offer-cta href="/scan">')
        .replace('</a>', '</div>'), 1],
  // React рендерит голый JSX-атрибут как ="true". Если парсер примет это за
  // значение поля, «артефакт» и «срок» пройдут ложным зелёным (поймано на
  // локальном прогоне 2026-08-16): атрибут-маркер не должен подменять текст.
  ['маркер ="true" не подменяет текст артефакта',
    good.replace('<p data-offer-artifact>', '<p data-offer-artifact="true">'), 0],
  ['маркер ="true" не подменяет цену',
    good.replace('<span data-offer-price>', '<span data-offer-price="true">'), 0],
  ['маркер ="true" не спасает пустой артефакт',
    good.replace(/<p data-offer-artifact>[^<]*<\/p>/, '<p data-offer-artifact="true"></p>'), 1],
  ['два CTA', good.replace('</section>', '<a data-offer-cta href="/audit">И ещё</a></section>'), 1],
  ['CTA без href', good.replace('href="/scan"', ''), 1],
  ['CTA в тупик авторизации', good.replace('href="/scan"', 'href="/register"'), 1],
  ['CTA без подписи', good.replace('>Запустить замер</a>', '></a>'), 1],
  ['блок не закрыт', good.replace('</section>', ''), 1],
];

let bad = 0;
for (const [name, html, expected] of cases) {
  mod.failures.length = 0;
  mod.checkOfferBlock('/тест', html);
  const got = mod.failures.length;
  const ok = expected === 0 ? got === 0 : got > 0;
  if (!ok) bad += 1;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — находок ${got}${got ? ': ' + mod.failures[0].slice(0, 70) : ''}`);
}

// Вложенность того же тега: ленивая регулярка закрыла бы блок на первом </div>.
mod.failures.length = 0;
const nested = '<main><div data-offer><div><div><span data-offer-artifact>Карта спроса с приоритетами</span></div></div>'
  + '<span data-offer-price>7 900 ₽</span><span data-offer-term>3–7 дней</span>'
  + '<a data-offer-cta href="/audit">Заказать</a></div></main>';
mod.checkOfferBlock('/вложенность', nested);
const nestedOk = mod.failures.length === 0;
if (!nestedOk) bad += 1;
console.log(`${nestedOk ? 'OK  ' : 'FAIL'} вложенные div того же тега — находок ${mod.failures.length}`);

// data-offer не должен матчиться на data-offer-price.
const onlyFields = '<div data-offer-price>7 900 ₽</div>';
const blocks = mod.findElementsWithAttribute(onlyFields, 'data-offer');
const prefixOk = blocks.length === 0;
if (!prefixOk) bad += 1;
console.log(`${prefixOk ? 'OK  ' : 'FAIL'} data-offer не матчится на data-offer-price — найдено ${blocks.length}`);

console.log(bad === 0 ? '\nВСЕ ПРОВЕРКИ ПРОШЛИ' : `\nПРОВАЛОВ: ${bad}`);
process.exit(bad === 0 ? 0 : 1);
