#!/usr/bin/env node
/**
 * Мутационный тест оракула scripts/verify-proof-layer.mjs (G-013).
 * Зелёное синтетическое репо + зелёные фикстуры → exit 0; каждая мутация → exit 1;
 * мёртвый транспорт при чистом репо → exit 3; usage → exit 2.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const oracle = resolve(here, "..", "verify-proof-layer.mjs");

const SECTIONS = ["intents", "visibility", "domains", "plan", "v2-price-flag", "v2-entry-points", "v2-before-after"];
const ROUTES = ["/", "/for-business", "/for-experts", "/for-agencies", "/how-it-works", "/launch", "/pricing", "/scan", "/audit"];
const fixtureName = (r) => (r === "/" ? "index.html" : r === "/audit/example" ? "example.html" : `${r.replace(/^\//, "").replace(/\//g, "-")}.html`);

const gap = (i) => ({ id: `wordstat-${i}`, source_question_id: `00000000-0000-4000-8000-0000000000${String(i).padStart(2, "0")}`, question: `вопрос ${i}`, search_intent: "informational", monthly_volume: 100, estimated_monthly_volume: 100, collected_at: "2026-09-01T00:00:00Z", collected_at_source: "question", avg_gap_score: 5, platforms: [{ platform: "ChatGPT", status: "answered", ai_response: "ответ", method: "gpt", gap_score: 5, markers: { has_expert_name: false, has_specific_examples: true, has_source_link: false, has_specific_numbers: true }, weakness: "w" }] });
const REPORT = { schema_version: 1, niche: "Стоматология · Тюмень", type: "paid", source: "wordstat", ran_at: "2026-09-06T14:27:58Z", analyzer_model: "gpt", platforms_tried: ["ChatGPT"], gaps: Array.from({ length: 10 }, (_, i) => gap(i + 1)) };
const FIXTURE_JSON = { meta: { pair: "Стоматология × Тюмень", mode: "full", ran_at: REPORT.ran_at, platforms_tried: ["ChatGPT"], source_note: "реальный прогон" }, report: REPORT };

const FILES = {
  "apps/web/content/example-report.json": JSON.stringify(FIXTURE_JSON),
  "apps/web/components/report/report-view.tsx": `export function ReportView() {}\n${SECTIONS.map((s) => `<section data-report-section="${s}" />`).join("\n")}\n<p data-v2-placeholder>появится в отчёте v2</p>\n`,
  "apps/web/app/orders/[id]/page.tsx": "<ReportView report={report} />\n",
  "apps/web/app/(marketing)/audit/example/page.tsx": "import fixture from \"@/content/example-report.json\";\n<ReportView />\n<section data-example-report data-example-mode=\"full\" data-example-date=\"2026-09-06\"><p data-example-disclaimer /></section>\n<OfferBlock cta={{ href: auditStartHref() }} />\n<section data-cases><p data-cases-empty>кейсов пока нет</p></section>\n",
  "apps/web/components/marketing/proof-strip.tsx": "const orderHref = useOrderHref();\n<a data-proof-link=\"example\" href=\"/audit/example\" />\n<a data-proof-link=\"lead\" href=\"/audit\" />\n<a data-proof-link=\"order\" href={orderHref} />\n",
  "apps/web/app/(marketing)/layout.tsx": "export const dynamic = \"force-dynamic\";\n<CheckoutHrefProvider orderHref={auditStartHref()} />\n",
  "apps/web/components/marketing/offer.tsx": "<section data-offer /><ProofStrip />\n",
  "apps/web/app/(marketing)/how-it-works/page.tsx": "cta={{ href: auditStartHref() }}\n",
  "apps/web/app/(marketing)/for-business/page.tsx": "cta={{ href: auditStartHref() }}\n",
  "apps/web/middleware.ts": "const PUBLIC_ROUTES = [\"/audit\", \"/audit/example\"];\n",
  "apps/web/lib/sitemap-xml.ts": "{ loc: `${APP_URL}/audit/example` }\n",
  "apps/web/content/cases.ts": "export interface CaseStudy { pair: string; before: string; after: string }\nexport const CASES: CaseStudy[] = [];\n",
};

const examplePage = (over = {}) => {
  const o = { mode: "full", date: "2026-09-06", disclaimer: "<p data-example-disclaimer>замер на дату</p>", sections: SECTIONS, placeholders: 3, offer: "<section data-offer></section>", cases: "<section data-cases><p data-cases-empty>кейсов пока нет — первый появится после внедрения</p></section>", ...over };
  return `<html><body><main><section data-example-report data-example-mode="${o.mode}" data-example-date="${o.date}">${o.disclaimer}${o.sections.map((s) => `<section data-report-section="${s}"></section>`).join("")}${"<p data-v2-placeholder>появится в отчёте v2</p>".repeat(o.placeholders)}</section>${o.offer}${o.cases}</main></body></html>`;
};
const routePage = (over = {}) => {
  const o = { example: "/audit/example", lead: "/audit", order: "/order/audit-start", ...over };
  return `<html><body><main><section data-offer></section><nav><a data-proof-link="example" href="${o.example}">пример</a><a data-proof-link="lead" href="${o.lead}">карта</a><a data-proof-link="order" href="${o.order}">заказ</a></nav></main></body></html>`;
};

function writeTree(root, files) {
  for (const [rel, content] of Object.entries(files)) { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), content); }
}
function writeFixtures(dir, { example = examplePage(), routes = {} } = {}) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "example.html"), example);
  for (const r of ROUTES) writeFileSync(join(dir, fixtureName(r)), routes[r] ?? routePage());
}
function run(args, env = {}) {
  try { return { code: 0, out: execFileSync(process.execPath, [oracle, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env } }) }; }
  catch (err) { return { code: err.status ?? -1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` }; }
}
const failures = []; let caseNo = 0;
function expect(label, actual, expected, out) {
  caseNo += 1; const ok = actual === expected;
  console.log(`  ${ok ? "OK  " : "FAIL"} [${caseNo}] ${label} -> exit ${actual}`);
  if (!ok) failures.push(`${label}: exit ${actual}, ожидался ${expected}\n${out.slice(0, 600)}`);
}

const work = mkdtempSync(join(tmpdir(), "proof-oracle-"));
try {
  const green = join(work, "green"); writeTree(green, FILES);
  const fx = join(work, "fx"); writeFixtures(fx);
  expect("позитив: repo-only", run(["--repo-only", "--repo-root", green]).code, 0, "");
  expect("позитив: без флагов = repo-only", run(["--repo-root", green], { PROOF_URL: "", CANONICAL_URL: "" }).code, 0, "");
  expect("позитив: фикстуры, checkout live", run(["--repo-root", green, "--fixture-dir", fx, "--checkout", "live"]).code, 0, "");

  const repoMutations = [
    ["фикстура: не 10 вопросов", { "apps/web/content/example-report.json": JSON.stringify({ ...FIXTURE_JSON, report: { ...REPORT, gaps: REPORT.gaps.slice(0, 9) } }) }],
    ["фикстура: meta без режима", { "apps/web/content/example-report.json": JSON.stringify({ ...FIXTURE_JSON, meta: { ...FIXTURE_JSON.meta, mode: "great" } }) }],
    ["фикстура: email внутри", { "apps/web/content/example-report.json": JSON.stringify({ ...FIXTURE_JSON, meta: { ...FIXTURE_JSON.meta, source_note: "owner@example.com" } }) }],
    ["ReportView: нет секции domains", { "apps/web/components/report/report-view.tsx": FILES["apps/web/components/report/report-view.tsx"].replace('data-report-section="domains"', 'data-report-section="dom"') }],
    ["ReportView: нет пометки v2", { "apps/web/components/report/report-view.tsx": FILES["apps/web/components/report/report-view.tsx"].replace("data-v2-placeholder", "data-v2").replace("отчёте v2", "позже") }],
    ["страница заказа: inline-рендер остался", { "apps/web/app/orders/[id]/page.tsx": "<ReportView />\n{report.gaps.map((g) => g)}\n" }],
    ["страница заказа: без ReportView", { "apps/web/app/orders/[id]/page.tsx": "<div />\n" }],
    ["пример: нет дисклеймера", { "apps/web/app/(marketing)/audit/example/page.tsx": FILES["apps/web/app/(marketing)/audit/example/page.tsx"].replace("data-example-disclaimer", "data-note") }],
    ["пример: CTA не через auditStartHref", { "apps/web/app/(marketing)/audit/example/page.tsx": FILES["apps/web/app/(marketing)/audit/example/page.tsx"].replace("auditStartHref()", '"/launch"') }],
    ["ProofStrip: нет ссылки на заказ", { "apps/web/components/marketing/proof-strip.tsx": FILES["apps/web/components/marketing/proof-strip.tsx"].replace('data-proof-link="order"', 'data-link="order"') }],
    ["OfferBlock без ProofStrip", { "apps/web/components/marketing/offer.tsx": "<section data-offer />\n" }],
    ["ProofStrip: href заказа не из контекста", { "apps/web/components/marketing/proof-strip.tsx": FILES["apps/web/components/marketing/proof-strip.tsx"].replace("const orderHref = useOrderHref();", 'const orderHref = "/order/audit-start";') }],
    ["layout marketing без force-dynamic (ссылка запечётся в сборку)", { "apps/web/app/(marketing)/layout.tsx": "<CheckoutHrefProvider orderHref={auditStartHref()} />\n" }],
    ["layout marketing без провайдера", { "apps/web/app/(marketing)/layout.tsx": "export const dynamic = \"force-dynamic\";\nconst x = auditStartHref();\n" }],
    ["how-it-works: захардкоженный /launch?package=audit_start", { "apps/web/app/(marketing)/how-it-works/page.tsx": 'cta={{ href: "/launch?package=audit_start" }}\n' }],
    ["for-business: без auditStartHref", { "apps/web/app/(marketing)/for-business/page.tsx": 'cta={{ href: "/audit" }}\n' }],
    ["middleware: маршрут не публичный", { "apps/web/middleware.ts": 'const PUBLIC_ROUTES = ["/audit"];\n' }],
    ["sitemap: маршрута нет", { "apps/web/lib/sitemap-xml.ts": "{ loc: `${APP_URL}/audit` }\n" }],
    ["cases: нет типа CaseStudy", { "apps/web/content/cases.ts": "export const CASES = [];\n" }],
    ["cases пуст, а на странице нет пустого состояния", { "apps/web/app/(marketing)/audit/example/page.tsx": FILES["apps/web/app/(marketing)/audit/example/page.tsx"].replace("data-cases-empty", "data-cases-note") }],
  ];
  repoMutations.forEach(([label, ov], i) => {
    const d = join(work, `repo-m${i}`); writeTree(d, { ...FILES, ...ov });
    const r = run(["--repo-only", "--repo-root", d]);
    expect(`мутация репо: ${label}`, r.code, 1, r.out);
  });

  const liveMutations = [
    ["пример без режима", { example: examplePage({ mode: "" }) }],
    ["пример без секции v2-before-after", { example: examplePage({ sections: SECTIONS.slice(0, 6) }) }],
    ["пример: пометок v2 меньше 3", { example: examplePage({ placeholders: 2 }) }],
    ["пример: цифры в пустом блоке кейсов", { example: examplePage({ cases: "<section data-cases><p data-cases-empty>рост на 40% до/после</p></section>" }) }],
    ["пример: нет блока оффера", { example: examplePage({ offer: "" }) }],
    ["маршрут без ссылки на пример", { routes: { "/pricing": routePage({ example: "/audit" }) } }],
    ["маршрут: ссылка заказа ведёт не туда", { routes: { "/scan": routePage({ order: "/pay" }) } }],
    ["ссылка заказа разная на маршрутах", { routes: { "/audit": routePage({ order: "/launch?package=audit_start" }) } }],
  ];
  liveMutations.forEach(([label, ov], i) => {
    const d = join(work, `fx-m${i}`); writeFixtures(d, ov);
    const r = run(["--repo-root", green, "--fixture-dir", d, "--checkout", "live"]);
    expect(`мутация фикстур: ${label}`, r.code, 1, r.out);
  });
  {
    const d = join(work, "fx-dark"); writeFixtures(d, { routes: Object.fromEntries(ROUTES.map((r) => [r, routePage({ order: "/launch?package=audit_start" })])) });
    expect("checkout live, но ссылка заказа — форма Launch", run(["--repo-root", green, "--fixture-dir", d, "--checkout", "live"]).code, 1, "");
    expect("checkout dark: та же ссылка допустима", run(["--repo-root", green, "--fixture-dir", d, "--checkout", "dark"]).code, 0, "");
  }
  {
    const r = run(["--repo-root", green, "--base-url", "http://127.0.0.1:9"], { PROOF_ATTEMPTS: "1", PROOF_RETRY_DELAY_MS: "0", PROOF_TIMEOUT_MS: "500" });
    expect("транспорт мёртв + чистое репо -> exit 3", r.code, 3, r.out);
  }
  expect("usage: неизвестный флаг", run(["--nope"]).code, 2, "");
  expect("usage: --checkout мусор", run(["--repo-only", "--repo-root", green, "--checkout", "maybe"]).code, 2, "");
} finally {
  rmSync(work, { recursive: true, force: true });
}
if (failures.length > 0) { console.error(`\n${failures.length} провал(ов):\n${failures.join("\n\n")}`); process.exit(1); }
console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ");
