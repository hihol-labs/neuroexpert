#!/usr/bin/env node
/**
 * verify-analytics.mjs — оракул юнита G-012 «Яндекс.Метрика на всех публичных
 * маршрутах с целями на шаги воронки».
 *
 * Слой РЕПО (всегда):
 *   - id счётчика читается из env ровно в одном модуле apps/web/lib/analytics.ts
 *     (NEXT_PUBLIC_YANDEX_METRIKA_ID); числовой id нигде не захардкожен;
 *   - словарь целей YM_GOALS содержит все 8 имён, reachGoal экспортирован;
 *   - компонент apps/web/components/yandex-metrika.tsx: tag.js, webvisor:false,
 *     data-ym-id, hit на смену маршрута (usePathname), cta_order_click, noscript;
 *   - корневой layout подключает <YandexMetrika/> и не содержит inline-сниппета;
 *   - цели вызываются в продюсерах шагов воронки (scan, audit, order-form,
 *     for-agencies, страница заказа);
 *   - сборка: ARG/ENV в web.Dockerfile, build arg в docker-compose.prod.yml,
 *     переменная в .env.example; OPERATIONS.md — раздел про Метрику с regex
 *     AI-сегмента.
 *
 * ЖИВОЙ КОНТУР (--base-url / ANALYTICS_URL / CANONICAL_URL) или --fixture-dir:
 *   - каждый публичный маршрут отдаёт 200 и содержит data-ym-id и noscript-пиксель
 *     mc.yandex.ru/watch/<id>; id одинаковый на всех маршрутах и равен ожидаемому
 *     (--ym-id / YM_ID / NEXT_PUBLIC_YANDEX_METRIKA_ID), если ожидаемый задан.
 *   Фикстуры: <route>.html, где "/" → index.html, "/order/audit-start" →
 *   order-audit-start.html.
 *
 * Exit: 0 — чисто; 1 — находки; 2 — usage; 3 — только транспорт (репо чисто).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KNOWN_FLAGS = new Set(["--base-url", "--fixture-dir", "--repo-root", "--repo-only", "--ym-id"]);

const argv = process.argv.slice(2);
let baseUrlArg = null;
let fixtureDir = null;
let repoRootArg = null;
let repoOnly = false;
let ymIdArg = null;

for (let i = 0; i < argv.length; i += 1) {
  const flag = argv[i];
  if (!KNOWN_FLAGS.has(flag)) {
    console.error(`usage: неизвестный флаг ${flag}`);
    process.exit(2);
  }
  if (flag === "--base-url") { baseUrlArg = argv[++i] ?? null; continue; }
  if (flag === "--fixture-dir") { fixtureDir = argv[++i] ?? null; continue; }
  if (flag === "--repo-root") { repoRootArg = argv[++i] ?? null; continue; }
  if (flag === "--repo-only") { repoOnly = true; continue; }
  if (flag === "--ym-id") { ymIdArg = argv[++i] ?? null; continue; }
}

if (fixtureDir && baseUrlArg) {
  console.error("usage: --fixture-dir и --base-url взаимоисключающи");
  process.exit(2);
}

const repoRoot = repoRootArg
  ? resolve(repoRootArg)
  : resolve(dirname(fileURLToPath(import.meta.url)), "..");

const baseUrl = (baseUrlArg || process.env.ANALYTICS_URL || process.env.CANONICAL_URL || "").replace(/\/+$/, "");
const expectedYmId = (ymIdArg || process.env.YM_ID || process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID || "").trim();

if (!repoOnly && !fixtureDir && !baseUrl) {
  console.error(
    "usage: нужен живой контур (--base-url / ANALYTICS_URL / CANONICAL_URL), "
    + "--fixture-dir для оффлайн-фикстур или явный --repo-only",
  );
  process.exit(2);
}
if (expectedYmId && !/^\d{5,}$/.test(expectedYmId)) {
  console.error("usage: --ym-id должен быть числовым id счётчика");
  process.exit(2);
}

const MAX_ATTEMPTS = Number(process.env.ANALYTICS_ATTEMPTS || 4);
const RETRY_DELAY_MS = Number(process.env.ANALYTICS_RETRY_DELAY_MS || 1500);
const REQUEST_TIMEOUT_MS = Number(process.env.ANALYTICS_TIMEOUT_MS || 20_000);

/** Восемь целей воронки — имена фиксированы и в коде, и в интерфейсе Метрики. */
export const YM_GOAL_NAMES = [
  "lead_scan_submit",
  "lead_audit_submit",
  "order_form_submit",
  "order_checkout_redirect",
  "order_pair_collecting",
  "order_paid",
  "contact_agency_submit",
  "cta_order_click",
];

/** Публичные маршруты (middleware PUBLIC_ROUTES + представители префиксов). */
export const PUBLIC_ROUTES = [
  "/", "/audit", "/pricing", "/for-experts", "/for-business", "/for-agencies", "/how-it-works",
  "/launch", "/find-expert", "/login", "/register", "/terms", "/privacy", "/requisites", "/pay",
  "/scan", "/order/audit-start",
];

const findings = [];
function finding(where, why, fix) {
  findings.push(`${where}: ${why} — FIX: ${fix}`);
}

// ============================================================ Слой РЕПО
function readRepoFile(rel) {
  const abs = join(repoRoot, rel);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf8");
}

function requireContains(rel, pairs, fix) {
  const text = readRepoFile(rel);
  if (text === null) {
    finding(rel, "файл отсутствует", fix);
    return null;
  }
  for (const [marker, label] of pairs) {
    const ok = marker instanceof RegExp ? marker.test(text) : text.includes(marker);
    if (!ok) finding(rel, `нет «${label}» (${marker instanceof RegExp ? marker.source : marker})`, fix);
  }
  return text;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (/\.(tsx?|mjs|js)$/.test(name)) out.push(abs);
  }
  return out;
}

const LIB = "apps/web/lib/analytics.ts";
const COMPONENT = "apps/web/components/yandex-metrika.tsx";
const LAYOUT = "apps/web/app/layout.tsx";

function checkRepo() {
  requireContains(LIB, [
    ["NEXT_PUBLIC_YANDEX_METRIKA_ID", "id счётчика из env"],
    ["export const YM_GOALS", "словарь целей YM_GOALS"],
    ["export function reachGoal", "reachGoal"],
    ["export function ymHit", "ymHit"],
    ["\"hit\"", "вызов ym(id, \"hit\", …)"],
    ...YM_GOAL_NAMES.map((g) => [`${g}:`, `цель ${g}`]),
  ], "единственный модуль аналитики: id из env, типизированные цели, безопасный reachGoal");

  requireContains(COMPONENT, [
    ["mc.yandex.ru/metrika/tag.js", "загрузчик tag.js"],
    [/webvisor\s*:\s*false/, "webvisor выключен (решение владельца 2026-09-06)"],
    ["data-ym-id", "маркер data-ym-id для оракула"],
    ["usePathname", "hit на смену маршрута App Router"],
    ["ymHit(", "вызов ymHit при смене маршрута"],
    ["cta_order_click", "делегированная цель клика по CTA заказа"],
    ["<noscript>", "noscript-пиксель"],
    ["mc.yandex.ru/watch/", "noscript-пиксель watch"],
  ], "клиентский компонент счётчика вместо inline-сниппета");

  const layout = requireContains(LAYOUT, [["<YandexMetrika", "компонент YandexMetrika в корневом layout"]],
    "счётчик подключается в корневом layout через компонент");
  if (layout && layout.includes("mc.yandex.ru")) {
    finding(LAYOUT, "inline-сниппет Метрики остался в layout", "оставить только <YandexMetrika/> — один источник id и настроек");
  }

  // id из env ровно в одном месте: остальные файлы web его не читают и не содержат числового id.
  const webFiles = walk(join(repoRoot, "apps/web"));
  const libAbs = join(repoRoot, LIB);
  for (const abs of webFiles) {
    const rel = abs.slice(repoRoot.length + 1);
    const text = readFileSync(abs, "utf8");
    if (abs !== libAbs && text.includes("NEXT_PUBLIC_YANDEX_METRIKA_ID")) {
      finding(rel, "читает NEXT_PUBLIC_YANDEX_METRIKA_ID напрямую", `id читается только в ${LIB}`);
    }
    if (/\bym\(\s*\d{5,}/.test(text) || /mc\.yandex\.ru\/watch\/\d{5,}/.test(text)) {
      finding(rel, "числовой id счётчика захардкожен", "id только из env через lib/analytics.ts");
    }
  }

  const producers = [
    ["apps/web/app/(marketing)/scan/page.tsx", ["lead_scan_submit"]],
    ["apps/web/app/(marketing)/audit/audit-client.tsx", ["lead_audit_submit"]],
    ["apps/web/app/(marketing)/order/audit-start/order-form.tsx", ["order_form_submit", "order_checkout_redirect", "order_pair_collecting"]],
    ["apps/web/app/(marketing)/for-agencies/page.tsx", ["contact_agency_submit"]],
    ["apps/web/app/orders/[id]/order-paid-goal.tsx", ["order_paid"]],
    ["apps/web/app/orders/[id]/page.tsx", ["<OrderPaidGoal"]],
  ];
  for (const [rel, markers] of producers) {
    requireContains(rel, markers.map((m) => [m, `цель ${m}`]), "цель шага воронки вызывается в продюсере (reachGoal)");
  }

  requireContains("docker/web.Dockerfile", [
    ["ARG NEXT_PUBLIC_YANDEX_METRIKA_ID", "build ARG"],
    ["ENV NEXT_PUBLIC_YANDEX_METRIKA_ID=", "ENV для next build"],
  ], "NEXT_PUBLIC_* запекается при сборке — без ARG счётчик в образе отсутствует");
  requireContains("docker/docker-compose.prod.yml", [[/NEXT_PUBLIC_YANDEX_METRIKA_ID:\s*\$\{NEXT_PUBLIC_YANDEX_METRIKA_ID/, "build arg в compose"]],
    "compose передаёт id в build.args сервиса web");
  requireContains(".env.example", [["NEXT_PUBLIC_YANDEX_METRIKA_ID", "переменная в .env.example"]], "документировать переменную");
  requireContains("OPERATIONS.md", [
    [/##.*Метрик/i, "раздел про Метрику"],
    ["chatgpt", "regex AI-сегмента"],
    ...YM_GOAL_NAMES.map((g) => [g, `цель ${g} описана`]),
  ], "OPERATIONS: где взять id, rebuild web, список целей, regex AI-сегмента, сохранённый отчёт");
}

// ============================================================ ЖИВОЙ КОНТУР
const transportErrors = [];

function sleep(ms) { return new Promise((r) => { setTimeout(r, ms); }); }

async function fetchWithRetry(url, init) {
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        return await fetch(url, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastErr;
}

export function fixtureNameFor(route) {
  return route === "/" ? "index.html" : `${route.replace(/^\//, "").replace(/\//g, "-")}.html`;
}

async function getRouteHtml(route) {
  if (fixtureDir) {
    const abs = join(fixtureDir, fixtureNameFor(route));
    if (!existsSync(abs)) {
      finding(`fixture:${fixtureNameFor(route)}`, "фикстура отсутствует", `положить ${fixtureNameFor(route)} в --fixture-dir`);
      return null;
    }
    return readFileSync(abs, "utf8");
  }
  const res = await fetchWithRetry(`${baseUrl}${route}`, { method: "GET", headers: { accept: "text/html" }, redirect: "manual" });
  if (res.status !== 200) {
    finding(route, `HTTP ${res.status}`, "публичный маршрут обязан отвечать 200 (счётчик проверяется по HTML)");
    return null;
  }
  return res.text();
}

function checkRouteHtml(route, html, seen) {
  const idMatch = html.match(/data-ym-id="(\d{5,})"/);
  if (!idMatch) {
    finding(route, "нет data-ym-id — счётчик не отрендерен", "компонент YandexMetrika в корневом layout, id в env при сборке");
    return;
  }
  const id = idMatch[1];
  seen.add(id);
  if (expectedYmId && id !== expectedYmId) {
    finding(route, `data-ym-id=${id} ≠ ожидаемого ${expectedYmId}`, "образ собран с другим NEXT_PUBLIC_YANDEX_METRIKA_ID — пересобрать web");
  }
  if (!html.includes(`mc.yandex.ru/watch/${id}`)) {
    finding(route, "нет noscript-пикселя mc.yandex.ru/watch/<id>", "компонент обязан рендерить <noscript><img src=…/watch/id></noscript>");
  }
}

async function checkLive() {
  const seen = new Set();
  for (const route of PUBLIC_ROUTES) {
    try {
      const html = await getRouteHtml(route);
      if (html !== null) checkRouteHtml(route, html, seen);
    } catch (err) {
      transportErrors.push(`${route}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (seen.size > 1) {
    finding("/*", `на маршрутах разные id счётчика: ${[...seen].join(", ")}`, "один id из env для всего сайта");
  }
}

// ============================================================ main
checkRepo();
if (!repoOnly) await checkLive();

const mode = fixtureDir ? "fixtures" : repoOnly ? "repo-only" : baseUrl;
if (findings.length > 0) {
  for (const f of findings) console.error(f);
  console.error(`\n${findings.length} finding(s).`);
  if (transportErrors.length > 0) {
    console.error(`transport (дополнительно): живой контур недоступен: ${transportErrors.join("; ")}`);
  }
  console.error(`Analytics verification FAILED for ${mode}`);
  process.exit(1);
}
if (transportErrors.length > 0) {
  console.error(`transport: живой контур недоступен: ${transportErrors.join("; ")}`);
  console.error(`Analytics verification UNAVAILABLE for ${mode}`);
  process.exit(3);
}
console.log(`Analytics verification passed for ${mode}${expectedYmId ? ` (ym-id ${expectedYmId})` : ""}`);
