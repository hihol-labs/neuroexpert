/**
 * Разбор HTML, общий для оракулов воронки и платёжного пути.
 *
 * Код перенесён из scripts/verify-funnel.mjs БЕЗ изменения поведения: там он
 * прошёл 13 раундов независимого ревью, и комментарии внутри называют находки
 * поимённо. Паритет после выноса доказывают локальные наборы
 * scripts/tests/offer-parser.test.mjs и scripts/tests/payment-path.test.mjs —
 * оба гоняют синтетический HTML и сети не требуют.
 *
 * Заявленная граница: сканер рассчитан на разметку, которую производит наша
 * же сборка; HTML с незакрытой кавычкой в атрибуте не моделируется.
 */

const ANCHOR_RE = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const HREF_RE = /\bhref\s*=\s*"([^"]*)"/i;

function parseAnchors(html) {
  const anchors = [];
  for (const match of html.matchAll(ANCHOR_RE)) {
    const attrs = match[1] ?? "";
    const href = attrs.match(HREF_RE)?.[1];
    if (!href) continue;
    anchors.push({
      href: decodeEntities(href),
      attrs,
      text: stripTags(match[2] ?? "").trim(),
    });
  }
  return anchors;
}

function stripTags(fragment) {
  return decodeEntities(fragment.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ");
}

function decodeEntities(value) {
  return value
    // Числовые ссылки — ПЕРВЫМИ и наравне с именованными: браузер раскрывает
    // `java&#x0A;script:` в `java\nscript:` и дальше нормализует URL в
    // `javascript:`, а оракул видел безобидную строку (находка раунда 10).
    // &amp; раскрывается последним, иначе `&amp;#x0A;` (экранированный текст,
    // а не ссылка) превратился бы в перевод строки.
    // Точка с запятой НЕОБЯЗАТЕЛЬНА: браузер раскрывает и `&#x0Ascript`
    // (находка раунда 11). Шестнадцатеричная форма ограничена шестью цифрами —
    // столько нужно на максимальную кодовую точку, дальше это уже текст.
    .replace(/&#(\d{1,7});?/g, (_, code) => safeCodePoint(Number(code)))
    .replace(/&#[xX]([0-9a-fA-F]{1,6});?/g, (_, code) => safeCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Кодовая точка вне допустимого диапазона — оставляем как есть, не падаем. */
function safeCodePoint(code) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

// --- Блок оффера (--check-offer) -------------------------------------------

// Теги без закрывающей пары: их нельзя искать парным сканером глубины.
const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "source", "track", "wbr",
]);

const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

/**
 * Вырезает участки, где угловые скобки НЕ создают видимых элементов:
 * комментарии, <script>, <template>, <style>, <noscript>.
 *
 * Без этого разметка `<!-- <section data-offer>…</section> -->` считалась
 * настоящим блоком: оракул давал зелёный, а пользователь оффера не видел
 * (находка независимого ревью, раунд 1). Содержимое заменяется пробелами
 * ТОЙ ЖЕ длины — смещения остальной разметки не сдвигаются.
 */
// Элементы, чьё содержимое пользователь не видит. RAW_TEXT не разбирается
// вовсе и закрывается ПЕРВЫМ своим закрывающим тегом (как в браузере);
// NESTABLE — обычные контейнеры, они вкладываются сами в себя.
// iframe/noembed/noframes добавлены в раунде 13: содержимое iframe — отдельный
// документ, а не разметка этой страницы, и спрятанный там оффер пользователь
// на маршруте не видит.
const INERT_RAW_TEXT = new Set([
  "script", "style", "textarea", "title", "xmp", "iframe", "noembed", "noframes",
]);
const INERT_NESTABLE = new Set(["template", "noscript"]);
// Матчер тега пропускает кавычки целиком: строка «<script>» внутри значения
// чужого атрибута тегом не считается (раунд 4).
const TAG_AT_RE = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/;

/**
 * Гасит участки, которых пользователь не видит: комментарии, CDATA, содержимое
 * script/style/textarea/title/xmp, template/noscript и всё после plaintext.
 * Заменяются пробелами той же длины — смещения остальной разметки не сдвигаются.
 *
 * Один проход В ПОРЯДКЕ ДОКУМЕНТА, а не серия независимых замен. Два прохода
 * ломались в обе стороны, и обе поломки воспроизведены ревью:
 *   комментарии первыми — валидный `<script><!-- </script> --></script>` терял
 *   настоящий закрывающий тег, script считался незакрытым и глушил реальный
 *   оффер ниже (ложный красный, раунд 6);
 *   теги первыми — комментарий `<!-- <script> -->` перед оффером открывал
 *   несуществующую зону и глушил хвост (ложный красный, раунд 7).
 * Внутри raw-text ничего не разбирается, поэтому `</template>` в строке
 * JavaScript больше не закрывает внешний template (ложный зелёный, раунд 7).
 *
 * Заявленная граница: сканер рассчитан на разметку, которую производит наша же
 * сборка. HTML с НЕЗАКРЫТОЙ кавычкой в атрибуте браузер и это сканирование
 * читают по-разному, такой ввод не моделируется. Полноценный HTML-парсер как
 * зависимость ради случая, которого сборка не производит, осознанно не вводился.
 */
function stripInertRegions(html) {
  // split("") даёт UTF-16-единицы — ровно ту же систему координат, в которой
  // работают indexOf/regexp. Спред [...html] режет по КОДОВЫМ ТОЧКАМ, и один
  // символ вне BMP сдвигал бы всё гашение на позицию вправо, портя видимую
  // разметку (ложный красный, находка раунда 13).
  const chars = html.split("");
  const blank = (from, to) => {
    for (let k = from; k < to; k += 1) chars[k] = " ";
  };

  // Конец raw-text элемента: первый закрывающий тег того же имени.
  const rawTextEnd = (from, tag) => {
    const match = html.slice(from).match(new RegExp(`</${tag}\\s*>`, "i"));
    return match ? from + match.index + match[0].length : html.length;
  };

  // Возвращает индекс сразу за закрывающим тегом stopTag (или конец строки).
  const scan = (start, stopTag) => {
    let i = start;
    while (i < html.length) {
      if (html[i] !== "<") { i += 1; continue; }

      if (html.startsWith("<!--", i)) {
        const found = html.indexOf("-->", i + 4);
        const stop = found === -1 ? html.length : found + 3;
        blank(i, stop); i = stop; continue;
      }
      if (html.startsWith("<![CDATA[", i)) {
        const found = html.indexOf("]]>", i + 9);
        const stop = found === -1 ? html.length : found + 3;
        blank(i, stop); i = stop; continue;
      }

      const match = TAG_AT_RE.exec(html.slice(i));
      if (!match) { i += 1; continue; }
      const tagEnd = i + match[0].length;
      const isClose = match[1] === "/";
      const tag = match[2].toLowerCase();
      const selfClosing = match[4] === "/";

      if (isClose) {
        if (stopTag && tag === stopTag) return tagEnd;
        i = tagEnd; continue;
      }
      // <plaintext> закрыть нельзя: всё после него — текст (раунд 5).
      if (tag === "plaintext") { blank(i, html.length); return html.length; }
      // Слэш в `<script/>` и `<template/>` браузер ИГНОРИРУЕТ: самозакрытие
      // работает только в чужеродном контенте (SVG/MathML), а в HTML это
      // обычный открывающий тег. Раньше сканер верил слэшу и оставлял
      // содержимое видимым — ложный зелёный (находка раунда 9).
      if (selfClosing && !INERT_RAW_TEXT.has(tag) && !INERT_NESTABLE.has(tag)) {
        i = tagEnd; continue;
      }
      if (INERT_RAW_TEXT.has(tag)) {
        const stop = rawTextEnd(tagEnd, tag);
        blank(i, stop); i = stop; continue;
      }
      if (INERT_NESTABLE.has(tag)) {
        // Рекурсия: внутри найдутся и вложенные контейнеры, и raw-text.
        const stop = scan(tagEnd, tag);
        blank(i, stop); i = stop; continue;
      }
      i = tagEnd;
    }
    return html.length;
  };

  scan(0, null);
  return chars.join("");
}

/** Атрибуты открывающего тега → Map. Булев атрибут (без значения) → "". */
function parseAttrs(attrString) {
  const attrs = new Map();
  for (const match of (attrString ?? "").matchAll(ATTR_RE)) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (!attrs.has(name)) attrs.set(name, decodeEntities(value));
  }
  return attrs;
}

/**
 * Находит элементы с ровно указанным атрибутом и возвращает их содержимое.
 *
 * Почему сканер глубины, а не регулярка `<div…>([\s\S]*?)</div>`: у блока
 * оффера внутри есть вложенные элементы того же тега, и ленивая регулярка
 * закрыла бы блок на ПЕРВОМ вложенном </div> — половина полей оказалась бы
 * «снаружи» и проверка врала бы в обе стороны.
 *
 * Имя атрибута сравнивается точно: data-offer не должен матчиться на
 * data-offer-price (это разные атрибуты, и их путаница дала бы ложный успех).
 */
function findElementsWithAttribute(html, attrName) {
  const found = [];
  const openTagRe = /<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/g;
  for (const match of html.matchAll(openTagRe)) {
    const tag = match[1].toLowerCase();
    const attrs = parseAttrs(match[2]);
    if (!attrs.has(attrName)) continue;

    const openEnd = match.index + match[0].length;
    if (match[3] === "/" || VOID_TAGS.has(tag)) {
      found.push({ tag, attrs, inner: "", outer: match[0] });
      continue;
    }

    // Парный сканер: считаем открытия и закрытия ТОГО ЖЕ тега.
    const pairRe = new RegExp(`<(\\/?)${tag}\\b((?:"[^"]*"|'[^']*'|[^>])*?)(\\/?)>`, "gi");
    pairRe.lastIndex = openEnd;
    let depth = 1;
    let closeStart = -1;
    let pair;
    while ((pair = pairRe.exec(html)) !== null) {
      if (pair[1] === "/") {
        depth -= 1;
        if (depth === 0) { closeStart = pair.index; break; }
      } else if (pair[3] !== "/") {
        depth += 1;
      }
    }
    // Незакрытый элемент — не находка «пустого оффера», а поломанная разметка:
    // сообщаем честно, вместо того чтобы молча взять хвост документа.
    found.push({
      tag,
      attrs,
      inner: closeStart === -1 ? null : html.slice(openEnd, closeStart),
      outer: match[0],
    });
  }
  return found;
}

/** Текст поля: разметка снята, сущности раскрыты, пробелы схлопнуты. */
function fieldText(block, attrName) {
  const elements = findElementsWithAttribute(block, attrName);
  if (elements.length === 0) return null;
  const element = elements[0];
  // Значение можно нести и атрибутом (data-offer-price="7900"), и текстом.
  // Голый JSX-атрибут (<dd data-offer-price>) React рендерит как ="true" — это
  // МАРКЕР поля, а не его содержимое. Без этой отсечки «true» прошло бы за
  // валидный артефакт и срок (ложный зелёный, пойман локальным прогоном).
  const rawAttr = (element.attrs.get(attrName) ?? "").trim();
  const attrValue = rawAttr === "true" ? "" : rawAttr;
  const textValue = stripTags(element.inner ?? "").trim();
  return attrValue || textValue;
}

export {
  ANCHOR_RE,
  HREF_RE,
  VOID_TAGS,
  parseAnchors,
  stripTags,
  decodeEntities,
  stripInertRegions,
  parseAttrs,
  findElementsWithAttribute,
  fieldText,
};
