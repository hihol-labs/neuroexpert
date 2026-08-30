/**
 * Оракул юнита G-010 «CTA-цепочка жива».
 *
 * Ходит по HTML ЖИВОГО сайта (как verify-canonical-release.mjs), а не по
 * исходникам: инвентаризация по page.tsx даёт ложное «ссылок нет» — CTA живут
 * в компонентах. Проверяется факт, который увидит клиент, а не намерение кода.
 *
 * Проверки по каждому маршруту:
 *   1. Ни одна ссылка не ведёт на /register или /login (маркетинговая воронка
 *      не упирается в форму регистрации). Осознанное исключение размечается
 *      атрибутом data-funnel-exempt прямо в разметке.
 *   2. /scan и /audit присутствуют в шапке (<header>) и в подвале (<footer>).
 *   3. На странице есть живой канал связи: tel:, t.me или запись на демо
 *      (ссылка на /demo либо элемент с data-funnel-channel="demo").
 *   4. Внутренние ссылки страницы не отдают 404/5xx.
 *
 * Ненулевой exit при любой находке; вывод — маршрут + что именно не так.
 *
 * Окружение: сеть WSL → прод нестабильна (WARP), поэтому каждый запрос
 * ретраится внутри скрипта — снаружи циклов не требуется.
 *
 * ---------------------------------------------------------------------------
 * Режим --check-offer (оракул юнита G-010b «Оффер и прямой язык лендингов»)
 * ---------------------------------------------------------------------------
 * Добавляет к проверкам выше структурную проверку блока оффера: на каждом
 * маршруте есть ровно один элемент с атрибутом data-offer, а внутри него
 * четыре размеченных поля:
 *   data-offer-artifact — что клиент получает на руки;
 *   data-offer-price    — цена: сумма с цифрами либо слово «бесплатно»;
 *   data-offer-term     — срок («—» допустим как явное «не применимо»);
 *   data-offer-cta      — ровно ОДИН основной CTA: ссылка с href и подписью.
 * Никаких лишних фетчей: проверка идёт по уже загруженному HTML маршрута.
 *
 * ЗАЯВЛЕННАЯ ГРАНИЦА (важно, не расширять молча):
 *   Проверяется НАЛИЧИЕ и РАЗМЕТКА оффера, а НЕ смысл, точность и
 *   убедительность текста. Машина не судит, честна ли формулировка, совпадает
 *   ли цифра с /pricing по существу и нет ли в тексте обещания автоматического
 *   внедрения. Эти части критерия юнита несёт раунд независимого ревью, а не
 *   этот скрипт.
 *   LLM-судья в гейт НЕ ставится сознательно: он недетерминирован, то есть
 *   один и тот же кандидат мог бы получить разный вердикт, а гейт, который
 *   иногда зелёный, — не гейт. Цена ошибки — ложное «проверено».
 *   Проверка формата цены (цифры или «бесплатно») — это проверка ФОРМЫ строки,
 *   а не утверждение, что цена верная.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
// Разбор HTML вынесен в общий модуль: тот же код обслуживает оракул
// платёжного пути (scripts/verify-payment-path.mjs). Поведение не менялось —
// паритет держит scripts/tests/offer-parser.test.mjs.
import {
  parseAnchors,
  stripTags,
  stripInertRegions,
  findElementsWithAttribute,
  fieldText,
} from "./lib/html-blocks.mjs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Корень репозитория берётся от файла скрипта: привязка к process.cwd()
// означала бы, что запуск из другого каталога молча отключает обе
// проверки по исходникам и гейт зеленеет впустую.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_ROOTS = ["apps/web/app/(marketing)", "apps/web/components/marketing"];
// Единственный компонент, который рендерится на КАЖДОМ маркетинговом
// маршруте (MarketingHeader/MarketingFooter): только его id доступны любой
// странице. Остальные компоненты этой папки принадлежат отдельным лендингам.
const SHARED_CHROME_SOURCE = "apps/web/components/marketing/nav.tsx";

const baseUrl = (process.env.FUNNEL_URL || process.env.CANONICAL_URL || "https://neuroexpertise.ru").replace(/\/$/, "");
const canonicalOrigin = new URL(baseUrl).origin;

const ROUTES = [
  "/",
  "/for-business",
  "/for-experts",
  "/for-agencies",
  "/how-it-works",
  "/launch",
  "/pricing",
  "/scan",
  "/audit",
];

// Маршруты, которые обязаны быть в шапке и подвале каждого лендинга: это две
// точки входа воронки (замер видимости и карта спроса).
const REQUIRED_CHROME_LINKS = ["/scan", "/audit"];

const AUTH_DEAD_ENDS = ["/register", "/login"];

const MAX_ATTEMPTS = Number(process.env.FUNNEL_ATTEMPTS || 8);
const RETRY_DELAY_MS = Number(process.env.FUNNEL_RETRY_DELAY_MS || 1500);
const REQUEST_TIMEOUT_MS = Number(process.env.FUNNEL_TIMEOUT_MS || 20_000);

// Разбор аргументов строгий: неизвестный флаг — ошибка, а не «молча
// проигнорирую». Опечатка вида --check-offers иначе дала бы ЗЕЛЁНЫЙ прогон
// без проверки оффера, и гейт закрылся бы на более слабой проверке, чем
// думает оператор.
const KNOWN_FLAGS = new Set(["--check-offer"]);
const cliFlags = process.argv.slice(2);
const unknownFlags = cliFlags.filter((flag) => !KNOWN_FLAGS.has(flag));
if (unknownFlags.length) {
  console.error(`Неизвестный аргумент: ${unknownFlags.join(", ")}`);
  console.error(`Допустимые: ${[...KNOWN_FLAGS].join(", ")}`);
  process.exit(2);
}
const CHECK_OFFER = cliFlags.includes("--check-offer");

const failures = [];
const fail = (route, message) => failures.push(`${route}: ${message}`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Запрос с ретраями. Сетевой сбой (WARP роняет 2-3 запроса из 4) не должен
 * выглядеть как находка оракула — иначе гейт врёт в обе стороны.
 */
// Временный отказ инфраструктуры — не находка оракула, а помеха: ретраится
// наравне с сетевым сбоем, иначе гейт краснеет по причине, не связанной с CTA.
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

async function fetchWithRetry(url, init = {}) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ...init,
      });
      if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastError ?? new Error("исчерпаны попытки");
}

/** Читает тело страницы целиком; обрыв чтения ретраится вместе с запросом. */
async function fetchPage(url) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const response = await fetchWithRetry(url);
    try {
      return { response, html: await response.text() };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastError;
}

const normalizePath = (path) => path.replace(/\/+$/, "") || "/";

/**
 * Финальный URL обязан совпасть и по origin, и по пути. Проверки только по
 * origin недостаточно: если все маршруты редиректят на главную, каждый из них
 * проверялся бы по её HTML и гейт был бы ложно-зелёным.
 */
function assertFinalUrl(route, response) {
  const finalUrl = new URL(response.url);
  if (finalUrl.origin !== canonicalOrigin) {
    fail(route, `redirected off-canonical to ${finalUrl.origin}`);
    return false;
  }
  if (normalizePath(finalUrl.pathname) !== normalizePath(route)) {
    fail(route, `redirected to ${finalUrl.pathname} — проверялся бы чужой HTML`);
    return false;
  }
  return true;
}


const PRICE_RE = /\d|бесплатн/i;
// «—», «-», «–» — явное «не применимо»; пустая строка таковой пометкой не является.
const EXPLICIT_NA_RE = /^[—–-]$/;


/** Внешний адрес обязан разбираться и иметь непустой хост. */
function isParsableExternal(href) {
  try {
    const url = new URL(href);
    return url.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Ссылка ведёт на тот же маршрут без якоря — то есть просто перезагружает
 * страницу. Якорь (`#scan-probe`) таким не считается: он ведёт к блоку.
 */
function isSameRouteLink(route, href) {
  if (href.startsWith("#")) return false;
  const target = pathOf(href);
  if (target === null) return false;
  // Сравнение по ДЕКОДИРОВАННОМУ пути: `new URL` процентно кодирует кириллицу,
  // а маршрут записан как есть, и без декодирования правило молчало бы.
  const decode = (value) => {
    try {
      return decodeURI(normalizePath(value));
    } catch {
      return normalizePath(value);
    }
  };
  return decode(target) === decode(route);
}

/**
 * Структурная проверка оффера. Границы — в шапке файла: наличие и разметка,
 * не смысл текста.
 */
function checkOfferBlock(route, rawHtml) {
  // Скрипты, шаблоны и комментарии — не видимая пользователю разметка.
  const html = stripInertRegions(rawHtml);
  const blocks = findElementsWithAttribute(html, "data-offer");
  if (blocks.length === 0) {
    fail(route, "нет блока оффера (элемент с атрибутом data-offer)");
    return;
  }
  if (blocks.length > 1) {
    // Два оффера на маршруте = у клиента нет одного понятного предложения.
    fail(route, `блоков оффера ${blocks.length}, ожидался ровно один`);
    return;
  }

  const block = blocks[0];

  // Блок вне <main> скринридер пропускает при переходе к основному содержимому:
  // визуально оффер на месте, а по клавиатуре его нет (реальный дефект
  // /pricing, находка раунда 17). Проверяем по позиции в разметке.
  const mainOpen = html.search(/<main\b[^>]*>/i);
  const mainClose = html.search(/<\/main\s*>/i);
  const offerAt = html.indexOf(block.outer);
  if (mainOpen === -1 || mainClose === -1) {
    fail(route, "на маршруте нет landmark <main> — оффер негде разместить правильно");
  } else if (!(offerAt > mainOpen && offerAt < mainClose)) {
    fail(route, "блок оффера вне <main>: переход скринридера к основному содержимому его пропустит");
  }

  if (block.inner === null) {
    fail(route, `блок оффера не закрыт: <${block.tag} data-offer …> без парного </${block.tag}>`);
    return;
  }

  const artifact = fieldText(block.inner, "data-offer-artifact");
  if (!artifact) fail(route, "в оффере нет поля data-offer-artifact (что клиент получает)");
  else if (EXPLICIT_NA_RE.test(artifact)) fail(route, "поле data-offer-artifact — прочерк; артефакт обязан быть назван");

  const price = fieldText(block.inner, "data-offer-price");
  if (!price) fail(route, "в оффере нет поля data-offer-price (цена или «бесплатно»)");
  else if (!PRICE_RE.test(price)) fail(route, `поле data-offer-price = «${price}»: ожидалась сумма или «бесплатно»`);

  const term = fieldText(block.inner, "data-offer-term");
  if (!term) fail(route, "в оффере нет поля data-offer-term (срок; «—» допустим)");

  const ctas = findElementsWithAttribute(block.inner, "data-offer-cta");
  if (ctas.length === 0) {
    fail(route, "в оффере нет основного CTA (элемент с data-offer-cta)");
    return;
  }
  if (ctas.length > 1) {
    fail(route, `в оффере ${ctas.length} элементов data-offer-cta, основной CTA должен быть один`);
    return;
  }

  const cta = ctas[0];
  // Кликабельность — часть контракта: <div data-offer-cta href="/scan"> имеет
  // href, но никуда не ведёт (находка независимого ревью, раунд 1). Next/Link
  // рендерится в <a>, поэтому требование к тегу выполнимо без оговорок.
  if (cta.tag !== "a") {
    fail(route, `основной CTA оффера — <${cta.tag}>, а не ссылка <a>: элемент не кликабелен`);
    return;
  }
  const rawHref = (cta.attrs.get("href") ?? "").trim();
  // Браузер выбрасывает пробельные и управляющие символы ВНУТРИ схемы, поэтому
  // `java\nscript:` для него — тот же `javascript:`. Сравнивать надо по той же
  // нормализованной форме, иначе заглушка проходит проверку (находка раунда 5).
  const href = rawHref.replace(/[\u0000-\u0020\u007f]/g, "");
  // Допуск СПИСКОМ РАЗРЕШЁННОГО, а не перечнем опасного. Перечень опасного
  // проигрывал раунд за раундом: javascript: -> about: -> java\nscript: ->
  // java&#x0A;script: -> java&#x0Ascript -> &NewLine;/&colon; (раунды 2, 4, 5,
  // 10, 11, 12). Именованных ссылок в HTML больше двух тысяч, гонка за ними
  // бесконечна. Рабочих форм у CTA ровно пять, всё остальное — красное.
  const ALLOWED_HREF = new RegExp(
    "^(?:"
    + "/(?![/\\\\])\\S*"          // внутренний путь; //host и /\host исключены
    + "|#[A-Za-z][\\w.:-]*"        // якорь с именем (пустой # не проходит)
    // Хост обязателен: `https:///` и `https://?x` — синтаксически ссылка, а
    // фактически никуда (находка раунда 14).
    + "|https?://[^\\s/?#]+\\S*"    // внешний адрес с хостом
    + "|tel:\\+?[\\d\\s().-]{3,}"  // телефон
    + "|mailto:[^\\s@]+@[^\\s@]+"   // почта
    + ")$",
  );

  // Именованная сущность, которую мы НЕ раскрываем, — красное, а не «текст».
  // `/&NewLine;/evil.example` выглядит внутренним путём, а браузер раскрывает
  // сущность, выбрасывает перевод строки и уходит на чужой хост (находка
  // раунда 18). Раскрывать все две тысячи имён смысла нет: в наших href
  // сущностей быть не должно вовсе, кроме уже раскрытого `&amp;`.
  const UNKNOWN_ENTITY_RE = /&[a-zA-Z][a-zA-Z0-9]{1,31};/;

  if (!href) {
    fail(route, "основной CTA оффера без href — кнопка никуда не ведёт");
  } else if (UNKNOWN_ENTITY_RE.test(href)) {
    fail(route, `основной CTA оффера с href="${rawHref}" — нераскрытая HTML-сущность: браузер прочтёт адрес иначе`);
  } else if (/^https?:/i.test(href) && !isParsableExternal(href)) {
    // Шаблон пропускал `https://%` и `https://[` — синтаксически похоже на
    // адрес, а браузер такую ссылку не откроет (находка раунда 17).
    fail(route, `основной CTA оффера с href="${rawHref}" — адрес не разбирается как URL`);
  } else if (!ALLOWED_HREF.test(href)) {
    fail(route, `основной CTA оффера с href="${rawHref}" — не рабочая ссылка (допустимы путь, якорь с именем, http(s), tel:, mailto:)`);
  } else if (AUTH_DEAD_ENDS.includes(normalizePath(pathOf(href) ?? ""))) {
    // Дублирует правило CTA намеренно: тут адресная ошибка называется по месту.
    fail(route, `основной CTA оффера ведёт в ${href} — это тупик авторизации`);
  } else if (isSameRouteLink(route, href)) {
    // Ссылка на саму себя перезагружает страницу и ничего не запускает
    // (реальный дефект /scan, находка раунда 7; правило — чтобы не вернулся).
    fail(route, `основной CTA оффера ведёт на текущую страницу ${href} — клик ничего не делает`);
  }

  const label = stripTags(cta.inner ?? "").trim();
  if (!label) fail(route, "у основного CTA оффера нет подписи");
}

/**
 * Вырезает секцию сайтовой шапки/подвала. Приоритет — по классу сайтового
 * chrome (sr-header/sr-footer): внутри страниц встречаются собственные
 * <header> секций, и первый попавшийся тег может оказаться не тем.
 */
function extractChrome(html, tag, chromeClass) {
  const scoped = new RegExp(`<${tag}\\b[^>]*class="[^"]*${chromeClass}[^"]*"[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const scopedMatch = html.match(scoped);
  // Фоллбэка на произвольный первый <header>/<footer> нет умышленно: страницы
  // содержат собственные заголовки секций, и подстановка чужого элемента
  // означала бы «сайтовый chrome сломан, но проверка прошла».
  return scopedMatch ? scopedMatch[1] : null;
}

function pathOf(href, base = `${canonicalOrigin}/`) {
  try {
    const url = new URL(href, base);
    return url.origin === canonicalOrigin ? normalizePath(url.pathname) : null;
  } catch {
    return null;
  }
}

/**
 * Внутренняя страница — в том числе относительная ссылка без ведущего слэша
 * (href="broken"): такая ссылка ведёт на реальный маршрут и точно так же может
 * отдать 404, поэтому пропускать её нельзя.
 */
function isInternalPage(href, base) {
  if (/^(mailto:|tel:|javascript:|#)/i.test(href)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^https?:/i.test(href)) return false;
  // Сюда попадают и protocol-relative адреса (//neuroexpertise.ru/…): их
  // origin определяется только после разбора, отбрасывать их вслепую нельзя.
  return pathOf(href, base) !== null;
}

/**
 * Исключение действует, только если атрибут стоит на САМОМ элементе ссылки:
 * совпадение по строке позволяло комментарию или соседнему элементу прикрыть
 * настоящий /register и, наоборот, краснело на честной многострочной разметке.
 */
function isExemptElement(source, index) {
  const start = source.lastIndexOf("<", index);
  const end = source.indexOf(">", index);
  if (start === -1 || end === -1 || end < start) return false;
  return /\bdata-funnel-exempt\b/.test(source.slice(start, end));
}

/**
 * Якорные CTA (#funnel-contact) проверяются на существование цели: без этого
 * опечатка или удаление блока оставляют кнопку зелёной, но мёртвой.
 */
function checkFragmentTargets(route, html, anchors) {
  for (const anchor of anchors) {
    if (!anchor.href.startsWith("#") || anchor.href === "#") continue;
    const id = decodeURIComponent(anchor.href.slice(1));
    const idPattern = new RegExp(`\\bid="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
    if (!idPattern.test(html)) {
      fail(route, `CTA ведёт на якорь ${anchor.href}, но элемента с таким id на странице нет`);
    }
  }
}

function checkAuthDeadEnds(route, anchors, pageUrl) {
  for (const anchor of anchors) {
    const path = pathOf(anchor.href, pageUrl);
    if (!path || !AUTH_DEAD_ENDS.includes(path)) continue;
    // Осознанное исключение размечается в разметке, а не в оракуле: правка
    // видна в дифе страницы, а не спрятана в списке внутри гейта.
    if (/\bdata-funnel-exempt\b/i.test(anchor.attrs)) continue;
    const label = anchor.text ? `«${anchor.text}»` : "(без текста)";
    fail(route, `CTA ${label} ведёт на ${anchor.href} — воронка упирается в форму входа`);
  }
}

function checkChromeLinks(route, html, pageUrl) {
  for (const [tag, chromeClass, human] of [["header", "sr-header", "шапке"], ["footer", "sr-footer", "подвале"]]) {
    const section = extractChrome(html, tag, chromeClass);
    if (section === null) {
      fail(route, `не найден <${tag}> — нечем проверить ссылки в ${human}`);
      continue;
    }
    const paths = new Set(parseAnchors(section).map((anchor) => pathOf(anchor.href, pageUrl)).filter(Boolean));
    for (const required of REQUIRED_CHROME_LINKS) {
      if (!paths.has(required)) fail(route, `нет ссылки на ${required} в ${human}`);
    }
  }
}

/**
 * Живой канал ищется в ТЕЛЕ страницы, а не в глобальном подвале: подвал общий
 * для всех маршрутов, и проверка по нему проходила бы всегда — гейт был бы
 * холостым и пропустил бы лендинг без единого контакта в содержимом.
 */
function checkLiveChannel(route, html) {
  const footer = extractChrome(html, "footer", "sr-footer");
  const body = footer ? html.replace(footer, "") : html;
  const anchors = parseAnchors(body);
  const hasPhone = anchors.some((anchor) => /^tel:/i.test(anchor.href));
  const hasTelegram = anchors.some((anchor) => /(^|\/\/)([\w.]*\.)?t\.me\//i.test(anchor.href));
  const hasDemo =
    anchors.some((anchor) => pathOf(anchor.href) === "/demo") ||
    /data-funnel-channel="demo"/i.test(body);
  if (!hasPhone && !hasTelegram && !hasDemo) {
    fail(route, "нет живого канала связи в теле страницы (tel:, t.me или запись на демо)");
  }
}

/**
 * Вторая ступень — по исходникам маркетинговой поверхности. Она НЕ заменяет
 * проверку живого HTML, а закрывает её слепое пятно: CTA, спрятанный за
 * клиентским переключателем (например, вкладка «Эксперт» на /pricing), в
 * серверном HTML отсутствует, но клиент его увидит и упрётся в форму входа.
 * Отключается FUNNEL_SKIP_SOURCE=1 (прогон против чужого/старого билда).
 *
 * ЗАЯВЛЕННАЯ ГРАНИЦА (ревью, раунд 5). Ступень видит только литеральные цели в
 * позиции href. Вычисляемая цель (`href={target}`, тернарник, склейка строк,
 * значение из внешних данных) статически не разрешается — доказать её
 * назначение без исполнения кода нельзя. Такие CTA покрываются проверкой
 * живого HTML тогда и только тогда, когда попадают в серверную разметку;
 * то, что рендерится ТОЛЬКО после клиентского взаимодействия и вычисляется
 * динамически, этим оракулом не покрыто — это осознанный предел, а не
 * пропущенный дефект. Практика проекта: цель CTA задаётся литералом.
 */
function checkClientOnlyDeadEnds() {
  if (process.env.FUNNEL_SKIP_SOURCE === "1") return;
  const roots = SOURCE_ROOTS;
  // Ловится любая строковая цель, а не только атрибут href="…": CTA часто
  // описан данными (`{ cta: "…", href: "/register?plan=pro" }`) и попадает в
  // разметку через <Link href={offer.href}> — форма, ради которой и заведена
  // эта ступень.
  // Учитываются и завершающий слэш (`/register/`), и абсолютный same-origin
  // адрес (`https://neuroexpertise.ru/login`): обе формы ведут в тот же тупик.
  const pattern = /\bhref\s*[:=]\s*\{?\s*["'`](?:https?:\/\/(?:www\.)?neuroexpertise\.ru)?(\/(?:register|login)\/?(?:[?#][^"'`]*)?)["'`]/g;
  for (const root of roots) {
    const absolute = resolve(repoRoot, root);
    if (!existsSync(absolute)) {
      fail(root, "каталог маркетинговой поверхности не найден — ступень по исходникам не выполнена");
      continue;
    }
    for (const file of walk(absolute)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(pattern)) {
        const line = source.slice(0, match.index).split("\n").length;
        if (isExemptElement(source, match.index)) continue;
        fail(`${file}:${line}`, `в исходнике маркетинговой страницы CTA ведёт на ${match[1]}`);
      }
    }
  }
}

/**
 * Внутренние цели ссылок, объявленные в исходниках маркетинговой поверхности.
 * Нужны потому, что CTA за клиентским переключателем в серверный HTML не
 * попадает: опечатка `/scna` в скрытых данных тарифов иначе осталась бы
 * непроверенной до клика реального клиента.
 */
export function collectSourceLinkTargets() {
  if (process.env.FUNNEL_SKIP_SOURCE === "1") return [];
  const targets = new Set();
  for (const root of SOURCE_ROOTS) {
    const absolute = resolve(repoRoot, root);
    if (!existsSync(absolute)) continue;
    for (const file of walk(absolute)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\bhref\s*[:=]\s*\{?\s*["'`](\/[^"'`\s]*)["'`]/g)) {
        targets.add(match[1]);
      }
    }
  }
  return [...targets];
}

/**
 * Якорные цели, объявленные в исходниках. Проверка по живому HTML их не
 * покрывает: CTA за клиентским переключателем (вкладка «Эксперт» на /pricing)
 * в серверный HTML не попадает, и опечатка в `#funnel-contact` осталась бы
 * незамеченной до клика реального клиента.
 */
function checkSourceFragmentTargets() {
  if (process.env.FUNNEL_SKIP_SOURCE === "1") return;
  const files = [];
  for (const root of SOURCE_ROOTS) {
    const absolute = resolve(repoRoot, root);
    if (!existsSync(absolute)) {
      fail(root, "каталог маркетинговой поверхности не найден — проверка якорей по исходникам не выполнена");
      continue;
    }
    files.push(...walk(absolute));
  }
  const sources = new Map(files.map((file) => [file, readFileSync(file, "utf8")]));
  const idsByFile = new Map();
  const chromeIds = new Set();
  for (const [file, source] of sources) {
    const ids = new Set([...source.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
    idsByFile.set(file, ids);
    if (file.endsWith(SHARED_CHROME_SOURCE)) for (const id of ids) chromeIds.add(id);
  }
  for (const [file, source] of sources) {
    // Только цели ссылок: без привязки к href в выборку попадают hex-цвета.
    for (const match of source.matchAll(/\bhref\s*[:=]\s*\{?\s*["'`]#([A-Za-z][\w-]*)["'`]/g)) {
      // Цель обязана быть объявлена на этой же странице либо в общем chrome:
      // общий пул id по всей поверхности позволял одноимённому якорю с чужого
      // маршрута подтвердить несуществующую цель.
      if (idsByFile.get(file)?.has(match[1]) || chromeIds.has(match[1])) continue;
      const line = source.slice(0, match.index).split("\n").length;
      fail(`${file}:${line}`, `CTA ведёт на якорь #${match[1]}, но элемента с таким id в маркетинговых исходниках нет`);
    }
  }
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) yield full;
  }
}

async function main() {
  // Внутренние ссылки собираются по всем маршрутам и проверяются один раз:
  // один и тот же /pricing не нужно дёргать девять раз по нестабильной сети.
  const internalTargets = new Map();

  for (const route of ROUTES) {
    const url = `${baseUrl}${route}`;
    let response;
    let html;
    try {
      ({ response, html } = await fetchPage(url));
    } catch (error) {
      fail(route, `запрос не прошёл: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (!assertFinalUrl(route, response)) continue;
    if (!response.ok) {
      fail(route, `HTTP ${response.status}`);
      continue;
    }

    const anchors = parseAnchors(html);

    checkAuthDeadEnds(route, anchors, response.url);
    checkChromeLinks(route, html, response.url);
    checkLiveChannel(route, html);
    checkFragmentTargets(route, html, anchors);
    // Проверки G-010 остаются включёнными: тот же HTML уже загружен, лишней
    // сети нет, а регрессия живой CTA-цепочки видна сразу.
    if (CHECK_OFFER) checkOfferBlock(route, html);

    for (const anchor of anchors) {
      if (!isInternalPage(anchor.href, response.url)) continue;
      const target = new URL(anchor.href, response.url);
      const key = `${target.pathname}${target.search}`;
      if (!internalTargets.has(key)) internalTargets.set(key, route);
    }
  }

  for (const target of collectSourceLinkTargets()) {
    if (!internalTargets.has(target)) internalTargets.set(target, "исходники маркетинговой поверхности");
  }

  for (const [target, foundOn] of internalTargets) {
    const url = `${canonicalOrigin}${target}`;
    try {
      const response = await fetchWithRetry(url);
      if (response.status >= 400) {
        fail(foundOn, `внутренняя ссылка ${target} отдаёт HTTP ${response.status}`);
        continue;
      }
      // Статуса мало: ссылка вида /start, редиректящая на /login с кодом 200,
      // приводит клиента ровно в тот тупик, который проверяет весь оракул.
      const finalUrl = new URL(response.url);
      if (finalUrl.origin !== canonicalOrigin) {
        fail(foundOn, `внутренняя ссылка ${target} уводит на чужой origin ${finalUrl.origin}`);
      } else if (
        AUTH_DEAD_ENDS.includes(normalizePath(finalUrl.pathname)) &&
        normalizePath(target.split("?")[0]) !== normalizePath(finalUrl.pathname)
      ) {
        // Ссылка, которая сама объявлена как /login (размеченный вход для
        // действующих клиентов), проверяется правилом CTA. Здесь ловится другое:
        // нейтральный на вид адрес, скрытно приводящий в форму входа.
        fail(foundOn, `внутренняя ссылка ${target} редиректит на ${finalUrl.pathname}`);
      }
    } catch (error) {
      fail(foundOn, `внутренняя ссылка ${target} не проверена: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  checkClientOnlyDeadEnds();
  checkSourceFragmentTargets();

  // Режим печатается в итоговой строке: она уходит в квитанцию как evidence,
  // и по ней должно быть видно, ЧТО именно проверялось.
  const mode = CHECK_OFFER ? ", offer blocks" : "";
  if (failures.length) {
    console.error(`Funnel verification FAILED for ${baseUrl} (${ROUTES.length} routes, ${internalTargets.size} internal links${mode})`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`Funnel verification passed for ${baseUrl} (${ROUTES.length} routes, ${internalTargets.size} internal links${mode})`);
  }
}

await main();
