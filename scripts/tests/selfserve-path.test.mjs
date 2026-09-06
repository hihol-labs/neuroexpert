/**
 * Мутационный тест оракула scripts/verify-selfserve-path.mjs (--stage=order и --stage=pair).
 *
 * Зелёный фикстурный репо + зелёные сетевые фикстуры (dark) → exit 0; на каждой
 * заведомой регрессии оракул обязан покраснеть (exit 1). Плюс режим live и
 * usage-контракт. Стадия pair (G-018b): зелёное репо шагов 2-6, «пустое» репо
 * даёт ровно 6 групповых находок (producer-first: красный HEAD шага 1),
 * 11 репо-регрессий + 4 живых.
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
    "const d = decidePreflight({});\nheaders: { \"Idempotence-Key\": `package-${id}` }\nreturn NextResponse.json({}, { status: 404 });\nfetch(\"https://api.yookassa.ru/v3/payments\")\nconst l = new SlidingWindowLimiter({});\n",
  "apps/web/app/api/orders/[id]/route.ts": "const { data: { user } } = await supabase.auth.getUser();\nif (!order || order.owner_id !== user.id) {}\n",
  "apps/web/app/api/webhooks/yukassa/route.ts":
    "const m = parsePackageMetadata(metadata);\nif (mayEnqueueAuditJob(\"paid\", null)) {}\n.insert({ type: \"run_audit\" })\n.is(\"job_id\", null)\nconst c = assessPackagePayment(order, p, {});\nconst r = assessPackageRefund(order, rf, p, s);\n",
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

// ===== стадия pair (G-018b): зелёное фикстурное репо шагов 2-6 =====
const CRON_003 = "SELECT cron.schedule('weekly-demand', '0 3 * * 1',\n  $$INSERT INTO public.jobs (type, payload) SELECT 'collect_demand', jsonb_build_object('niche_id', id) FROM public.niches WHERE is_active = TRUE$$\n);\n";
const FILES_PAIR = {
  "packages/supabase/migrations/027_local_pairs.sql":
    "CREATE TABLE IF NOT EXISTS public.local_verticals (\n  id TEXT PRIMARY KEY,\n  CONSTRAINT local_verticals_templates_8 CHECK (true)\n);\nINSERT INTO public.local_verticals VALUES ('dental'), ('clinic'), ('autoservice');\nALTER TABLE public.niches ADD COLUMN IF NOT EXISTS city TEXT;\nALTER TABLE public.niches ADD COLUMN IF NOT EXISTS vertical TEXT;\nALTER TABLE public.niches ADD COLUMN IF NOT EXISTS demand_status TEXT;\nALTER TABLE public.niches ADD CONSTRAINT niches_local_pair_shape CHECK (true);\nCREATE TRIGGER niches_local_pair_born_inactive BEFORE INSERT ON public.niches FOR EACH ROW EXECUTE FUNCTION public.niches_local_pair_born_inactive();\nCREATE TABLE IF NOT EXISTS public.pair_requests (\n  CONSTRAINT pair_requests_niche_email UNIQUE (niche_id, email)\n);\n",
  "packages/supabase/migrations/003_cron_schedules.sql": CRON_003,
  "packages/shared/src/pairs/index.ts":
    "export function normalizeCity() {}\nexport function buildPairSlug() {}\nexport function buildPairId() {}\nexport function buildPairName() {}\nexport function expandSeedTemplates() {}\nexport const PAIR_MIN_QUESTIONS = 10;\nexport function decidePairPreflight() {}\nexport function decideOnDemandOutcome() {}\n",
  "packages/shared/src/index.ts": "export * from \"./orders/index.js\";\nexport * from \"./pairs/index.js\";\n",
  "apps/web/app/api/orders/route.ts":
    "const vertical = body.vertical;\nconst v = await admin.from(\"local_verticals\").select(\"id\");\nawait admin.from(\"niches\").insert({ is_active: false });\nconst pair = decidePairPreflight({});\nif (pair.status !== \"ready\") {\n  await admin.from(\"pair_requests\").upsert({});\n  await admin.from(\"jobs\").insert({ type: \"collect_demand\", payload: { mode: \"on_demand\" } });\n  return NextResponse.json({}, { status: 202 });\n}\nconst d = decidePreflight({});\nawait admin.from(\"package_orders\").insert({});\nheaders: { \"Idempotence-Key\": `package-${id}` }\nreturn NextResponse.json({}, { status: 404 });\nfetch(\"https://api.yookassa.ru/v3/payments\")\n",
  "apps/web/app/api/health/route.ts": "return NextResponse.json({ local_pairs: { total, active, collecting, filled, empty } });\n",
  "apps/worker/src/jobs/collect-demand.ts":
    "const onDemand = payload.mode === \"on_demand\";\nawait supabase.from(\"niches\").update({ demand_status: \"filled\" });\nawait anon.auth.signInWithOtp({ email });\nif (!onDemand) {\n  await supabase.from(\"jobs\").insert({ type: \"find_gaps\" });\n}\n",
  "apps/web/app/(marketing)/order/audit-start/order-form.tsx": "<select name=\"vertical\" />\n<section data-pair-status=\"collecting\" />\n",
  "apps/web/app/(marketing)/order/audit-start/page.tsx": "const { data } = await getAdmin().from(\"local_verticals\").select(\"id, name\");\n",
};
const PAIR_DARK_FX = {
  "order-page.json": '{"status":404}',
  "orders-post.json": '{"status":404}',
  "orders-post-vertical.json": '{"status":400}',
  "health.json": '{"status":"ok","local_pairs":{"total":1,"active":0,"collecting":1,"filled":0,"empty":0}}',
};
const PAIR_LIVE_FX = { ...PAIR_DARK_FX, "order-page.json": '{"status":200}', "orders-post.json": '{"status":400}' };

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
    ["webhook: сверка платежа с API кассы убрана (SEC-1)", { "apps/web/app/api/webhooks/yukassa/route.ts": FILES["apps/web/app/api/webhooks/yukassa/route.ts"].replace("assessPackagePayment(", "trustBody(") }],
    ["webhook: сверка возврата с API кассы убрана (SEC-1)", { "apps/web/app/api/webhooks/yukassa/route.ts": FILES["apps/web/app/api/webhooks/yukassa/route.ts"].replace("assessPackageRefund(", "trustRefund(") }],
    ["orders: rate-limit заказов убран (SEC-1)", { "apps/web/app/api/orders/route.ts": FILES["apps/web/app/api/orders/route.ts"].replace("SlidingWindowLimiter", "NoLimiter") }],
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

  // ===== стадия pair (G-018b) =====
  const pairGreen = join(work, "pair-green"); writeTree(pairGreen, FILES_PAIR);
  const pairFxDark = join(work, "pair-fx-dark"); writeFx(pairFxDark, PAIR_DARK_FX);
  const pairFxLive = join(work, "pair-fx-live"); writeFx(pairFxLive, PAIR_LIVE_FX);
  { const r = run(["--stage=pair", "--repo-root", pairGreen, "--fixture-dir", pairFxDark]); expect("pair: позитив dark", r.code, 0, r.out); }
  { const r = run(["--stage=pair", "--repo-root", pairGreen, "--fixture-dir", pairFxLive, "--checkout", "live"]); expect("pair: позитив live", r.code, 0, r.out); }
  { const r = run(["--stage=pair", "--repo-root", pairGreen, "--repo-only"]); expect("pair: --repo-only на зелёном репо", r.code, 0, r.out); }
  {
    // Красный HEAD шага 1: ни одного файла шагов 2-6 — ровно 6 групповых находок (по одной на шаг).
    const bare = join(work, "pair-bare"); writeTree(bare, { "packages/supabase/migrations/003_cron_schedules.sql": CRON_003 });
    const r = run(["--stage=pair", "--repo-root", bare, "--repo-only"]);
    expect("pair: пустое репо шагов 2-6 -> exit 1", r.code, 1, r.out);
    const m = /(\d+) finding\(s\)/.exec(r.out);
    expect("pair: пустое репо даёт ровно 6 групповых находок", m ? Number(m[1]) : -1, 6, r.out);
  }
  const P = FILES_PAIR;
  const pairRepoMutations = [
    ["миграция: снят CHECK формы пары (city + префикс b)", { "packages/supabase/migrations/027_local_pairs.sql": P["packages/supabase/migrations/027_local_pairs.sql"].replace("niches_local_pair_shape", "x") }],
    ["миграция: снят CHECK 8 шаблонов с {город}", { "packages/supabase/migrations/027_local_pairs.sql": P["packages/supabase/migrations/027_local_pairs.sql"].replace("local_verticals_templates_8", "x") }],
    ["cron 003: weekly-demand берёт все ниши (в т.ч. b-пары)", { "packages/supabase/migrations/003_cron_schedules.sql": CRON_003.replace("WHERE is_active = TRUE", "WHERE TRUE") }],
    ["миграция: снят триггер «пара рождается неактивной» (дефолт is_active=TRUE утянет пару в cron)", { "packages/supabase/migrations/027_local_pairs.sql": P["packages/supabase/migrations/027_local_pairs.sql"].replace("BEFORE INSERT ON public.niches", "BEFORE UPDATE ON public.niches") }],
    ["shared: порог пары опущен до 1", { "packages/shared/src/pairs/index.ts": P["packages/shared/src/pairs/index.ts"].replace("PAIR_MIN_QUESTIONS = 10", "PAIR_MIN_QUESTIONS = 1") }],
    ["orders: 202 отдаётся раньше pre-flight пары", { "apps/web/app/api/orders/route.ts": "return NextResponse.json({}, { status: 202 });\n" + P["apps/web/app/api/orders/route.ts"].replace("return NextResponse.json({}, { status: 202 });\n", "") }],
    ["orders: новая пара создаётся is_active = true", { "apps/web/app/api/orders/route.ts": P["apps/web/app/api/orders/route.ts"].replace("is_active: false", "is_active: true") }],
    ["orders: заказ пишется раньше pre-flight пары", { "apps/web/app/api/orders/route.ts": "await admin.from(\"package_orders\").insert({});\n" + P["apps/web/app/api/orders/route.ts"].replace("await admin.from(\"package_orders\").insert({});\n", "") }],
    ["worker: find_gaps ставится и в on_demand (guard снят)", { "apps/worker/src/jobs/collect-demand.ts": P["apps/worker/src/jobs/collect-demand.ts"].replace("if (!onDemand)", "if (true)") }],
    ["worker: письмо ожидающим не шлётся", { "apps/worker/src/jobs/collect-demand.ts": P["apps/worker/src/jobs/collect-demand.ts"].replace("signInWithOtp", "noop") }],
    ["UI: экран «готовим замер» удалён", { "apps/web/app/(marketing)/order/audit-start/order-form.tsx": "<select name=\"vertical\" />\n" }],
    ["health: блок local_pairs удалён", { "apps/web/app/api/health/route.ts": "return NextResponse.json({});\n" }],
  ];
  pairRepoMutations.forEach(([label, ov], i) => {
    const d = join(work, `pair-m${i}`); writeTree(d, { ...FILES_PAIR, ...ov });
    const r = run(["--stage=pair", "--repo-root", d, "--fixture-dir", pairFxDark]);
    expect(`pair мутация репо: ${label}`, r.code, 1, r.out);
  });
  const pairLiveMutations = [
    ["health: пара активирована без решения владельца (active = 1)", { "health.json": '{"local_pairs":{"total":1,"active":1,"collecting":0,"filled":1,"empty":0}}' }],
    ["health: блока local_pairs нет", { "health.json": '{"status":"ok"}' }],
    ["POST с неизвестной вертикалью создаёт пару (202 вместо 400)", { "orders-post-vertical.json": '{"status":202}' }],
    ["dark: страница заказа отвечает 200", { "order-page.json": '{"status":200}' }],
  ];
  pairLiveMutations.forEach(([label, ov], i) => {
    const d = join(work, `pair-fx-m${i}`); writeFx(d, { ...PAIR_DARK_FX, ...ov });
    const r = run(["--stage=pair", "--repo-root", pairGreen, "--fixture-dir", d]);
    expect(`pair мутация live: ${label}`, r.code, 1, r.out);
  });

  { const r = run(["--stage=delivery"]); expect("usage: --stage=delivery не поддерживается -> exit 2", r.code, 2, r.out); }
  { const r = run(["--stage=order", "--repo-root", green, "--repo-only"]); expect("--repo-only на зелёном репо", r.code, 0, r.out); }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) { console.error(`\n${failures.length} провал(ов): ${failures.join("; ")}`); process.exit(1); }
console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ");
