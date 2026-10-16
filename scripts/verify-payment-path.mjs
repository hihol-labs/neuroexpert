/**
 * Оракул юнита G-011 «Приём денег».
 *
 * Критерий юнита: простейший путь приёма оплаты готов — шаг оплаты со счётом
 * самозанятого и платёжной ссылкой, шаблоны документов в репо, инструкция
 * фаундеру, демо-цифры на лендингах помечены как демонстрационные.
 *
 * Проверяются ДВА независимых слоя:
 *
 *   РЕПО (по исходникам) — шаблоны документов и инструкция фаундера лежат в
 *   дереве, непустые и содержат обязательные разделы. Это то, что нельзя
 *   увидеть на сайте, но без чего оплату не закрыть документами.
 *
 *   ЖИВОЙ САЙТ (по HTML canonical) — маршрут /pay отдаёт 200 и несёт ровно
 *   один размеченный блок оплаты со всеми полями; на странице есть ИНН
 *   исполнителя; внутренние ссылки не отдают 404/5xx; на /pricing и /audit
 *   есть ссылка на /pay; размеченные демо-цифры несут дисклеймер.
 *
 * ЗАЯВЛЕННАЯ ГРАНИЦА (не расширять молча):
 *   Машина проверяет НАЛИЧИЕ, РАЗМЕТКУ и ДОСТУПНОСТЬ, а не смысл. Она не
 *   судит, верны ли реквизиты, работает ли платёжная ссылка на стороне банка,
 *   юридически ли корректна оферта и честна ли формулировка дисклеймера.
 *   Проверка формата суммы — это проверка ФОРМЫ строки, а не утверждение, что
 *   цена верная. Смысловые части критерия несёт раунд независимого ревью.
 *   Оплату «до конца» (реальные деньги на счёте) оракул не эмулирует
 *   сознательно: тестовый платёж — это ручной шаг фаундера из runbook.
 *
 * Коды выхода:
 *   0 — находок нет;
 *   1 — есть находки (печатаются построчно: где и что именно не так);
 *   2 — ошибка использования (неизвестный флаг);
 *   3 — транспорт: сайт недоступен. Это НЕ находка юнита — канал WSL → прод
 *       рвётся регулярно, и красный из-за сети не должен читаться как «путь
 *       оплаты сломан» (инцидент 2026-08-27: сплошной fetch failed из WSL при
 *       здоровом проде; прогон с сервера был зелёным).
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseAnchors,
  stripInertRegions,
  findElementsWithAttribute,
  fieldText,
} from "./lib/html-blocks.mjs";

// Корень репозитория берётся от файла скрипта, а не от process.cwd(): запуск
// из другого каталога иначе молча отключал бы проверки по исходникам.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const KNOWN_FLAGS = new Set(["--base-url"]);
const argv = process.argv.slice(2);
let baseUrlArg = null;
for (let i = 0; i < argv.length; i += 1) {
  const flag = argv[i];
  if (flag === "--base-url") {
    baseUrlArg = argv[i + 1] ?? null;
    i += 1;
    if (!baseUrlArg) {
      console.error("Флаг --base-url требует значение: --base-url https://…");
      process.exit(2);
    }
    continue;
  }
  if (!KNOWN_FLAGS.has(flag)) {
    // Опечатка вида --base_url иначе дала бы прогон «по умолчанию» и зелёный
    // гейт по не тому адресу.
    console.error(`Неизвестный флаг: ${flag}. Известные: --base-url <URL>`);
    process.exit(2);
  }
}

const baseUrl = (
  baseUrlArg
  || process.env.PAYMENT_URL
  || process.env.CANONICAL_URL
  || "https://neuroexpertise.ru"
).replace(/\/$/, "");
let canonicalOrigin;
try {
  canonicalOrigin = new URL(baseUrl).origin;
} catch {
  console.error(`Некорректный базовый адрес: ${baseUrl}`);
  process.exit(2);
}

const PAY_ROUTE = "/pay";
// Маршруты, с которых по критерию воронки обязана вести ссылка на шаг оплаты.
const ROUTES_LINKING_TO_PAY = ["/pricing", "/audit"];
// Маркетинговые маршруты, на которых ищутся размеченные демо-цифры. Список
// совпадает с оракулом воронки: те же 9 публичных страниц.
const MARKETING_ROUTES = [
  "/",
  "/pricing",
  "/scan",
  "/audit",
  "/how-it-works",
  "/for-business",
  "/for-experts",
  "/for-agencies",
  "/launch",
];

const MAX_ATTEMPTS = Number(process.env.PAYMENT_ATTEMPTS || 8);
const RETRY_DELAY_MS = Number(process.env.PAYMENT_RETRY_DELAY_MS || 1500);
const REQUEST_TIMEOUT_MS = Number(process.env.PAYMENT_TIMEOUT_MS || 20_000);

const failures = [];
const fail = (where, message) => failures.push(`${where}: ${message}`);

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// Временный отказ инфраструктуры — помеха, а не находка: ретраится наравне с
// сетевым сбоем.
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

class TransportError extends Error {}

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
  throw new TransportError(`${url}: ${lastError?.message ?? "исчерпаны попытки"}`);
}

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
  throw new TransportError(`${url}: ${lastError?.message ?? "тело не прочитано"}`);
}

const normalizePath = (path) => path.replace(/\/+$/, "") || "/";

/** Финальный URL обязан совпасть и по origin, и по пути. */
function assertFinalUrl(route, response) {
  const finalUrl = new URL(response.url);
  if (finalUrl.origin !== canonicalOrigin) {
    fail(route, `редирект за пределы canonical: ${finalUrl.origin}`);
    return false;
  }
  if (normalizePath(finalUrl.pathname) !== normalizePath(route)) {
    fail(route, `редирект на ${finalUrl.pathname} — проверялся бы чужой HTML`);
    return false;
  }
  return true;
}

// --- Слой 1: документы и инструкция в репозитории ---------------------------

// Для каждого шаблона: минимальный размер и обязательные разделы. Разделы
// выбраны так, чтобы файл-заглушка («TODO») не проходил проверку.
const DOC_REQUIREMENTS = [
  {
    path: "docs/legal/oferta-template.md",
    title: "шаблон оферты",
    minBytes: 800,
    required: ["Исполнитель", "ИНН", "Предмет", "Стоимость", "Акт"],
  },
  {
    path: "docs/legal/invoice-template.md",
    title: "шаблон счёта",
    minBytes: 400,
    required: ["Счёт", "ИНН", "Получатель", "Назначение платежа", "Сумма"],
  },
  {
    path: "docs/legal/act-template.md",
    title: "шаблон акта",
    minBytes: 400,
    required: ["Акт", "Услуги оказаны", "Сумма", "Подпис"],
  },
  {
    path: "docs/founder-payment-runbook.md",
    title: "инструкция фаундера",
    minBytes: 1200,
    required: ["счёт", "Мой налог", "чек", "акт", "SALES_LOG"],
  },
];

const PAGE_SOURCE = "apps/web/app/(marketing)/pay/page.tsx";

function checkRepoArtifacts() {
  for (const doc of DOC_REQUIREMENTS) {
    const full = resolve(repoRoot, doc.path);
    if (!existsSync(full)) {
      fail(doc.path, `${doc.title} отсутствует — оплату нечем закрыть документами`);
      continue;
    }
    const text = readFileSync(full, "utf8");
    if (Buffer.byteLength(text, "utf8") < doc.minBytes) {
      fail(
        doc.path,
        `${doc.title} короче ${doc.minBytes} байт — это заглушка, а не документ`,
      );
      continue;
    }
    // «ё» гасится с обеих сторон: внешние документы у нас пишутся без «ё»
    // (house style), а маркер разумно называть словом как оно звучит.
    // Без нормализации «Счёт» не находился бы в «Счет» — ложная находка.
    const normalize = (value) => value.toLowerCase().replace(/ё/g, "е");
    const body = normalize(text);
    const missing = doc.required.filter((marker) => !body.includes(normalize(marker)));
    if (missing.length > 0) {
      fail(doc.path, `в ${doc.title} нет обязательных разделов: ${missing.join(", ")}`);
    }
  }

  if (!existsSync(resolve(repoRoot, PAGE_SOURCE))) {
    fail(PAGE_SOURCE, "нет исходника страницы оплаты — живой /pay был бы чужим маршрутом");
  }
}

// --- Слой 2: живой маршрут /pay --------------------------------------------

// «ё» гасится так же, как в проверке документов: «по счету» и «по счёту» —
// одна и та же формулировка, и различать их значило бы краснеть на орфографии.
const normalizeYo = (value) => value.toLowerCase().replace(/ё/g, "е");
const AMOUNT_RE = /\d|по счету|по договоренности/;
// ИНН самозанятого — 12 цифр. Проверяется наличие подписи «ИНН» рядом с
// числом: голое 12-значное число может быть чем угодно.
const INN_RE = /ИНН[^0-9]{0,40}(\d[\d\s]{10,20}\d)/i;
const DEAD_CTA_RE = /^(#|javascript:)/i;
const AUTH_DEAD_ENDS = ["/register", "/login"];

const PAYMENT_FIELDS = [
  ["data-payment-subject", "что именно оплачивается"],
  ["data-payment-amount", "сумма"],
  ["data-payment-method", "способ оплаты (ссылка или реквизиты)"],
  ["data-payment-requisites", "реквизиты исполнителя"],
  ["data-payment-docs", "ссылки на оферту и реквизиты"],
];

function checkPaymentBlock(route, rawHtml) {
  const html = stripInertRegions(rawHtml);
  const blocks = findElementsWithAttribute(html, "data-payment");
  if (blocks.length === 0) {
    fail(route, "нет блока оплаты (элемент с атрибутом data-payment)");
    return;
  }
  if (blocks.length > 1) {
    fail(route, `блоков data-payment ${blocks.length}, должен быть ровно один`);
    return;
  }
  const block = blocks[0];
  if (block.inner === null) {
    fail(route, `блок оплаты не закрыт: <${block.tag} data-payment …> без парного тега`);
    return;
  }
  const inner = block.inner;

  for (const [attr, human] of PAYMENT_FIELDS) {
    // Дубль поля — не косметика: две разные суммы в одном блоке оплаты
    // означают, что клиент увидит одну, а fieldText проверит первую.
    const occurrences = findElementsWithAttribute(inner, attr).length;
    if (occurrences > 1) {
      fail(route, `поле ${attr} встречается ${occurrences} раза — в блоке оплаты оно должно быть одно`);
      continue;
    }
    const value = fieldText(inner, attr);
    if (!value) {
      fail(route, `в блоке оплаты нет поля ${attr} (${human})`);
      continue;
    }
    if (attr === "data-payment-amount" && !AMOUNT_RE.test(normalizeYo(value))) {
      fail(
        route,
        `поле суммы «${value}» без цифр и без явного «по счёту» — клиент не знает, сколько платить`,
      );
    }
  }

  const requisites = fieldText(inner, "data-payment-requisites") ?? "";
  if (!INN_RE.test(requisites) && !INN_RE.test(inner)) {
    fail(route, "в блоке оплаты нет ИНН исполнителя — платить некуда");
  }

  const docsField = findElementsWithAttribute(inner, "data-payment-docs")[0];
  if (docsField && docsField.inner !== null) {
    const docLinks = parseAnchors(docsField.inner).map((anchor) => anchor.href);
    for (const required of ["/terms", "/requisites"]) {
      if (!docLinks.some((href) => normalizePath(pathOf(href) ?? "") === required)) {
        fail(route, `в блоке оплаты нет ссылки на ${required}`);
      }
    }
  }

  // Состояние платёжной ссылки объявляется страницей явно и проверяется на
  // согласованность с CTA. Без этого CTA-фолбэк «Запросить счёт» проходил все
  // проверки, и оракул зеленел на странице БЕЗ платёжной ссылки — а ссылка
  // прямо названа в критерии юнита (находка независимого ревью, important).
  const linkStatus = (block.attrs.get("data-payment-link-status") ?? "").trim();
  if (linkStatus !== "live" && linkStatus !== "absent") {
    fail(
      route,
      `блок оплаты не объявляет data-payment-link-status ("${linkStatus}") —`
      + " состояние платёжной ссылки должно быть видимым фактом, а не догадкой",
    );
  }

  const ctas = findElementsWithAttribute(inner, "data-payment-cta");
  if (ctas.length !== 1) {
    fail(route, `элементов data-payment-cta ${ctas.length}, основной CTA должен быть один`);
    return;
  }
  const cta = ctas[0];
  if (cta.tag !== "a") {
    fail(route, `основной CTA оплаты — <${cta.tag}>, а не ссылка <a>: элемент не кликабелен`);
    return;
  }
  const href = cta.attrs.get("href");
  if (!href) {
    fail(route, "основной CTA оплаты без href — кнопка никуда не ведёт");
    return;
  }
  if (DEAD_CTA_RE.test(href)) {
    fail(route, `основной CTA оплаты с href="${href}" — заглушка, а не рабочая ссылка`);
  }
  if (AUTH_DEAD_ENDS.some((dead) => normalizePath(pathOf(href) ?? "") === dead)) {
    fail(route, `основной CTA оплаты ведёт в ${href} — это тупик авторизации`);
  }
  if (!(cta.inner ?? "").replace(/<[^>]*>/g, "").trim()) {
    fail(route, "у основного CTA оплаты нет подписи");
  }

  // Объявленное состояние обязано совпасть с тем, куда ведёт CTA: «live» —
  // абсолютный https-адрес платёжной ссылки, «absent» — относительный путь
  // запроса счёта. Иначе разметка сказала бы «ссылка есть», а кнопка вела бы
  // на форму.
  //
  // Критерий именно «абсолютный https», а НЕ «чужой origin»: страница
  // принимает любой https-адрес из PAYMENT_LINK_URL, и ссылка на своём домене
  // (редирект на банк) — рабочий случай. Требование чужого origin давало бы
  // ложный красный на рабочем пути (находка ревью, раунд 2).
  const absoluteHttps = /^https:\/\//i.test(href);
  // Абсолютный адрес на САМ сайт платёжной ссылкой не является: скопированный
  // в PAYMENT_LINK_URL адрес страницы оплаты дал бы кнопку «Оплатить по
  // ссылке», ведущую на эту же страницу, и зелёный гейт (находка ревью,
  // раунд 3). Внутренние тупики отвергаются явно.
  const internalDeadEnd = [...AUTH_DEAD_ENDS, PAY_ROUTE].includes(
    normalizePath(pathOf(href) ?? ""),
  );
  if (linkStatus === "live" && internalDeadEnd) {
    fail(
      route,
      `объявлено data-payment-link-status="live", но CTA ведёт на ${href} —`
      + " это адрес внутри сайта, а не платёжная ссылка",
    );
  }
  if (linkStatus === "live" && !absoluteHttps) {
    fail(
      route,
      `объявлено data-payment-link-status="live", но CTA ведёт на ${href} —`
      + " это не абсолютная платёжная https-ссылка",
    );
  }
  if (linkStatus === "absent" && absoluteHttps) {
    fail(
      route,
      `объявлено data-payment-link-status="absent", но CTA ведёт на абсолютный ${href}`,
    );
  }
  if (linkStatus === "absent") {
    // Не находка, а честный сигнал оператору: путь оплаты работает через счёт,
    // платёжной ссылки на проде нет.
    console.error(
      `  ! ${route}: платёжная ссылка не задана (PAYMENT_LINK_URL пуст или не https) —`
      + " страница ведёт по пути «Запросить счёт»",
    );
  }
}

/**
 * Гасит общую шапку и подвал: их содержимое одинаково на всех маршрутах и не
 * является шагом воронки конкретной страницы. Заменяются пробелами той же
 * длины — смещения остальной разметки не сдвигаются.
 */
function stripChrome(html) {
  return html.replace(
    /<(header|footer)\b[\s\S]*?<\/\1>/gi,
    (match) => " ".repeat(match.length),
  );
}

/**
 * Сколько на странице подвалов. Именно подвал несёт общую ссылку «Оплата»,
 * ради которой и введено гашение chrome: контентных <header> внутри секций
 * много, и считать их признаком «chrome распознан» значит не заметить
 * регрессию именно футера (находка ревью, раунд 3).
 */
function countFooters(html) {
  return (html.match(/<footer\b[\s\S]*?<\/footer>/gi) ?? []).length;
}

/**
 * Сколько ссылок на шаг оплаты есть в ТЕЛЕ страницы.
 *
 * Общая шапка и подвал не считаются: ссылка «Оплата» в футере есть на каждом
 * маршруте, и проверка по всему HTML выполнялась бы всегда — даже если
 * контентный шаг оплаты удалён или уехал в условно-рендеримую ветку клиентского
 * компонента (находка независимого ревью 2026-08-30, important).
 */
function payLinksInBody(rawHtml) {
  const visible = stripInertRegions(rawHtml);
  const body = stripChrome(visible);
  return {
    // Если вырезать было нечего, проверка «ссылка в теле» молча вырождается в
    // проверку по всей странице — то самое no-op, ради устранения которого она
    // и написана. Такой случай объявляется отдельно, а не считается успехом
    // (находка ревью, раунд 2).
    // Признаком «chrome распознан» служит именно ПОДВАЛ: он несёт общую ссылку
    // «Оплата». Сравнение по содержимому (body !== visible) удовлетворялось бы
    // и контентными <header> внутри секций.
    chromeFound: countFooters(visible) > 0,
    links: parseAnchors(body).filter(
      (anchor) => normalizePath(pathOf(anchor.href) ?? "") === PAY_ROUTE,
    ).length,
  };
}

/** Путь ссылки относительно canonical; null — внешний или неразбираемый адрес. */
function pathOf(href, base = `${canonicalOrigin}/`) {
  if (!href) return null;
  try {
    const url = new URL(href, base);
    if (url.origin !== canonicalOrigin) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

function isInternalPage(href) {
  if (!href) return false;
  if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  const path = pathOf(href);
  if (path === null) return false;
  // Файлы и служебные пути смотреть незачем: проверяются страницы.
  return !/\.(png|jpe?g|svg|webp|ico|xml|txt|pdf|json)$/i.test(path);
}

async function checkInternalLinks(route, rawHtml) {
  // Ссылки из комментариев и <template> пользователь не видит: проверять их —
  // лишние запросы и возможный ложный красный (находка ревью, minor).
  const html = stripInertRegions(rawHtml);
  const seen = new Set();
  for (const anchor of parseAnchors(html)) {
    if (!isInternalPage(anchor.href)) continue;
    const path = normalizePath(pathOf(anchor.href) ?? "");
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const response = await fetchWithRetry(`${canonicalOrigin}${path}`, { method: "GET" });
    if (response.status >= 400) {
      fail(route, `внутренняя ссылка ${path} отдаёт ${response.status}`);
    }
  }
  return seen.size;
}

// --- Слой 3: демо-цифры помечены как демонстрационные -----------------------

/**
 * Каждый размеченный блок демо-цифр обязан нести непустой дисклеймер. Полное
 * отсутствие разметки во ВСЕЙ выборке — тоже находка: иначе проверка
 * вырождается в «ничего не размечено, значит всё хорошо».
 *
 * ЗАЯВЛЕННАЯ ГРАНИЦА: машина проверяет размеченные блоки, а не находит
 * неразмеченные — отличить «пример разбора» от отраслевой цифры со сноской
 * может только человек. Новый демонстрационный блок без атрибута останется
 * невидимым для оракула; за это отвечает раунд ревью (находка ревью, minor).
 */
function checkDemoFigures(route, rawHtml) {
  const html = stripInertRegions(rawHtml);
  const blocks = findElementsWithAttribute(html, "data-demo-figures");
  for (const block of blocks) {
    if (block.inner === null) {
      fail(route, "блок демо-цифр не закрыт — дисклеймер проверить нельзя");
      continue;
    }
    const disclaimer = fieldText(block.inner, "data-demo-disclaimer");
    if (!disclaimer) {
      fail(route, "блок демо-цифр без пометки data-demo-disclaimer");
      continue;
    }
    if (disclaimer.length < 20) {
      fail(route, `пометка демо-цифр слишком короткая: «${disclaimer}»`);
    }
  }
  return blocks.length;
}

// --- Прогон ------------------------------------------------------------------

async function main() {
  checkRepoArtifacts();

  const payUrl = `${canonicalOrigin}${PAY_ROUTE}`;
  const { response, html } = await fetchPage(payUrl);
  if (response.status !== 200) {
    fail(PAY_ROUTE, `HTTP ${response.status} — шаг оплаты недоступен клиенту`);
  } else if (assertFinalUrl(PAY_ROUTE, response)) {
    checkPaymentBlock(PAY_ROUTE, html);
    await checkInternalLinks(PAY_ROUTE, html);
  }

  let demoBlocks = 0;
  for (const route of MARKETING_ROUTES) {
    const page = await fetchPage(`${canonicalOrigin}${route}`);
    if (page.response.status !== 200) {
      fail(route, `HTTP ${page.response.status}`);
      continue;
    }
    if (!assertFinalUrl(route, page.response)) continue;

    demoBlocks += checkDemoFigures(route, page.html);

    if (ROUTES_LINKING_TO_PAY.includes(route)) {
      const bodyLinks = payLinksInBody(page.html);
      if (!bodyLinks.chromeFound) {
        fail(
          route,
          "на странице нет <footer> — общая ссылка «Оплата» живёт в нём, и"
          + " проверка «ссылка на /pay в теле страницы» стала бы проверкой по"
          + " всей странице; разметка изменилась, оракул нужно обновить",
        );
      }
      if (bodyLinks.links === 0) {
        fail(
          route,
          `в теле страницы нет ссылки на ${PAY_ROUTE} (ссылка в общем футере не в счёт)`
          + " — воронка обрывается перед оплатой",
        );
      }
    }
  }
  if (demoBlocks === 0) {
    fail(
      "демо-цифры",
      "ни на одном маршруте нет блока data-demo-figures — разметка примеров не заведена,"
      + " и проверка пометок ничего не значит",
    );
  }

  if (failures.length > 0) {
    console.error(`Payment path verification FAILED for ${baseUrl} — находок ${failures.length}:`);
    for (const line of failures) console.error(`  - ${line}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `exit 0: Payment path verification passed for ${baseUrl}`
    + ` (${PAY_ROUTE}, документы в репо, ${demoBlocks} размеченных блоков демо-цифр)`,
  );
}

try {
  await main();
} catch (error) {
  if (error instanceof TransportError) {
    // Канал, а не находка: отдельный код, чтобы гейт не прочитал сетевой сбой
    // как «путь оплаты сломан». НО уже доказанные находки печатаются и решают
    // код выхода: иначе сломанный блок оплаты плюс сетевой сбой на девятом
    // маршруте читались бы как «повтори позже», а находка терялась молча
    // (находка независимого ревью, important).
    if (failures.length > 0) {
      console.error(
        `Payment path verification FAILED for ${baseUrl} — находок ${failures.length}`
        + " (прогон прерван транспортом, часть проверок не выполнена):",
      );
      for (const line of failures) console.error(`  - ${line}`);
      console.error(`ТРАНСПОРТ (оборвал прогон): ${error.message}`);
      process.exit(1);
    }
    console.error(`ТРАНСПОРТ (не находка юнита): ${error.message}`);
    process.exit(3);
  }
  throw error;
}
