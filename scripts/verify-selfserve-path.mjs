/**
 * Оракул self-serve пути: стадии order (G-018) и pair (G-018b).
 *
 * Использование:
 *   node scripts/verify-selfserve-path.mjs --stage=order|pair [--base-url URL | --fixture-dir DIR]
 *                                          [--checkout dark|live] [--repo-root DIR] [--repo-only]
 *
 * ===== --stage=order (G-018, verified 2026-09-04) =====
 * Слой РЕПО (без сети; работает в isolated-staged-tree):
 *   - миграция 026: таблица package_orders, run_audit в CHECK jobs.type,
 *     yukassa_payment_id UNIQUE, инвариант «job только у оплаченного»;
 *   - реестр пакетов server-authoritative: audit_start = 7 900 (заморозка цен);
 *   - POST /api/orders: pre-flight до платежа (decidePreflight), Idempotence-Key
 *     на платёж, dark-гейт (404 без флага); GET /api/orders/[id]: auth-гейт;
 *   - webhook: ветка пакетного платежа через parsePackageMetadata и
 *     идемпотентная постановка job (mayEnqueueAuditJob);
 *   - флаг checkout: lib/checkout.ts, подключён к /pricing и /audit;
 *   - хардкод NICHE_NAMES из /api/audit удалён;
 *   - оферта: пункт автоматического возврата за пакет (B-024).
 * Слой ЖИВОЙ (--base-url; штатно — с прод-сервера) в режиме --checkout dark
 * (по умолчанию; live — после решения владельца в AF-1):
 *   - /pricing и /audit: CTA пакета ведёт на /launch (dark) или /order/audit-start (live);
 *   - /order/audit-start: 404 (dark) / 200 (live);
 *   - POST /api/orders пустым JSON: 404 (dark) / 400 (live) — никогда не 500 и
 *     никогда не создаёт платёж;
 *   - GET /api/orders/<uuid> без сессии: 401 (owner-only гейт);
 *   - POST /api/webhooks/yukassa пустым JSON: 4xx, не 404;
 *   - /terms: разметка data-terms-auto-refund="audit_start".
 *
 * ===== --stage=pair (G-018b, план утверждён 2026-09-04) =====
 * Producer-first: оракул написан ДО кода и на HEAD шага 1 красный ровно с шестью
 * именованными находками (по одной на шаг 2-6 плана: migration, shared, api-orders,
 * api-health, worker, ui). Каждая группа гасится своим шагом.
 * Слой РЕПО:
 *   - migration 027: local_verticals (3 вертикали × 8 шаблонов с «{город}»,
 *     CHECK local_verticals_templates_8), niches.city/vertical/demand_status,
 *     CHECK niches_local_pair_shape («пара ⇒ city и id с префиксом b»),
 *     pair_requests (UNIQUE niche_id+email); cron 003 НЕ изменён — пары
 *     рождаются с is_active=false и в weekly-demand не попадают по построению;
 *   - shared pairs/: normalizeCity, buildPairSlug, buildPairId,
 *     expandSeedTemplates, PAIR_MIN_QUESTIONS = 10, decidePairPreflight,
 *     decideOnDemandOutcome; экспорт из index.ts;
 *   - POST /api/orders: ветка vertical → local_verticals → decidePairPreflight
 *     РАНЬШЕ 202 collecting и РАНЬШЕ insert package_orders («данные раньше
 *     денег»), job collect_demand mode:"on_demand", pair_requests, новая пара
 *     is_active: false;
 *   - /api/health: блок local_pairs;
 *   - worker collect-demand: режим on_demand, demand_status, письмо
 *     signInWithOtp, find_gaps только вне on_demand (guard `if (!onDemand)`);
 *   - UI /order/audit-start: select name="vertical" из local_verticals,
 *     экран data-pair-status.
 * Слой ЖИВОЙ (dark по умолчанию):
 *   - POST /api/orders пустым JSON: 404 (dark) / 400 (live), не 500;
 *   - /order/audit-start: 404 (dark) / 200 (live);
 *   - /api/health: local_pairs {total, active, collecting, filled, empty} —
 *     числа; active === 0, пока владелец не активировал пары после канарейки
 *     (обход — SELFSERVE_PAIRS_ACTIVATED=1);
 *   - POST /api/orders с канареечным заголовком и неизвестной вертикалью → 400
 *     (живой режим — только если в env есть SELFSERVE_CANARY_TOKEN; фикстура
 *     orders-post-vertical.json обязательна).
 *
 * ЗАЯВЛЕННАЯ ГРАНИЦА: оракул не создаёт заказы, пары и платежи, не дёргает
 * провайдеров спроса и не эмулирует webhook — сквозные канарейки выполняются
 * отдельно и читаются из health/БД. Оракул судит наличие, разметку, порядок
 * вызовов и коды ответов, не смысл.
 *
 * Коды выхода: 0 чисто; 1 находки (доминируют над транспортом); 2 usage;
 * 3 транспорт (живой контур недоступен при чистом репо-слое).
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KNOWN = new Set(["--stage", "--base-url", "--fixture-dir", "--checkout", "--repo-root", "--repo-only"]);
const STAGES = ["order", "pair"];
const argv = process.argv.slice(2);
const opts = { stage: null, baseUrl: null, fixtureDir: null, checkout: "dark", repoRoot: null, repoOnly: false };
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  const [flag, inline] = a.includes("=") ? a.split(/=(.*)/s) : [a, undefined];
  if (!KNOWN.has(flag)) { console.error(`usage: неизвестный флаг ${a}`); process.exit(2); }
  const value = () => (inline !== undefined ? inline : argv[++i]);
  if (flag === "--stage") opts.stage = value();
  else if (flag === "--base-url") opts.baseUrl = value();
  else if (flag === "--fixture-dir") opts.fixtureDir = value();
  else if (flag === "--checkout") opts.checkout = value();
  else if (flag === "--repo-root") opts.repoRoot = value();
  else if (flag === "--repo-only") opts.repoOnly = true;
}
if (!STAGES.includes(opts.stage)) { console.error(`usage: --stage=${STAGES.join("|")} (delivery — юнит G-019)`); process.exit(2); }
if (!["dark", "live"].includes(opts.checkout)) { console.error("usage: --checkout dark|live"); process.exit(2); }
if (opts.fixtureDir && opts.baseUrl) { console.error("usage: --fixture-dir и --base-url взаимоисключающи"); process.exit(2); }

const repoRoot = opts.repoRoot ? resolve(opts.repoRoot) : resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = (opts.baseUrl || process.env.SELFSERVE_URL || process.env.CANONICAL_URL || "").replace(/\/+$/, "");
if (!opts.repoOnly && !opts.fixtureDir && !baseUrl) {
  console.error("usage: нужен --base-url / SELFSERVE_URL / CANONICAL_URL, --fixture-dir или явный --repo-only");
  process.exit(2);
}

const findings = [];
const finding = (where, why, fix) => findings.push(`${where}: ${why} — FIX: ${fix}`);
const readRepo = (rel) => { const p = join(repoRoot, rel); return existsSync(p) ? readFileSync(p, "utf8") : null; };
function requireContains(rel, needles, fix) {
  const text = readRepo(rel);
  if (text === null) { finding(rel, "файл отсутствует", fix); return; }
  for (const [needle, label] of needles) {
    if (!text.includes(needle)) finding(rel, `нет «${label}»`, fix);
  }
}
/**
 * Группа = один шаг плана = ОДНА находка, какие бы needles ни отсутствовали.
 * files: [[rel, [[needle, label], ...]], ...]; order: [[rel, before, after, label], ...]
 * (индекс `before` обязан быть меньше индекса `after`).
 */
function requireGroup(name, files, fix, order = []) {
  const missing = [];
  for (const [rel, needles] of files) {
    const text = readRepo(rel);
    if (text === null) { missing.push(`${rel}: файл отсутствует`); continue; }
    for (const [needle, label] of needles) if (!text.includes(needle)) missing.push(`${rel}: нет «${label}»`);
    for (const [orel, before, after, label] of order) {
      if (orel !== rel) continue;
      const i = text.indexOf(before), j = text.indexOf(after);
      if (i >= 0 && j >= 0 && i > j) missing.push(`${rel}: порядок нарушен — ${label}`);
    }
  }
  if (missing.length > 0) finding(`[${name}]`, missing.join("; "), fix);
}

// ============================================================ РЕПО: order
function repoOrder() {
  requireContains("packages/supabase/migrations/026_package_orders.sql", [
    ["CREATE TABLE IF NOT EXISTS public.package_orders", "таблица package_orders"],
    ["'run_audit'", "run_audit в CHECK jobs.type"],
    ["yukassa_payment_id  TEXT UNIQUE", "yukassa_payment_id UNIQUE"],
    ["package_orders_job_requires_paid", "инвариант job только у оплаченного"],
  ], "миграция 026 — схема автономного заказа (контракт G-018, шаг 1)");

  requireContains("packages/shared/src/orders/packages.ts", [
    ["amountRub: 7900", "audit_start = 7 900 ₽"],
    ["Object.freeze", "реестр заморожен"],
  ], "server-authoritative реестр пакетов; цены заморожены до AF-1-COMM");

  requireContains("apps/web/app/api/orders/route.ts", [
    ["decidePreflight(", "pre-flight до платежа"],
    ["\"Idempotence-Key\"", "Idempotence-Key на платёж"],
    ["status: 404", "dark-гейт 404"],
    ["api.yookassa.ru/v3/payments", "создание платежа ЮKassa"],
  ], "POST /api/orders по контракту §6: pre-flight → пользователь → заказ → платёж");

  requireContains("apps/web/app/api/orders/[id]/route.ts", [
    ["auth.getUser()", "auth-гейт"],
    ["owner_id !== user.id", "owner-only"],
  ], "GET /api/orders/[id] — только владелец");

  requireContains("apps/web/app/api/webhooks/yukassa/route.ts", [
    ["parsePackageMetadata(", "ветка пакетного платежа"],
    ["mayEnqueueAuditJob(", "идемпотентная постановка job"],
    ["type: \"run_audit\"", "job run_audit"],
    [".is(\"job_id\", null)", "guard job_id IS NULL"],
  ], "webhook: paid + run_audit ровно один раз");

  requireContains("apps/web/lib/checkout.ts", [["SELF_SERVE_CHECKOUT", "серверный флаг checkout"]],
    "включение checkout — одной серверной переменной, атомарно");
  requireContains("apps/web/app/(marketing)/pricing/page.tsx", [["auditStartHref", "CTA по флагу"]], "CTA /pricing переключается флагом");
  requireContains("apps/web/app/(marketing)/audit/page.tsx", [["auditStartHref", "CTA по флагу"]], "CTA /audit переключается флагом");
  requireContains("apps/web/app/(marketing)/terms/page.tsx", [["data-terms-auto-refund=\"audit_start\"", "пункт автоматического возврата"]],
    "оферта: автоматический возврат за пакет (B-024)");
  const audit = readRepo("apps/web/app/api/audit/route.ts");
  if (audit === null) finding("apps/web/app/api/audit/route.ts", "файл отсутствует", "маршрут аудита обязателен");
  else if (audit.includes("NICHE_NAMES")) finding("apps/web/app/api/audit/route.ts", "хардкод NICHE_NAMES остался", "ниши читаются из таблицы niches (вертикали v1)");
}

// ============================================================ РЕПО: pair
const ORDERS_ROUTE = "apps/web/app/api/orders/route.ts";
const WORKER_COLLECT = "apps/worker/src/jobs/collect-demand.ts";
function repoPair() {
  requireGroup("migration", [
    ["packages/supabase/migrations/027_local_pairs.sql", [
      ["CREATE TABLE IF NOT EXISTS public.local_verticals", "таблица local_verticals"],
      ["local_verticals_templates_8", "CHECK: 8 шаблонов, каждый с {город}"],
      ["('dental'", "вертикаль dental"], ["('clinic'", "вертикаль clinic"], ["('autoservice'", "вертикаль autoservice"],
      ["ADD COLUMN IF NOT EXISTS city", "niches.city"],
      ["ADD COLUMN IF NOT EXISTS vertical", "niches.vertical"],
      ["ADD COLUMN IF NOT EXISTS demand_status", "niches.demand_status"],
      ["niches_local_pair_shape", "CHECK: пара ⇒ city и id с префиксом b"],
      ["CREATE TABLE IF NOT EXISTS public.pair_requests", "таблица pair_requests"],
      ["pair_requests_niche_email", "UNIQUE (niche_id, email)"],
    ]],
    ["packages/supabase/migrations/003_cron_schedules.sql", [
      ["SELECT 'collect_demand', jsonb_build_object('niche_id', id) FROM public.niches WHERE is_active = TRUE", "weekly-demand только по is_active (cron 003 не меняется)"],
    ]],
  ], "шаг 2 плана G-018b: миграция 027 — вертикали как данные, пара с city и is_active=false, cron не трогаем");

  requireGroup("shared", [
    ["packages/shared/src/pairs/index.ts", [
      ["export function normalizeCity", "normalizeCity"],
      ["export function buildPairSlug", "buildPairSlug"],
      ["export function buildPairId", "buildPairId"],
      ["export function buildPairName", "buildPairName"],
      ["export function expandSeedTemplates", "expandSeedTemplates"],
      ["export const PAIR_MIN_QUESTIONS = 10", "порог пары = 10 (questionCount пакета)"],
      ["export function decidePairPreflight", "decidePairPreflight"],
      ["export function decideOnDemandOutcome", "decideOnDemandOutcome (решение worker'а)"],
    ]],
    ["packages/shared/src/index.ts", [["./pairs/index.js", "экспорт pairs из shared"]]],
  ], "шаг 3 плана G-018b: чистые функции пары в shared + тесты node --test");

  requireGroup("api-orders", [
    [ORDERS_ROUTE, [
      ["body.vertical", "ветка vertical в теле"],
      [".from(\"local_verticals\")", "вертикаль из таблицы, не из кода"],
      ["decidePairPreflight(", "pre-flight по паре"],
      ["status: 202", "202 collecting/empty"],
      [".from(\"pair_requests\")", "запись ожидающего email"],
      ["mode: \"on_demand\"", "job collect_demand в режиме on_demand"],
      ["is_active: false", "новая пара вне cron (is_active=false)"],
    ]],
  ], "шаг 4 плана G-018b: POST /api/orders — ensure-pair → pre-flight → платёж только при ready, иначе 202", [
    [ORDERS_ROUTE, "decidePairPreflight(", "status: 202", "pre-flight пары раньше ответа 202"],
    [ORDERS_ROUTE, "decidePairPreflight(", ".from(\"package_orders\")", "pre-flight пары раньше записи заказа («данные раньше денег»)"],
  ]);

  requireGroup("api-health", [
    ["apps/web/app/api/health/route.ts", [["local_pairs", "блок local_pairs"]]],
  ], "шаг 4 плана G-018b: /api/health отдаёт local_pairs {total, active, collecting, filled, empty}");

  requireGroup("worker", [
    [WORKER_COLLECT, [
      ["\"on_demand\"", "режим on_demand"],
      ["demand_status", "статус пары filled/empty"],
      ["signInWithOtp", "письмо-ссылка ожидающим"],
      ["if (!onDemand)", "guard: find_gaps только вне on_demand"],
      ["type: \"find_gaps\"", "cron-режим по-прежнему ставит find_gaps"],
    ]],
  ], "шаг 5 плана G-018b: collect_demand on_demand без хвоста expand_query", [
    [WORKER_COLLECT, "if (!onDemand)", "type: \"find_gaps\"", "guard стоит перед постановкой find_gaps"],
  ]);

  requireGroup("ui", [
    ["apps/web/app/(marketing)/order/audit-start/order-form.tsx", [
      ["name=\"vertical\"", "select вертикали"],
      ["data-pair-status", "экран «готовим замер»"],
    ]],
    ["apps/web/app/(marketing)/order/audit-start/page.tsx", [[".from(\"local_verticals\")", "вертикали из таблицы"]]],
  ], "шаг 6 плана G-018b: форма из трёх вертикалей + город + email, экран collecting");
}

if (opts.stage === "order") repoOrder(); else repoPair();

// ============================================================ ЖИВОЙ
const transport = [];
const MAX_ATTEMPTS = Number(process.env.SELFSERVE_ATTEMPTS || 4);
const RETRY_MS = Number(process.env.SELFSERVE_RETRY_DELAY_MS || 1500);
const TIMEOUT_MS = Number(process.env.SELFSERVE_TIMEOUT_MS || 20_000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchRetry(url, init) {
  let last;
  for (let i = 1; i <= MAX_ATTEMPTS; i += 1) {
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), TIMEOUT_MS);
      try { return await fetch(url, { ...init, signal: c.signal }); } finally { clearTimeout(t); }
    } catch (e) { last = e; if (i < MAX_ATTEMPTS) await sleep(RETRY_MS); }
  }
  throw last;
}
const fx = (name) => { if (!opts.fixtureDir) return null; const p = join(opts.fixtureDir, name); return existsSync(p) ? readFileSync(p, "utf8") : null; };
async function getStatus(route, init, fixtureName) {
  if (opts.fixtureDir) {
    const raw = fx(fixtureName);
    if (raw === null) { finding(`fixture:${fixtureName}`, "фикстура отсутствует", "положить в --fixture-dir"); return null; }
    return Number(JSON.parse(raw).status);
  }
  return (await fetchRetry(`${baseUrl}${route}`, init)).status;
}
async function getHtml(route, fixtureName) {
  if (opts.fixtureDir) {
    const raw = fx(fixtureName);
    if (raw === null) { finding(`fixture:${fixtureName}`, "фикстура отсутствует", "положить в --fixture-dir"); return null; }
    return raw;
  }
  const res = await fetchRetry(`${baseUrl}${route}`, { method: "GET" });
  if (!res.ok) { finding(route, `HTTP ${res.status}`, "страница обязана отвечать 200"); return null; }
  return res.text();
}
async function getJson(route, fixtureName) {
  const raw = opts.fixtureDir ? fx(fixtureName) : null;
  if (opts.fixtureDir && raw === null) { finding(`fixture:${fixtureName}`, "фикстура отсутствует", "положить в --fixture-dir"); return null; }
  const text = opts.fixtureDir ? raw : await (await fetchRetry(`${baseUrl}${route}`, { method: "GET" })).text();
  try { return JSON.parse(text); } catch { finding(route, "ответ не JSON", "health обязан отдавать JSON"); return null; }
}

const dark = () => opts.checkout === "dark";
async function checkOrderPageAndEmptyPost() {
  const orderPage = await getStatus("/order/audit-start", { method: "GET", redirect: "manual" }, "order-page.json");
  if (orderPage !== null) {
    if (dark() && orderPage !== 404) finding("/order/audit-start", `HTTP ${orderPage} при dark`, "страница заказа обязана отвечать 404 до включения checkout");
    if (!dark() && orderPage !== 200) finding("/order/audit-start", `HTTP ${orderPage} при live`, "страница заказа обязана отвечать 200");
  }
  const post = await getStatus("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }, "orders-post.json");
  if (post !== null) {
    if (post >= 500) finding("POST /api/orders", `пустой запрос валит маршрут (HTTP ${post})`, "валидация до любых записей и платежей");
    else if (dark() && post !== 404) finding("POST /api/orders", `HTTP ${post} при dark`, "без флага и канареечного заголовка — 404");
    else if (!dark() && post !== 400) finding("POST /api/orders", `HTTP ${post} при live`, "пустое тело — 400, платёж не создаётся");
  }
}

async function liveOrder() {
  const expectHref = dark() ? "/launch?package=audit_start" : "/order/audit-start";
  const forbidHref = dark() ? "/order/audit-start" : "/launch?package=audit_start";
  for (const [route, fixture] of [["/pricing", "pricing.html"], ["/audit", "audit.html"]]) {
    const html = await getHtml(route, fixture);
    if (html === null) continue;
    if (!html.includes(expectHref)) finding(route, `нет CTA пакета на ${expectHref}`, `режим checkout=${opts.checkout}: CTA обязан вести туда`);
    if (html.includes(`href="${forbidHref}"`)) finding(route, `CTA ведёт на ${forbidHref} при checkout=${opts.checkout}`, "публичное включение checkout — только флагом и решением владельца (AF-1)");
  }
  await checkOrderPageAndEmptyPost();
  const get = await getStatus("/api/orders/00000000-0000-4000-8000-000000000000", { method: "GET" }, "orders-get.json");
  if (get !== null && get !== 401) finding("GET /api/orders/[id]", `HTTP ${get} без сессии`, "owner-only: без сессии 401");
  const wh = await getStatus("/api/webhooks/yukassa", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }, "webhook.json");
  if (wh !== null) {
    if (wh === 404) finding("/api/webhooks/yukassa", "маршрут отсутствует (404)", "webhook кассы обязан существовать");
    else if (wh >= 500 || wh < 400) finding("/api/webhooks/yukassa", `пустой запрос -> HTTP ${wh}`, "мусор отвергается 4xx");
  }
  const terms = await getHtml("/terms", "terms.html");
  if (terms !== null && !terms.includes('data-terms-auto-refund="audit_start"')) {
    finding("/terms", "нет пункта автоматического возврата за пакет", "оферта обязана обещать авто-возврат (контракт §6, B-024)");
  }
}

const PAIR_COUNTERS = ["total", "active", "collecting", "filled", "empty"];
async function livePair() {
  await checkOrderPageAndEmptyPost();
  const health = await getJson("/api/health", "health.json");
  if (health !== null) {
    const lp = health.local_pairs;
    if (!lp || typeof lp !== "object") finding("/api/health", "нет блока local_pairs", "health обязан считать пары (шаг 4 плана G-018b)");
    else {
      for (const k of PAIR_COUNTERS) if (typeof lp[k] !== "number") finding("/api/health", `local_pairs.${k} не число`, "все пять счётчиков — числа");
      if (typeof lp.active === "number" && lp.active > 0 && process.env.SELFSERVE_PAIRS_ACTIVATED !== "1") {
        finding("/api/health", `local_pairs.active = ${lp.active}`, "пары включаются в cron только решением владельца после зелёной канарейки (§5); подтверждение — SELFSERVE_PAIRS_ACTIVATED=1");
      }
    }
  }
  const token = process.env.SELFSERVE_CANARY_TOKEN;
  if (opts.fixtureDir || token) {
    const bad = await getStatus("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json", "x-selfserve-canary": token ?? "" },
      body: JSON.stringify({ vertical: "nope", city: "Тюмень", email: "oracle@example.com" }),
    }, "orders-post-vertical.json");
    if (bad !== null && bad !== 400) finding("POST /api/orders {vertical:nope}", `HTTP ${bad}`, "неизвестная вертикаль — 400 до любых записей; пара не создаётся");
  }
}

if (!opts.repoOnly) {
  try { await (opts.stage === "order" ? liveOrder() : livePair()); } catch (e) { transport.push(e instanceof Error ? e.message : String(e)); }
}

if (findings.length > 0) {
  for (const f of findings) console.error(f);
  console.error(`\n${findings.length} finding(s).`);
  if (transport.length > 0) console.error(`transport (дополнительно): ${transport.join("; ")}`);
  process.exit(1);
}
if (transport.length > 0) { console.error(`transport: живой контур недоступен: ${transport.join("; ")}`); process.exit(3); }
console.log(`Self-serve ${opts.stage} stage verification passed for ${opts.repoOnly ? "repo-only" : (opts.fixtureDir ? `fixtures:${opts.fixtureDir}` : baseUrl)} (checkout=${opts.checkout})`);
