/**
 * Мутационный тест оракула scripts/verify-selfserve-path.mjs (--stage=order).
 *
 * Зелёный фикстурный репо + зелёные сетевые фикстуры (dark) → exit 0; на каждой
 * заведомой регрессии оракул обязан покраснеть (exit 1). Плюс режим live и
 * usage-контракт.
 *
 * Запуск: node scripts/tests/selfserve-path.test.mjs
 * Успех: exit 0 и «ВСЕ ПРОВЕРКИ ПРОШЛИ».
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const oracle = resolve(here, "..", "verify-selfserve-path.mjs");

const FILES = {
  "packages/supabase/migrations/026_package_orders.sql":
    "CREATE TABLE IF NOT EXISTS public.package_orders (\n  yukassa_payment_id  TEXT UNIQUE,\n  CONSTRAINT package_orders_job_requires_paid CHECK (true)\n);\nCHECK (type IN ('expand_query','run_audit'));\n",
  "packages/shared/src/orders/packages.ts": "export const PACKAGE_REGISTRY = Object.freeze({ audit_start: { amountRub: 7900 } });\n",
  "apps/web/app/api/orders/route.ts":
    "const d = decidePreflight({});\nheaders: { \"Idempotence-Key\": `package-${id}` }\nreturn NextResponse.json({}, { status: 404 });\nfetch(\"https://api.yookassa.ru/v3/payments\")\n",
  "apps/web/app/api/orders/[id]/route.ts": "const { data: { user } } = await supabase.auth.getUser();\nif (!order || order.owner_id !== user.id) {}\n",
  "apps/web/app/api/webhooks/yukassa/route.ts":
    "const m = parsePackageMetadata(metadata);\nif (mayEnqueueAuditJob(\"paid\", null)) {}\n.insert({ type: \"run_audit\" })\n.is(\"job_id\", null)\n",
  "apps/web/lib/checkout.ts": "export function checkoutLive() { return process.env.SELF_SERVE_CHECKOUT === \"live\"; }\n",
  "apps/web/app/(marketing)/pricing/page.tsx": "<PricingContent auditStartHref={auditStartHref()} />\n",
  "apps/web/app/(marketing)/audit/page.tsx": "<AuditClient auditStartHref={auditStartHref()} />\n",
  "apps/web/app/(marketing)/terms/page.tsx": "<p data-terms-auto-refund=\"audit_start\">авто-возврат</p>\n",
  "apps/web/app/api/audit/route.ts": "const niche = await admin.from(\"niches\").select(\"name\");\n",
};

const DARK_FX = {
  "pricing.html": '<a href="/launch?package=audit_start">Получить аудит</a>',
  "audit.html": '<a href="/launch?package=audit_start">Заказать карту спроса</a>',
  "terms.html": '<p data-terms-auto-refund="audit_start">x</p>',
  "order-page.json": '{"status":404}',
  "orders-post.json": '{"status":404}',
  "orders-get.json": '{"status":401}',
  "webhook.json": '{"status":400}',
};
const LIVE_FX = {
  ...DARK_FX,
  "pricing.html": '<a href="/order/audit-start">Получить аудит</a>',
  "audit.html": '<a href="/order/audit-start">Заказать карту спроса</a>',
  "order-page.json": '{"status":200}',
  "orders-post.json": '{"status":400}',
};

function writeTree(root, overrides = {}) {
  for (const [rel, body] of Object.entries({ ...FILES, ...overrides })) {
    if (body === null) continue;
    const p = join(root, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, body);
  }
}
function writeFx(dir, fx) {
  mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(fx)) writeFileSync(join(dir, name), body);
}
function run(args) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [oracle, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (err) {
    return { code: err.status ?? -1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

const failures = [];
let n = 0;
function expect(label, actual, expected, out) {
  n += 1;
  if (actual === expected) console.log(`  OK  [${n}] ${label} -> exit ${actual}`);
  else { failures.push(label); console.error(`FAIL  [${n}] ${label}: exit ${actual}, ожидался ${expected}\n${out}`); }
}

const work = mkdtempSync(join(tmpdir(), "selfserve-test-"));
try {
  const green = join(work, "repo-green"); writeTree(green);
  const fxDark = join(work, "fx-dark"); writeFx(fxDark, DARK_FX);
  const fxLive = join(work, "fx-live"); writeFx(fxLive, LIVE_FX);

  { const r = run(["--stage=order", "--repo-root", green, "--fixture-dir", fxDark]); expect("позитив dark", r.code, 0, r.out); }
  { const r = run(["--stage=order", "--repo-root", green, "--fixture-dir", fxLive, "--checkout", "live"]); expect("позитив live", r.code, 0, r.out); }

  const repoMutations = [
    ["миграция: run_audit удалён", { "packages/supabase/migrations/026_package_orders.sql": FILES["packages/supabase/migrations/026_package_orders.sql"].replace("'run_audit'", "'run_report'") }],
    ["миграция: инвариант job_requires_paid удалён", { "packages/supabase/migrations/026_package_orders.sql": FILES["packages/supabase/migrations/026_package_orders.sql"].replace("package_orders_job_requires_paid", "x") }],
    ["реестр: цена изменена (заморозка)", { "packages/shared/src/orders/packages.ts": "export const PACKAGE_REGISTRY = Object.freeze({ audit_start: { amountRub: 9900 } });\n" }],
    ["orders: платёж без Idempotence-Key", { "apps/web/app/api/orders/route.ts": FILES["apps/web/app/api/orders/route.ts"].replace("\"Idempotence-Key\"", "\"X-Key\"") }],
    ["orders: pre-flight убран", { "apps/web/app/api/orders/route.ts": FILES["apps/web/app/api/orders/route.ts"].replace("decidePreflight(", "noPreflight(") }],
    ["orders/[id]: owner-гейт убран", { "apps/web/app/api/orders/[id]/route.ts": "const x = 1;\n" }],
    ["webhook: guard job_id IS NULL убран", { "apps/web/app/api/webhooks/yukassa/route.ts": FILES["apps/web/app/api/webhooks/yukassa/route.ts"].replace(".is(\"job_id\", null)", "") }],
    ["/audit: хардкод NICHE_NAMES вернулся", { "apps/web/app/api/audit/route.ts": "const NICHE_NAMES = {};\n" }],
    ["оферта: пункт авто-возврата удалён", { "apps/web/app/(marketing)/terms/page.tsx": "<p>возврат по заявлению</p>\n" }],
    ["CTA /pricing не подключён к флагу", { "apps/web/app/(marketing)/pricing/page.tsx": "<PricingContent />\n" }],
  ];
  repoMutations.forEach(([label, ov], i) => {
    const d = join(work, `repo-m${i}`); writeTree(d, ov);
    const r = run(["--stage=order", "--repo-root", d, "--fixture-dir", fxDark]);
    expect(`мутация репо: ${label}`, r.code, 1, r.out);
  });

  const liveMutations = [
    ["dark: /pricing ведёт на /order (checkout включён без решения)", { "pricing.html": '<a href="/order/audit-start">x</a>' }],
    ["dark: страница заказа отвечает 200", { "order-page.json": '{"status":200}' }],
    ["POST /api/orders падает 500", { "orders-post.json": '{"status":500}' }],
    ["GET /api/orders/[id] без сессии отдаёт 200", { "orders-get.json": '{"status":200}' }],
    ["webhook принимает мусор 200", { "webhook.json": '{"status":200}' }],
    ["/terms без пункта авто-возврата", { "terms.html": "<p>нет</p>" }],
  ];
  liveMutations.forEach(([label, ov], i) => {
    const d = join(work, `fx-m${i}`); writeFx(d, { ...DARK_FX, ...ov });
    const r = run(["--stage=order", "--repo-root", green, "--fixture-dir", d]);
    expect(`мутация live: ${label}`, r.code, 1, r.out);
  });

  { const r = run(["--stage=pair"]); expect("usage: --stage=pair не поддерживается -> exit 2", r.code, 2, r.out); }
  { const r = run(["--stage=order", "--repo-root", green, "--repo-only"]); expect("--repo-only на зелёном репо", r.code, 0, r.out); }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) { console.error(`\n${failures.length} провал(ов): ${failures.join("; ")}`); process.exit(1); }
console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ");
