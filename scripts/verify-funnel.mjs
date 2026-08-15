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
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";

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
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/**
 * Вырезает секцию сайтовой шапки/подвала. Приоритет — по классу сайтового
 * chrome (sr-header/sr-footer): внутри страниц встречаются собственные
 * <header> секций, и первый попавшийся тег может оказаться не тем.
 */
function extractChrome(html, tag, chromeClass) {
  const scoped = new RegExp(`<${tag}\\b[^>]*class="[^"]*${chromeClass}[^"]*"[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const scopedMatch = html.match(scoped);
  if (scopedMatch) return scopedMatch[1];
  const anyMatch = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return anyMatch ? anyMatch[1] : null;
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
function isInternalPage(href) {
  if (/^(mailto:|tel:|javascript:|#)/i.test(href)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return /^https?:/i.test(href) && pathOf(href) !== null;
  return !href.startsWith("//");
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

function checkAuthDeadEnds(route, anchors) {
  for (const anchor of anchors) {
    const path = pathOf(anchor.href);
    if (!path || !AUTH_DEAD_ENDS.includes(path)) continue;
    // Осознанное исключение размечается в разметке, а не в оракуле: правка
    // видна в дифе страницы, а не спрятана в списке внутри гейта.
    if (/\bdata-funnel-exempt\b/i.test(anchor.attrs)) continue;
    const label = anchor.text ? `«${anchor.text}»` : "(без текста)";
    fail(route, `CTA ${label} ведёт на ${anchor.href} — воронка упирается в форму входа`);
  }
}

function checkChromeLinks(route, html) {
  for (const [tag, chromeClass, human] of [["header", "sr-header", "шапке"], ["footer", "sr-footer", "подвале"]]) {
    const section = extractChrome(html, tag, chromeClass);
    if (section === null) {
      fail(route, `не найден <${tag}> — нечем проверить ссылки в ${human}`);
      continue;
    }
    const paths = new Set(parseAnchors(section).map((anchor) => pathOf(anchor.href)).filter(Boolean));
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
 */
function checkClientOnlyDeadEnds() {
  if (process.env.FUNNEL_SKIP_SOURCE === "1") return;
  const roots = ["apps/web/app/(marketing)", "apps/web/components/marketing"];
  // Ловится любая строковая цель, а не только атрибут href="…": CTA часто
  // описан данными (`{ cta: "…", href: "/register?plan=pro" }`) и попадает в
  // разметку через <Link href={offer.href}> — форма, ради которой и заведена
  // эта ступень.
  const pattern = /["'`](\/(?:register|login)(?:[?#][^"'`]*)?)["'`]/g;
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const file of walk(root)) {
      const source = readFileSync(file, "utf8");
      const lines = source.split("\n");
      for (const match of source.matchAll(pattern)) {
        const line = source.slice(0, match.index).split("\n").length;
        // Исключение засчитывается только на СВОЕЙ строке: окно в ±200 символов
        // позволяло соседней размеченной ссылке прикрыть настоящий /register.
        if (/\bdata-funnel-exempt\b/.test(lines[line - 1] ?? "")) continue;
        fail(`${file}:${line}`, `в исходнике маркетинговой страницы CTA ведёт на ${match[1]}`);
      }
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

    checkAuthDeadEnds(route, anchors);
    checkChromeLinks(route, html);
    checkLiveChannel(route, html);
    checkFragmentTargets(route, html, anchors);

    for (const anchor of anchors) {
      if (!isInternalPage(anchor.href)) continue;
      const target = new URL(anchor.href, `${canonicalOrigin}${route}`);
      const key = `${target.pathname}${target.search}`;
      if (!internalTargets.has(key)) internalTargets.set(key, route);
    }
  }

  for (const [target, foundOn] of internalTargets) {
    const url = `${canonicalOrigin}${target}`;
    try {
      const response = await fetchWithRetry(url);
      if (response.status >= 400) {
        fail(foundOn, `внутренняя ссылка ${target} отдаёт HTTP ${response.status}`);
      }
    } catch (error) {
      fail(foundOn, `внутренняя ссылка ${target} не проверена: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  checkClientOnlyDeadEnds();

  if (failures.length) {
    console.error(`Funnel verification FAILED for ${baseUrl} (${ROUTES.length} routes, ${internalTargets.size} internal links)`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`Funnel verification passed for ${baseUrl} (${ROUTES.length} routes, ${internalTargets.size} internal links)`);
  }
}

await main();
