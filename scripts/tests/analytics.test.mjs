#!/usr/bin/env node
/**
 * Мутационный тест оракула scripts/verify-analytics.mjs (G-012).
 * Зелёное репо и зелёные фикстуры → exit 0; каждая мутация → exit 1;
 * мёртвый транспорт при чистом репо → exit 3; usage → exit 2.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const oracle = resolve(here, "..", "verify-analytics.mjs");
const YM = "12345678";

const GOALS = ["lead_scan_submit", "lead_audit_submit", "order_form_submit", "order_checkout_redirect",
  "order_pair_collecting", "order_paid", "contact_agency_submit", "cta_order_click"];

const FILES = {
  "apps/web/lib/analytics.ts":
    "export const YM_ID = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID ?? \"\";\n"
    + `export const YM_GOALS = { ${GOALS.map((g) => `${g}: "${g}"`).join(", ")} } as const;\n`
    + "export function reachGoal() {}\nexport function ymHit(url) { ym(\"hit\", url); }\n",
  "apps/web/components/yandex-metrika.tsx":
    "\"use client\";\nimport { usePathname } from \"next/navigation\";\n"
    + "const src = \"https://mc.yandex.ru/metrika/tag.js\";\nym(id, \"init\", { webvisor: false });\nymHit(window.location.href);\n"
    + "reachGoal(\"cta_order_click\");\n<span data-ym-id={id} hidden />\n<noscript><img src={`https://mc.yandex.ru/watch/${id}`} /></noscript>\n",
  "apps/web/app/layout.tsx": "<YandexMetrika />\n",
  "apps/web/app/(marketing)/scan/page.tsx": "reachGoal(\"lead_scan_submit\");\n",
  "apps/web/app/(marketing)/audit/audit-client.tsx": "reachGoal(\"lead_audit_submit\");\n",
  "apps/web/app/(marketing)/order/audit-start/order-form.tsx":
    "reachGoal(\"order_form_submit\");\nreachGoal(\"order_checkout_redirect\");\nreachGoal(\"order_pair_collecting\");\n",
  "apps/web/app/(marketing)/for-agencies/page.tsx": "reachGoal(\"contact_agency_submit\");\n",
  "apps/web/app/orders/[id]/order-paid-goal.tsx": "reachGoal(\"order_paid\");\n",
  "apps/web/app/orders/[id]/page.tsx": "<OrderPaidGoal orderId={order.id} status={order.status} />\n",
  "docker/web.Dockerfile": "ARG NEXT_PUBLIC_YANDEX_METRIKA_ID\nENV NEXT_PUBLIC_YANDEX_METRIKA_ID=${NEXT_PUBLIC_YANDEX_METRIKA_ID}\n",
  "docker/docker-compose.prod.yml": "      args:\n        NEXT_PUBLIC_YANDEX_METRIKA_ID: ${NEXT_PUBLIC_YANDEX_METRIKA_ID}\n",
  ".env.example": "NEXT_PUBLIC_YANDEX_METRIKA_ID=\n",
  "OPERATIONS.md": `## 8c. Яндекс.Метрика\nregex: chatgpt\\.com|perplexity\\.ai\nЦели: ${GOALS.join(", ")}\n`,
};

const ROUTES = ["/", "/audit", "/pricing", "/for-experts", "/for-business", "/for-agencies", "/how-it-works",
  "/launch", "/find-expert", "/login", "/register", "/terms", "/privacy", "/requisites", "/pay", "/scan", "/order/audit-start"];
const fixtureName = (r) => (r === "/" ? "index.html" : `${r.replace(/^\//, "").replace(/\//g, "-")}.html`);
const page = (id = YM) => `<html><body><span data-ym-id="${id}" hidden></span><noscript><img src="https://mc.yandex.ru/watch/${id}"></noscript></body></html>`;

function writeTree(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content);
  }
}
function writeFixtures(dir, overrides = {}) {
  mkdirSync(dir, { recursive: true });
  for (const r of ROUTES) writeFileSync(join(dir, fixtureName(r)), overrides[r] ?? page());
}
function run(args, env = {}) {
  try {
    const stdout = execFileSync(process.execPath, [oracle, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env } });
    return { code: 0, out: stdout };
  } catch (err) {
    return { code: err.status ?? -1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

const failures = [];
let caseNo = 0;
function expect(label, actual, expected, out) {
  caseNo += 1;
  const ok = actual === expected;
  console.log(`  ${ok ? "OK  " : "FAIL"} [${caseNo}] ${label} -> exit ${actual}`);
  if (!ok) failures.push(`${label}: exit ${actual}, ожидался ${expected}\n${out.slice(0, 600)}`);
}

const work = mkdtempSync(join(tmpdir(), "analytics-oracle-"));
try {
  const green = join(work, "green"); writeTree(green, FILES);
  const fx = join(work, "fx"); writeFixtures(fx);
  expect("позитив: repo-only", run(["--repo-only", "--repo-root", green]).code, 0, "");
  // Команда юнита без флагов и без живого адреса — слой репо, не usage.
  expect("позитив: без флагов = repo-only (команда юнита)", run(["--repo-root", green], { ANALYTICS_URL: "", CANONICAL_URL: "" }).code, 0, "");
  {
    const d = join(work, "repo-noflags-bad"); writeTree(d, { ...FILES, "apps/web/app/layout.tsx": "<Providers />\n" });
    const r = run(["--repo-root", d], { ANALYTICS_URL: "", CANONICAL_URL: "" });
    expect("без флагов на красном репо -> exit 1", r.code, 1, r.out);
  }
  expect("позитив: фикстуры + ожидаемый id", run(["--repo-root", green, "--fixture-dir", fx, "--ym-id", YM]).code, 0, "");
  expect("позитив: фикстуры без ожидаемого id", run(["--repo-root", green, "--fixture-dir", fx]).code, 0, "");

  const repoMutations = [
    ["lib: id читается не из env", { "apps/web/lib/analytics.ts": FILES["apps/web/lib/analytics.ts"].replace("NEXT_PUBLIC_YANDEX_METRIKA_ID", "HARDCODED") }],
    ["lib: цель order_paid удалена из словаря", { "apps/web/lib/analytics.ts": FILES["apps/web/lib/analytics.ts"].replace("order_paid: \"order_paid\", ", "") }],
    ["компонент: webvisor включён", { "apps/web/components/yandex-metrika.tsx": FILES["apps/web/components/yandex-metrika.tsx"].replace("webvisor: false", "webvisor: true") }],
    ["компонент: нет hit на смену маршрута", { "apps/web/components/yandex-metrika.tsx": FILES["apps/web/components/yandex-metrika.tsx"].replace("usePathname", "useRouter") }],
    ["компонент: нет noscript-пикселя", { "apps/web/components/yandex-metrika.tsx": FILES["apps/web/components/yandex-metrika.tsx"].replace("<noscript>", "<div>") }],
    ["layout: компонент не подключён", { "apps/web/app/layout.tsx": "<Providers />\n" }],
    ["layout: inline-сниппет вернулся", { "apps/web/app/layout.tsx": "<YandexMetrika />\n<script src=\"https://mc.yandex.ru/metrika/tag.js\" />\n" }],
    ["id захардкожен в странице", { "apps/web/app/(marketing)/pricing/page.tsx": "ym(98765432, \"reachGoal\", \"x\");\n" }],
    ["второй модуль читает env напрямую", { "apps/web/app/(marketing)/pricing/page.tsx": "const x = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;\n" }],
    ["продюсер: цель lead_scan_submit убрана", { "apps/web/app/(marketing)/scan/page.tsx": "// no goal\n" }],
    ["продюсер: order_checkout_redirect убран", { "apps/web/app/(marketing)/order/audit-start/order-form.tsx": "reachGoal(\"order_form_submit\");\nreachGoal(\"order_pair_collecting\");\n" }],
    ["страница заказа: OrderPaidGoal не подключён", { "apps/web/app/orders/[id]/page.tsx": "<StatusRefresh />\n" }],
    ["Dockerfile: ARG удалён", { "docker/web.Dockerfile": "ENV NEXT_PUBLIC_YANDEX_METRIKA_ID=x\n" }],
    ["compose: build arg удалён", { "docker/docker-compose.prod.yml": "      args:\n        NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}\n" }],
    ["OPERATIONS: нет regex AI-сегмента", { "OPERATIONS.md": `## 8c. Яндекс.Метрика\nЦели: ${GOALS.join(", ")}\n` }],
  ];
  repoMutations.forEach(([label, ov], i) => {
    const d = join(work, `repo-m${i}`); writeTree(d, { ...FILES, ...ov });
    const r = run(["--repo-only", "--repo-root", d]);
    expect(`мутация репо: ${label}`, r.code, 1, r.out);
  });

  const liveMutations = [
    ["маршрут без счётчика", { "/pricing": "<html><body>no counter</body></html>" }],
    ["маршрут с другим id", { "/scan": page("99999999") }],
    ["маршрут без noscript-пикселя", { "/terms": `<html><body><span data-ym-id="${YM}"></span></body></html>` }],
  ];
  liveMutations.forEach(([label, ov], i) => {
    const d = join(work, `fx-m${i}`); writeFixtures(d, ov);
    const r = run(["--repo-root", green, "--fixture-dir", d, "--ym-id", YM]);
    expect(`мутация фикстур: ${label}`, r.code, 1, r.out);
  });
  {
    const d = join(work, "fx-missing"); writeFixtures(d); rmSync(join(d, fixtureName("/order/audit-start")));
    const r = run(["--repo-root", green, "--fixture-dir", d]);
    expect("фикстура маршрута отсутствует", r.code, 1, r.out);
  }
  {
    const r = run(["--repo-root", green, "--base-url", "http://127.0.0.1:9"], { ANALYTICS_ATTEMPTS: "1", ANALYTICS_RETRY_DELAY_MS: "0", ANALYTICS_TIMEOUT_MS: "500" });
    expect("транспорт мёртв + чистое репо -> exit 3", r.code, 3, r.out);
  }
  {
    const d = join(work, "repo-bad"); writeTree(d, { ...FILES, "apps/web/app/layout.tsx": "<Providers />\n" });
    const r = run(["--repo-root", d, "--base-url", "http://127.0.0.1:9"], { ANALYTICS_ATTEMPTS: "1", ANALYTICS_RETRY_DELAY_MS: "0", ANALYTICS_TIMEOUT_MS: "500" });
    expect("транспорт мёртв + repo-находка -> exit 1, не 3", r.code, 1, r.out);
  }
  expect("usage: неизвестный флаг", run(["--nope"]).code, 2, "");
  expect("usage: --ym-id не число", run(["--repo-only", "--repo-root", green, "--ym-id", "abc"]).code, 2, "");
  expect("usage: fixture-dir и base-url одновременно", run(["--fixture-dir", fx, "--base-url", "http://x"]).code, 2, "");
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\n${failures.length} провал(ов):\n${failures.join("\n\n")}`);
  process.exit(1);
}
console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ");
