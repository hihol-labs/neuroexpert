#!/usr/bin/env node
/**
 * verify-proof-layer.mjs — оракул юнита G-013 «Proof-слой: пример отчёта, единая
 * CTA-цепочка, задел под кейсы».
 *
 * Слой РЕПО (всегда):
 *   - фикстура apps/web/content/example-report.json: реальный снапшот отчёта (форма
 *     продюсера packages/shared delivery: schema_version 1, 10 gaps, platforms_tried) +
 *     meta {pair, mode, ran_at, source_note}; без идентификаторов заказа/владельца/email;
 *   - общий рендер apps/web/components/report/report-view.tsx с секциями структуры v2
 *     (intents, visibility, domains, plan) и v2-заглушками с пометкой (price-flag,
 *     entry-points, before-after); страница заказа /orders/[id] использует ReportView,
 *     inline-рендер удалён;
 *   - публичная страница apps/web/app/(marketing)/audit/example/page.tsx: ReportView по
 *     фикстуре, дата/режим/дисклеймер, OfferBlock с auditStartHref, блок кейсов;
 *   - ProofStrip (example/lead/order) рендерится из OfferBlock → на всех 9 маршрутах;
 *   - в how-it-works и for-business нет захардкоженного /launch?package=audit_start;
 *   - middleware PUBLIC_ROUTES и sitemap содержат /audit/example;
 *   - apps/web/content/cases.ts: типизированный шаблон CaseStudy, при пустом CASES
 *     страница примера показывает честное пустое состояние без чисел.
 *
 * ЖИВОЙ КОНТУР (--base-url / PROOF_URL / CANONICAL_URL) или --fixture-dir:
 *   - /audit/example → 200, data-example-report, data-example-mode ∈ {full,degraded},
 *     data-example-date, data-example-disclaimer, 7 секций data-report-section, ≥3
 *     data-v2-placeholder, блок data-cases с пустым состоянием без цифр (или кейсами),
 *     блок data-offer;
 *   - 9 маршрутов воронки: data-proof-link example → /audit/example, lead → /audit|/scan,
 *     order → один и тот же href на всех маршрутах (при --checkout live — /order/audit-start).
 *   Фикстуры: example.html и <route>.html ("/" → index.html).
 *
 * Exit: 0 — чисто; 1 — находки; 2 — usage; 3 — только транспорт (репо чисто).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const KNOWN_FLAGS = new Set(["--base-url", "--fixture-dir", "--repo-root", "--repo-only", "--checkout"]);
const argv = process.argv.slice(2);
let baseUrlArg = null, fixtureDir = null, repoRootArg = null, repoOnly = false, checkout = null;
for (let i = 0; i < argv.length; i += 1) {
  const flag = argv[i];
  if (!KNOWN_FLAGS.has(flag)) { console.error(`usage: неизвестный флаг ${flag}`); process.exit(2); }
  if (flag === "--base-url") { baseUrlArg = argv[++i] ?? null; continue; }
  if (flag === "--fixture-dir") { fixtureDir = argv[++i] ?? null; continue; }
  if (flag === "--repo-root") { repoRootArg = argv[++i] ?? null; continue; }
  if (flag === "--repo-only") { repoOnly = true; continue; }
  if (flag === "--checkout") { checkout = argv[++i] ?? null; continue; }
}
if (fixtureDir && baseUrlArg) { console.error("usage: --fixture-dir и --base-url взаимоисключающи"); process.exit(2); }
if (checkout && checkout !== "live" && checkout !== "dark") { console.error("usage: --checkout live|dark"); process.exit(2); }

const repoRoot = repoRootArg ? resolve(repoRootArg) : resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = (baseUrlArg || process.env.PROOF_URL || process.env.CANONICAL_URL || "").replace(/\/+$/, "");
if (!repoOnly && !fixtureDir && !baseUrl) {
  repoOnly = true;
  console.error("note: живой адрес не задан (--base-url / PROOF_URL / CANONICAL_URL) — проверяется только слой репо");
}

const MAX_ATTEMPTS = Number(process.env.PROOF_ATTEMPTS || 4);
const RETRY_DELAY_MS = Number(process.env.PROOF_RETRY_DELAY_MS || 1500);
const REQUEST_TIMEOUT_MS = Number(process.env.PROOF_TIMEOUT_MS || 20_000);

export const FUNNEL_ROUTES = ["/", "/for-business", "/for-experts", "/for-agencies", "/how-it-works", "/launch", "/pricing", "/scan", "/audit"];
export const EXAMPLE_ROUTE = "/audit/example";
export const REPORT_SECTIONS = ["intents", "visibility", "domains", "plan", "v2-price-flag", "v2-entry-points", "v2-before-after"];
const LEAD_HREFS = new Set(["/audit", "/scan"]);
const ORDER_HREFS = new Set(["/order/audit-start", "/launch?package=audit_start"]);

const findings = [];
function finding(where, why, fix) { findings.push(`${where}: ${why} — FIX: ${fix}`); }

// ============================================================ Слой РЕПО
function readRepoFile(rel) {
  const abs = join(repoRoot, rel);
  return existsSync(abs) ? readFileSync(abs, "utf8") : null;
}
function requireContains(rel, pairs, fix) {
  const text = readRepoFile(rel);
  if (text === null) { finding(rel, "файл отсутствует", fix); return null; }
  for (const [marker, label] of pairs) {
    const ok = marker instanceof RegExp ? marker.test(text) : text.includes(marker);
    if (!ok) finding(rel, `нет «${label}» (${marker instanceof RegExp ? marker.source : marker})`, fix);
  }
  return text;
}
function requireAbsent(rel, marker, why, fix) {
  const text = readRepoFile(rel);
  if (text !== null && text.includes(marker)) finding(rel, why, fix);
}

const FIXTURE = "apps/web/content/example-report.json";
const REPORT_VIEW = "apps/web/components/report/report-view.tsx";
const EXAMPLE_PAGE = "apps/web/app/(marketing)/audit/example/page.tsx";
const PROOF_STRIP = "apps/web/components/marketing/proof-strip.tsx";
const OFFER = "apps/web/components/marketing/offer.tsx";
const ORDER_PAGE = "apps/web/app/orders/[id]/page.tsx";
const CASES = "apps/web/content/cases.ts";
const PII_RE = /[\w.+-]+@[\w-]+\.[\w.]+|owner_id|order_id|yukassa/i;

async function checkFixture() {
  const raw = readRepoFile(FIXTURE);
  if (raw === null) { finding(FIXTURE, "фикстура примера отсутствует", "scripts/export-example-report.mjs → реальный снапшот без идентификаторов"); return; }
  let data;
  try { data = JSON.parse(raw); } catch { finding(FIXTURE, "невалидный JSON", "перегенерировать фикстуру"); return; }
  const meta = data.meta ?? {}, report = data.report;
  if (!meta.pair || !meta.ran_at || !["full", "degraded"].includes(meta.mode) || !meta.source_note) {
    finding(FIXTURE, "meta без pair/ran_at/mode(full|degraded)/source_note", "пример обязан нести дату, режим и происхождение данных");
  }
  if (PII_RE.test(raw)) finding(FIXTURE, "в фикстуре есть email/идентификаторы заказа", "снапшот публикуется без owner_id/order_id/email/платёжных полей");
  if (!report || typeof report !== "object") { finding(FIXTURE, "нет report", "фикстура = {meta, report: ReportSnapshot}"); return; }
  const dist = join(repoRoot, "packages/shared/dist/delivery/index.js");
  if (existsSync(dist)) {
    try {
      const mod = await import(pathToFileURL(dist).href);
      const snap = mod.buildReportSnapshot(report);
      if (snap.gaps.length !== 10) finding(FIXTURE, "в отчёте не 10 вопросов", "Audit Start = 10 вопросов");
      if (mod.decideDeliveryMode(report) !== meta.mode) finding(FIXTURE, `meta.mode=${meta.mode} не совпадает с decideDeliveryMode`, "режим примера считается продюсером, не пишется руками");
    } catch (err) {
      finding(FIXTURE, `report не проходит buildReportSnapshot продюсера: ${err instanceof Error ? err.message : err}`, "фикстура — реальный снапшот из package_orders.report");
    }
  } else if (report.schema_version !== 1 || !Array.isArray(report.gaps) || report.gaps.length !== 10 || !Array.isArray(report.platforms_tried) || !report.platforms_tried.length) {
    finding(FIXTURE, "report не похож на ReportSnapshot v1 (schema_version 1, 10 gaps, platforms_tried)", "фикстура — реальный снапшот продюсера");
  }
}

function checkRepo() {
  requireContains(REPORT_VIEW, [
    ["export function ReportView", "общий компонент ReportView"],
    ...REPORT_SECTIONS.map((s) => [`data-report-section="${s}"`, `секция ${s}`]),
    ["data-v2-placeholder", "пометка разделов v2 без данных"],
    ["отчёте v2", "текст пометки «появится в отчёте v2»"],
  ], "один рендер отчёта для владельца заказа и публичного примера (структура v2 поверх данных v1)");
  const orderPage = requireContains(ORDER_PAGE, [["<ReportView", "ReportView на странице заказа"]], "страница заказа рендерит отчёт тем же компонентом, что и пример");
  if (orderPage && /report\.gaps\.map\(/.test(orderPage)) finding(ORDER_PAGE, "inline-рендер отчёта остался", "весь рендер — в ReportView");
  requireContains(EXAMPLE_PAGE, [
    ["<ReportView", "ReportView"],
    ["example-report.json", "импорт фикстуры"],
    ["data-example-report", "маркер страницы примера"],
    ["data-example-mode", "маркер режима"],
    ["data-example-date", "маркер даты замера"],
    ["data-example-disclaimer", "дисклеймер"],
    ["<OfferBlock", "оффер"],
    ["auditStartHref", "CTA заказа через lib/checkout"],
    ["data-cases", "блок кейсов"],
  ], "публичный пример: реальные данные, дата, режим, дисклеймер, оффер, кейсы");
  requireContains(PROOF_STRIP, [
    ['data-proof-link="example"', "ссылка на пример"],
    ['data-proof-link="lead"', "ссылка на лид-магнит"],
    ['data-proof-link="order"', "ссылка на заказ"],
    ["/audit/example", "href примера"],
    ["useOrderHref", "href заказа из серверного контекста checkout"],
  ], "единая цепочка лид-магнит → аудит → оплата");
  // Ссылка заказа не запекается в сборку: серверный layout группы marketing считает
  // auditStartHref() на запрос (force-dynamic) и отдаёт через контекст (класс ошибки 109be20).
  requireContains("apps/web/app/(marketing)/layout.tsx", [
    ["auditStartHref", "auditStartHref в layout"],
    ["<CheckoutHrefProvider", "провайдер ссылки заказа"],
    [/export const dynamic\s*=\s*"force-dynamic"/, "force-dynamic для группы marketing"],
  ], "флаг checkout читается на каждый запрос, не при сборке");
  requireContains(OFFER, [["<ProofStrip", "ProofStrip внутри OfferBlock"]], "ProofStrip подключается через OfferBlock — так он есть на всех 9 маршрутах");
  for (const rel of ["apps/web/app/(marketing)/how-it-works/page.tsx", "apps/web/app/(marketing)/for-business/page.tsx"]) {
    requireAbsent(rel, "/launch?package=audit_start", "CTA ведёт на форму заявки dark-эпохи", "cta href через auditStartHref() (live → /order/audit-start)");
    requireContains(rel, [["auditStartHref", "auditStartHref"]], "CTA аудита — через lib/checkout");
  }
  requireContains("apps/web/middleware.ts", [[`"${EXAMPLE_ROUTE}"`, "публичный маршрут примера"]], "иначе страница уйдёт на /login");
  requireContains("apps/web/lib/sitemap-xml.ts", [[EXAMPLE_ROUTE, "пример в sitemap"]], "proof-контент индексируется");
  const cases = requireContains(CASES, [
    ["export interface CaseStudy", "тип CaseStudy"],
    ["before", "поле before"], ["after", "поле after"],
    ["export const CASES", "массив CASES"],
  ], "задел под кейсы: типизированный шаблон «метрика до → после»");
  if (cases && /CASES\s*:\s*CaseStudy\[\]\s*=\s*\[\s*\]/.test(cases)) {
    requireContains(EXAMPLE_PAGE, [["data-cases-empty", "пустое состояние кейсов"]], "при пустом CASES страница показывает честное пустое состояние без чисел");
  }
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
      try { return await fetch(url, { ...init, signal: controller.signal }); } finally { clearTimeout(timer); }
    } catch (err) { lastErr = err; if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS); }
  }
  throw lastErr;
}
export function fixtureNameFor(route) {
  if (route === "/") return "index.html";
  if (route === EXAMPLE_ROUTE) return "example.html";
  return `${route.replace(/^\//, "").replace(/\//g, "-")}.html`;
}
async function getHtml(route) {
  if (fixtureDir) {
    const abs = join(fixtureDir, fixtureNameFor(route));
    if (!existsSync(abs)) { finding(`fixture:${fixtureNameFor(route)}`, "фикстура отсутствует", `положить ${fixtureNameFor(route)} в --fixture-dir`); return null; }
    return readFileSync(abs, "utf8");
  }
  const res = await fetchWithRetry(`${baseUrl}${route}`, { method: "GET", headers: { accept: "text/html" }, redirect: "manual" });
  if (res.status !== 200) { finding(route, `HTTP ${res.status}`, "публичный маршрут обязан отвечать 200"); return null; }
  return res.text();
}
function attr(html, name) {
  const m = html.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
}
function elementText(html, marker) {
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const rest = html.slice(idx);
  const close = rest.search(/<\/(section|div|article|p)>/);
  return (close > 0 ? rest.slice(0, close) : rest.slice(0, 2000)).replace(/<[^>]+>/g, " ");
}
function proofLink(html, kind) {
  const re = new RegExp(`<a[^>]*data-proof-link="${kind}"[^>]*>`, "g");
  const tags = html.match(re) ?? [];
  return tags.map((t) => attr(t, "href")).filter(Boolean);
}

async function checkExample() {
  const html = await getHtml(EXAMPLE_ROUTE);
  if (html === null) return;
  if (!html.includes("data-example-report")) finding(EXAMPLE_ROUTE, "нет data-example-report", "страница примера рендерит ReportView по фикстуре");
  const mode = attr(html, "data-example-mode");
  if (!mode || !["full", "degraded"].includes(mode)) finding(EXAMPLE_ROUTE, `data-example-mode=${mode ?? "нет"}`, "режим замера обязан быть виден: full|degraded");
  const date = attr(html, "data-example-date");
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) finding(EXAMPLE_ROUTE, "нет data-example-date", "пример помечен датой замера");
  if (!html.includes("data-example-disclaimer")) finding(EXAMPLE_ROUTE, "нет дисклеймера", "замер на дату, ответы дословно, не гарантия упоминаний");
  for (const s of REPORT_SECTIONS) if (!html.includes(`data-report-section="${s}"`)) finding(EXAMPLE_ROUTE, `нет секции ${s}`, "структура отчёта v2 поверх данных v1");
  const placeholders = (html.match(/data-v2-placeholder/g) ?? []).length;
  if (placeholders < 3) finding(EXAMPLE_ROUTE, `пометок v2 без данных: ${placeholders} (< 3)`, "флаг цен, 4 точки входа, ДО/ПОСЛЕ — структура с пометкой");
  if (!html.includes("data-offer")) finding(EXAMPLE_ROUTE, "нет блока оффера", "OfferBlock с CTA заказа");
  if (!html.includes("data-cases")) finding(EXAMPLE_ROUTE, "нет блока кейсов", "задел под кейсы обязателен");
  else if (html.includes("data-cases-empty")) {
    const text = elementText(html, "data-cases-empty") ?? "";
    if (/\d/.test(text)) finding(EXAMPLE_ROUTE, "в пустом блоке кейсов есть цифры", "до первого внедрения — никаких чисел до/после");
  } else if (!html.includes("data-case=")) finding(EXAMPLE_ROUTE, "блок кейсов без кейсов и без пустого состояния", "либо кейсы, либо data-cases-empty");
}

async function checkRoutes() {
  const orderHrefs = new Map();
  for (const route of FUNNEL_ROUTES) {
    let html;
    try { html = await getHtml(route); } catch (err) { transportErrors.push(`${route}: ${err instanceof Error ? err.message : String(err)}`); continue; }
    if (html === null) continue;
    const ex = proofLink(html, "example");
    if (!ex.length || !ex.every((h) => h === EXAMPLE_ROUTE)) finding(route, `нет ссылки на пример (${ex.join(",") || "—"})`, `data-proof-link="example" → ${EXAMPLE_ROUTE}`);
    const lead = proofLink(html, "lead");
    if (!lead.length || !lead.every((h) => LEAD_HREFS.has(h))) finding(route, `нет ссылки на лид-магнит (${lead.join(",") || "—"})`, 'data-proof-link="lead" → /audit или /scan');
    const order = proofLink(html, "order");
    if (!order.length || !order.every((h) => ORDER_HREFS.has(h))) finding(route, `нет ссылки на заказ (${order.join(",") || "—"})`, 'data-proof-link="order" → auditStartHref()');
    else orderHrefs.set(route, order[0]);
  }
  const distinct = new Set(orderHrefs.values());
  if (distinct.size > 1) finding("/*", `ссылка заказа разная на маршрутах: ${[...distinct].join(", ")}`, "один auditStartHref() для всех");
  if (checkout === "live" && distinct.size && !distinct.has("/order/audit-start")) finding("/*", "при checkout live ссылка заказа не /order/audit-start", "SELF_SERVE_CHECKOUT=live → auditStartHref() = /order/audit-start");
}

// ============================================================ main
await checkFixture();
checkRepo();
if (!repoOnly) {
  try { await checkExample(); } catch (err) { transportErrors.push(`${EXAMPLE_ROUTE}: ${err instanceof Error ? err.message : String(err)}`); }
  await checkRoutes();
}
const mode = fixtureDir ? "fixtures" : repoOnly ? "repo-only" : baseUrl;
if (findings.length > 0) {
  for (const f of findings) console.error(f);
  console.error(`\n${findings.length} finding(s).`);
  if (transportErrors.length > 0) console.error(`transport (дополнительно): живой контур недоступен: ${transportErrors.join("; ")}`);
  console.error(`Proof-layer verification FAILED for ${mode}`);
  process.exit(1);
}
if (transportErrors.length > 0) {
  console.error(`transport: живой контур недоступен: ${transportErrors.join("; ")}`);
  console.error(`Proof-layer verification UNAVAILABLE for ${mode}`);
  process.exit(3);
}
console.log(`Proof-layer verification passed for ${mode}${checkout ? ` (checkout=${checkout})` : ""}`);
