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
// R-02 гигиена: usage-кейсы не должны зависеть от env оркестратора (экспортированный SELFSERVE_URL
// превращал «нет URL -> exit 2» в живой прогон — ложный провал на ОТК R-01 2026-09-08).
const cleanEnv = { ...process.env };
for (const k of ["SELFSERVE_URL", "CANONICAL_URL", "SELFSERVE_CANARY_TOKEN"]) delete cleanEnv[k];
function run(args) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [oracle, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: cleanEnv }) };
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

  // ===== стадия reconcile (R-01): зелёное фикстурное репо контракта =====
  const FILES_RECON = {
    "packages/supabase/migrations/029_package_orders_reconcile.sql":
      "ALTER TABLE public.package_orders DROP CONSTRAINT package_orders_status_check;\nALTER TABLE public.package_orders ADD CONSTRAINT package_orders_status_check CHECK (status IN ('pending','paid','delivered','failed','refunded','expired'));\nADD COLUMN expired_at timestamptz, ADD COLUMN failure_email_sent_at timestamptz, ADD COLUMN refund_email_sent_at timestamptz;\n",
    "packages/shared/src/orders/state.ts":
      "export type PackageOrderStatus = \"pending\" | \"paid\" | \"expired\";\nexport type PackageOrderEvent = \"payment.succeeded\" | \"order.expired\";\nconst ALLOWED = { \"payment.succeeded\": [\"pending\", \"expired\"], \"order.expired\": [\"pending\"] };\n",
    "packages/shared/src/orders/reconcile.ts":
      "export function decidePendingOrder(input, opts = { expireAfterMs: 0 }) { return { action: \"keep\" }; }\n// actions: \"mark_paid\" | \"mark_failed\" | \"expire\" | \"keep\"\n",
    "apps/worker/src/services/payment-reconcile.ts":
      "const d = decidePendingOrder(order, payment, { now, expireAfterMs: Number(env.PACKAGE_ORDER_EXPIRE_MINUTES || 1440) * 60000 });\nconst p = await kass(shop, `payments/${encodeURIComponent(order.yukassa_payment_id)}`);\nconst check = assessPackagePayment(order, p, { status: \"succeeded\", shop });\nif (mayEnqueueAuditJob(\"paid\", order.job_id)) { await admin.rpc(\"ensure_package_audit_job\", { p_order_id: order.id }); }\nupdate({ status: \"expired\" })\n// order.expired: оплата после протухания всё равно принимается\n",
    "apps/worker/src/services/mailer.ts": "import nodemailer from \"nodemailer\";\nconst host = process.env.SMTP_HOST;\n",
    "apps/worker/src/emails/package-order.ts": "export function failedPaidEmail() { return { subject: \"x\", text: \"возврат запущен автоматически\" }; }\nexport function refundedEmail() {}\n",
    "apps/worker/src/services/audit-delivery.ts":
      "if (decideRefund(mode, isSlaBreached(order.paid_at, now()))) await fail(order.id, \"audit_below_delivery_threshold\");\n.is(\"failure_email_sent_at\", null)\n.is(\"refund_email_sent_at\", null)\n",
    "apps/worker/src/index.ts": "setInterval(() => { void reconcilePayments(); }, 15 * 60 * 1000);\n",
    "apps/web/app/api/webhooks/yukassa/route.ts": ".in(\"status\", [\"pending\", \"expired\"])\n",
    "apps/web/app/orders/[id]/page.tsx": "expired: { title: \"Заказ закрыт\", body: \"Деньги не списаны\" },\n",
    "apps/web/app/api/health/route.ts": "const names = [\"paid_waiting\", \"delivered\", \"failed\", \"refunded\", \"sla_breached\", \"expired\", \"pending_stale\"];\n",
  };
  const RECON_FX = { "health.json": '{"status":"ok","audit_delivery":{"paid_waiting":0,"delivered":3,"failed":1,"refunded":1,"sla_breached":0,"expired":2,"pending_stale":0}}' };
  const reconGreen = join(work, "recon-green"); writeTree(reconGreen, FILES_RECON);
  const reconFx = join(work, "recon-fx"); writeFx(reconFx, RECON_FX);
  { const r = run(["--stage=reconcile", "--repo-root", reconGreen, "--fixture-dir", reconFx]); expect("reconcile: позитив", r.code, 0, r.out); }
  { const r = run(["--stage=reconcile", "--repo-root", reconGreen, "--repo-only"]); expect("reconcile: --repo-only на зелёном репо", r.code, 0, r.out); }
  {
    // Красный HEAD до реализации: ни одного файла R-01 — ровно 5 групповых находок (шаги контракта).
    const bare = join(work, "recon-bare"); writeTree(bare, {});
    const r = run(["--stage=reconcile", "--repo-root", bare, "--repo-only"]);
    expect("reconcile: пустое репо -> exit 1", r.code, 1, r.out);
    const m = /(\d+) finding\(s\)/.exec(r.out);
    expect("reconcile: пустое репо даёт ровно 5 групповых находок", m ? Number(m[1]) : -1, 5, r.out);
  }
  const RC = FILES_RECON;
  const reconRepoMutations = [
    ["миграция: статус expired не добавлен в CHECK", { "packages/supabase/migrations/029_package_orders_reconcile.sql": RC["packages/supabase/migrations/029_package_orders_reconcile.sql"].replace("'expired'", "'closed'") }],
    ["миграция: нет идемпотентности писем (колонки *_email_sent_at)", { "packages/supabase/migrations/029_package_orders_reconcile.sql": RC["packages/supabase/migrations/029_package_orders_reconcile.sql"].replace("failure_email_sent_at", "x").replace("refund_email_sent_at", "y") }],
    ["state: payment.succeeded запрещён из expired (деньги после протухания теряются)", { "packages/shared/src/orders/state.ts": RC["packages/shared/src/orders/state.ts"].replace("[\"pending\", \"expired\"]", "[\"pending\"]") }],
    ["shared: решение о протухании не параметризовано окном", { "packages/shared/src/orders/reconcile.ts": RC["packages/shared/src/orders/reconcile.ts"].replace("expireAfterMs", "hours") }],
    ["worker: сверка без проверки идентичности платежа (assessPackagePayment)", { "apps/worker/src/services/payment-reconcile.ts": RC["apps/worker/src/services/payment-reconcile.ts"].replace("assessPackagePayment", "trustPayment") }],
    ["worker: job ставится не через ensure_package_audit_job (дубль при гонке с webhook)", { "apps/worker/src/services/payment-reconcile.ts": RC["apps/worker/src/services/payment-reconcile.ts"].replace("ensure_package_audit_job", "insert_job") }],
    ["worker: окно протухания захардкожено (нет PACKAGE_ORDER_EXPIRE_MINUTES)", { "apps/worker/src/services/payment-reconcile.ts": RC["apps/worker/src/services/payment-reconcile.ts"].replace("PACKAGE_ORDER_EXPIRE_MINUTES", "1440") }],
    ["worker: decideRefund не подключён", { "apps/worker/src/services/audit-delivery.ts": RC["apps/worker/src/services/audit-delivery.ts"].replace("decideRefund(", "mode === \"failed\" || (") }],
    ["worker: письмо о провале без идемпотентности", { "apps/worker/src/services/audit-delivery.ts": RC["apps/worker/src/services/audit-delivery.ts"].replace("failure_email_sent_at", "sent") }],
    ["worker: письмо о возврате не обещает автоматический возврат", { "apps/worker/src/emails/package-order.ts": RC["apps/worker/src/emails/package-order.ts"].replace("автоматически", "по заявлению") }],
    ["worker: таймер сверки не 15 минут", { "apps/worker/src/index.ts": "setInterval(() => { void reconcilePayments(); }, 24 * 60 * 60 * 1000);\n" }],
    ["webhook: оплата после expired отвергается", { "apps/web/app/api/webhooks/yukassa/route.ts": ".eq(\"status\", \"pending\")\n" }],
    ["orders/[id]: текст expired отсутствует", { "apps/web/app/orders/[id]/page.tsx": "pending: { title: \"x\" },\n" }],
    ["health: счётчик pending_stale удалён", { "apps/web/app/api/health/route.ts": RC["apps/web/app/api/health/route.ts"].replace("\"pending_stale\"", "") }],
  ];
  reconRepoMutations.forEach(([label, ov], i) => {
    const d = join(work, `recon-m${i}`); writeTree(d, { ...FILES_RECON, ...ov });
    const r = run(["--stage=reconcile", "--repo-root", d, "--fixture-dir", reconFx]);
    expect(`reconcile мутация репо: ${label}`, r.code, 1, r.out);
  });
  const reconLiveMutations = [
    ["health: pending_stale > 0 (сверка не крутится)", { "health.json": '{"audit_delivery":{"paid_waiting":0,"delivered":3,"failed":1,"refunded":1,"sla_breached":0,"expired":2,"pending_stale":3}}' }],
    ["health: счётчика expired нет", { "health.json": '{"audit_delivery":{"paid_waiting":0,"delivered":3,"failed":1,"refunded":1,"sla_breached":0,"pending_stale":0}}' }],
    ["health: блок audit_delivery отсутствует", { "health.json": '{"status":"ok"}' }],
  ];
  reconLiveMutations.forEach(([label, ov], i) => {
    const d = join(work, `recon-fx-m${i}`); writeFx(d, { ...RECON_FX, ...ov });
    const r = run(["--stage=reconcile", "--repo-root", reconGreen, "--fixture-dir", d]);
    expect(`reconcile мутация live: ${label}`, r.code, 1, r.out);
  });

  // ===== --check-details (R-03) поверх зелёного delivery-дерева =====
  const FILES_DELIVERY = {
    "packages/supabase/migrations/028_audit_delivery.sql": "package_orders_job_requires_paid complete_package_audit fail_package_audit sla_deadline_at payment_test notification_sent_at refund_id\n",
    "packages/shared/src/delivery/index.ts": "export function decideDeliveryMode() {} export function buildReportSnapshot() {} export function isSlaBreached() {} export function decideRefund() {} const s = \"unavailable\";\n",
    "apps/web/app/api/audit/route.ts": "const t = process.env.AUDIT_INTERNAL_TOKEN; request.headers.get(\"x-audit-internal\"); source_question_id; collected_at; platforms_tried; analyzer_model;\n",
    "apps/worker/src/jobs/run-audit.ts": "export const handleRunAudit = () => {};\n",
    "apps/worker/src/services/audit-delivery.ts": "complete_package_audit fail_package_audit https://api.yookassa.ru/v3 refund- notification_sent_at signInWithOtp\n",
    "apps/worker/src/index.ts": "const handlers = { run_audit: handleRunAudit };\nsweepAuditDelivery();\n",
    "apps/web/app/orders/[id]/page.tsx": "<section data-order-report=\"x\">delivered</section> if (order.owner_id !== user.id) notFound();\n",
    "apps/web/app/api/orders/[id]/route.ts": "return NextResponse.json({ report: order.report }); if (order.owner_id !== user.id) {}\n",
    "apps/web/app/api/health/route.ts": "return NextResponse.json({ audit_delivery: { paid_waiting, sla_breached, refunded } });\n",
  };
  const FILES_DETAILS = {
    ...FILES_DELIVERY,
    "apps/worker/src/services/audit-delivery.ts": FILES_DELIVERY["apps/worker/src/services/audit-delivery.ts"] + "body:JSON.stringify({niche_id:order.niche_id,type:\"paid\",details:order.details??{}})\n",
    "apps/web/app/api/audit/route.ts": FILES_DELIVERY["apps/web/app/api/audit/route.ts"] + "function clientMentions(aiResponse, d) {}\nfunction annotateClientMentions(m, aiResponse, d) {}\nconst clientDetails = paid ? sanitizeDetails(body.details) : undefined;\nbuildAnalysisUserPrompt(question, aiResponse);\nannotateClientMentions(markers, aiResponse, clientDetails);\n",
    "apps/web/app/api/webhooks/yukassa/route.ts": "await activateLocalPair(admin, order.niche_id);\n",
    "apps/worker/src/services/payment-reconcile.ts": "await activateLocalPair(admin, order.niche_id);\n",
    "packages/shared/src/orders/pair-activation.ts": "export function activateLocalPair(admin, nicheId) { return admin.from(\"niches\").update({ is_active: true }).eq(\"id\", nicheId).not(\"vertical\", \"is\", null); }\n",
    "apps/worker/src/jobs/send-email-digest.ts": "import { createMailer } from \"../services/mailer.js\";\nawait mailer({ to, bcc: batch, subject, text, html });\n",
    "apps/worker/src/services/mailer.ts": "export interface MailMessage { to: string; bcc?: string[] }\n",
    ".env.example": "SMTP_HOST=\n",
  };
  const detGreen = join(work, "details-green"); writeTree(detGreen, FILES_DETAILS);
  { const r = run(["--stage=delivery", "--check-details", "--repo-root", detGreen, "--repo-only"]); expect("details: позитив (--stage=delivery --check-details --repo-only)", r.code, 0, r.out); }
  { const r = run(["--stage=delivery", "--repo-root", detGreen, "--repo-only"]); expect("delivery без --check-details на том же дереве", r.code, 0, r.out); }
  {
    const bare = join(work, "details-bare"); writeTree(bare, { ...FILES_DELIVERY, ".env.example": "RESEND_API_KEY=\n", "apps/worker/src/services/resend.ts": "x\n", "apps/worker/src/jobs/track-geo-services.ts": "x\n", "apps/worker/src/index.ts": "const handlers = { run_audit: handleRunAudit, track_geo_services: h };\nsweepAuditDelivery();\n" });
    const r = run(["--stage=delivery", "--check-details", "--repo-root", bare, "--repo-only"]);
    expect("details: репо до R-03 -> exit 1", r.code, 1, r.out);
    const m = /(\d+) finding\(s\)/.exec(r.out); expect("details: репо до R-03 даёт ровно 4 находки (3 группы + cleanup)", m ? Number(m[1]) : -1, 4, r.out);
  }
  const DF = FILES_DETAILS;
  const detailsMutations = [
    ["worker не передаёт details движку", { "apps/worker/src/services/audit-delivery.ts": FILES_DELIVERY["apps/worker/src/services/audit-delivery.ts"] + "body:JSON.stringify({niche_id:order.niche_id,type:\"paid\"})\n" }],
    ["роут читает details, но не дописывает пометку в weakness", { "apps/web/app/api/audit/route.ts": DF["apps/web/app/api/audit/route.ts"].replace("annotateClientMentions(markers, aiResponse, clientDetails);", "log(markers);").replace("function annotateClientMentions(m, aiResponse, d) {}", "") }],
    ["текст клиента попал в промпт LLM (prompt-injection)", { "apps/web/app/api/audit/route.ts": DF["apps/web/app/api/audit/route.ts"].replace("buildAnalysisUserPrompt(question, aiResponse);", "buildAnalysisUserPrompt(question, aiResponse, clientContext);") }],
    ["details без санитизации", { "apps/web/app/api/audit/route.ts": DF["apps/web/app/api/audit/route.ts"].replace("sanitizeDetails(body.details)", "body.details") }],
    ["webhook не активирует пару", { "apps/web/app/api/webhooks/yukassa/route.ts": "// no activation\n" }],
    ["сверка не активирует пару", { "apps/worker/src/services/payment-reconcile.ts": "// no activation\n" }],
    ["helper активирует любые ниши, не только локальные пары", { "packages/shared/src/orders/pair-activation.ts": DF["packages/shared/src/orders/pair-activation.ts"].replace(".not(\"vertical\", \"is\", null)", "") }],
    ["дайджест по-прежнему через Resend", { "apps/worker/src/jobs/send-email-digest.ts": "fetch(\"https://api.resend.com/emails\")\n" }],
    ["resend.ts не удалён", { "apps/worker/src/services/resend.ts": "x\n" }],
    ["track_geo_services остался в реестре", { "apps/worker/src/index.ts": "const handlers = { run_audit: handleRunAudit, track_geo_services: h };\nsweepAuditDelivery();\n" }],
    [".env.example всё ещё предлагает RESEND_API_KEY", { ".env.example": "RESEND_API_KEY=\n" }],
  ];
  detailsMutations.forEach(([label, ov], i) => {
    const d = join(work, `details-m${i}`); writeTree(d, { ...FILES_DETAILS, ...ov });
    const r = run(["--stage=delivery", "--check-details", "--repo-root", d, "--repo-only"]);
    expect(`details мутация: ${label}`, r.code, 1, r.out);
  });

  // ===== --check-money (R-05b) поверх зелёного delivery-дерева =====
  const MONEY_TS = "packages/shared/src/delivery/money.ts";
  const ORDER_ROUTE = "apps/web/app/api/orders/[id]/route.ts";
  const ORDER_PAGE = "apps/web/app/orders/[id]/page.tsx";
  const FORM = "apps/web/app/orders/[id]/details-form.tsx";
  const VIEW = "apps/web/components/report/report-view.tsx";
  const EXAMPLE = "apps/web/app/(marketing)/audit/example/page.tsx";
  const FILES_MONEY = {
    ...FILES_DELIVERY,
    [MONEY_TS]: "export type MoneySource = \"wordstat\" | \"measured\" | \"client\";\nexport function computeMoneyBlock(report, details) {\n  if (!Number.isFinite(check)) return null;\n  if (gap.monthly_volume === null) skipped++;\n}\n",
    "packages/shared/src/index.ts": "export * from \"./delivery/index.js\";\nexport * from \"./delivery/money.js\";\n",
    "packages/shared/tests/money.test.cjs": "const {computeMoneyBlock} = require('../dist/delivery/money.js');\n",
    [ORDER_ROUTE]: FILES_DELIVERY[ORDER_ROUTE] + "const MONEY = [\"avg_check\", \"conversion\"]; const TEXT = { brand: 100 };\nconst err = validateMoneyField(key, value);\nconst merged = { ...current, ...details };\nawait admin.from(\"package_orders\").update({ details: merged, updated_at: now }).eq(\"id\", orderId).eq(\"updated_at\", current.updated_at);\n",
    [FORM]: "const body = fields.filter(([name, value]) => value !== (baseline[name] ?? \"\"));\n<input name=\"avg_check\" /><input name=\"conversion\" /><input name=\"brand\" /><small>ваша оценка</small>\n",
    [ORDER_PAGE]: FILES_DELIVERY[ORDER_PAGE] + "{[\"paid\", \"delivered\"].includes(order.status) && <DetailsForm orderId={order.id} initial={details} />}\n<ReportView report={report} mode={mode} details={details} />\n",
    [VIEW]: "const money = computeMoneyBlock(report, details);\n{money && (<section data-report-section=\"money\"><li data-money-source={m.source}>x</li>{assumptionsLabel && <p>Для примера: {assumptionsLabel}</p>}<p>Частотность Wordstat - спрос в Яндексе, а не обращения. Это не прогноз и не гарантия.</p></section>)}\n",
    [EXAMPLE]: "const EXAMPLE_ASSUMPTIONS = { avg_check: \"1\", conversion: \"1\", brand: \"x\" };\n<ReportView report={report} mode={meta.mode} details={EXAMPLE_ASSUMPTIONS} assumptionsLabel=\"x\" />\n",
  };
  const MONEY_FX = {
    "health.json": '{"status":"ok","audit_delivery":{"paid_waiting":0,"delivered":3,"failed":1,"refunded":1,"sla_breached":0}}',
    "audit-paid.json": '{"status":401}', "orders-get.json": '{"status":401}',
    "example.html": '<section data-report-section="money"><li data-money-source="wordstat">x</li><p>Для примера: чек 15 000 ₽</p></section>',
  };
  const moneyGreen = join(work, "money-green"); writeTree(moneyGreen, FILES_MONEY);
  const moneyFx = join(work, "money-fx"); writeFx(moneyFx, MONEY_FX);
  { const r = run(["--stage=delivery", "--check-money", "--repo-root", moneyGreen, "--repo-only"]); expect("money: позитив --repo-only", r.code, 0, r.out); }
  { const r = run(["--stage=delivery", "--check-money", "--repo-root", moneyGreen, "--fixture-dir", moneyFx]); expect("money: позитив с живым слоем (фикстуры)", r.code, 0, r.out); }
  {
    const bare = join(work, "money-bare"); writeTree(bare, FILES_DELIVERY);
    const r = run(["--stage=delivery", "--check-money", "--repo-root", bare, "--repo-only"]);
    expect("money: репо до R-05b -> exit 1", r.code, 1, r.out);
    const m = /(\d+) finding\(s\)/.exec(r.out); expect("money: репо до R-05b даёт ровно 5 групповых находок", m ? Number(m[1]) : -1, 5, r.out);
    const plain = run(["--stage=delivery", "--repo-root", bare, "--repo-only"]); expect("money: без флага то же дерево зелёное (флаг не ломает delivery)", plain.code, 0, plain.out);
  }
  const MF = FILES_MONEY;
  const moneyMutations = [
    ["расчёт не возвращает null без данных", { [MONEY_TS]: MF[MONEY_TS].replace("return null", "return { lost_rub: 0 }") }],
    ["отраслевая конверсия по умолчанию", { [MONEY_TS]: MF[MONEY_TS] + "const DEFAULT_CONVERSION = 0.02;\n" }],
    ["отраслевой средний чек в комментарии-константе", { [MONEY_TS]: MF[MONEY_TS] + "// средний чек по отрасли\nconst avg = 15000;\n" }],
    ["источник конверсии не помечен как клиентский", { [MONEY_TS]: MF[MONEY_TS].replace(" | \"client\"", "") }],
    ["вопросы без частотности не исключаются", { [MONEY_TS]: MF[MONEY_TS].replace("monthly_volume === null", "monthly_volume == 0") }],
    ["нечисловые входы не отбрасываются", { [MONEY_TS]: MF[MONEY_TS].replace("Number.isFinite(", "Boolean(") }],
    ["расчёт не экспортирован из shared", { "packages/shared/src/index.ts": "export * from \"./delivery/index.js\";\n" }],
    ["нет unit-тестов расчёта", { "packages/shared/tests/money.test.cjs": "// todo\n" }],
    ["PATCH без серверной валидации чисел", { [ORDER_ROUTE]: MF[ORDER_ROUTE].replace("validateMoneyField(", "String(") }],
    ["PATCH затирает прежние details", { [ORDER_ROUTE]: MF[ORDER_ROUTE].replace("update({ details: merged,", "update({ details,") }],
    ["PATCH пишет без проверки версии (гонка теряет поля)", { [ORDER_ROUTE]: MF[ORDER_ROUTE].replace(".eq(\"updated_at\", current.updated_at)", "") }],
    ["PATCH не принимает название", { [ORDER_ROUTE]: MF[ORDER_ROUTE].replace("brand", "label") }],
    ["в форме нет поля чека", { [FORM]: MF[FORM].replace("name=\"avg_check\"", "name=\"x\"") }],
    ["форма шлёт все поля (устаревшая вкладка стирает сохранённое)", { [FORM]: MF[FORM].replace("value !== (baseline[name] ?? \"\")", "true") }],
    ["поля не названы оценкой клиента", { [FORM]: MF[FORM].replace("ваша оценка", "точные данные") }],
    ["форма скрыта после доставки", { [ORDER_PAGE]: MF[ORDER_PAGE].replace("[\"paid\", \"delivered\"].includes(order.status) && <DetailsForm", "order.status === \"paid\" && <DetailsForm") }],
    ["details не переданы в отчёт", { [ORDER_PAGE]: MF[ORDER_PAGE].replace(" details={details} />", " />") }],
    ["блок рендерится без проверки на null", { [VIEW]: MF[VIEW].replace("{money && (", "{(").replace(")}\n", ")}\n") }],
    ["множители без подписи источника", { [VIEW]: MF[VIEW].replace("data-money-source={m.source}", "") }],
    ["нет дисклеймера «не прогноз»", { [VIEW]: MF[VIEW].replace("не прогноз и не гарантия", "точный расчёт") }],
    ["частотность выдана за обращения", { [VIEW]: MF[VIEW].replace("спрос в Яндексе, а не обращения", "обращения клиентов") }],
    ["пример без подписи «Для примера:»", { [VIEW]: MF[VIEW].replace("Для примера:", "Расчёт:") }],
    ["пример без констант допущений", { [EXAMPLE]: "<ReportView report={report} mode={meta.mode} />\n" }],
  ];
  moneyMutations.forEach(([label, ov], i) => {
    const d = join(work, `money-m${i}`); writeTree(d, { ...FILES_MONEY, ...ov });
    const r = run(["--stage=delivery", "--check-money", "--repo-root", d, "--repo-only"]);
    expect(`money мутация: ${label}`, r.code, 1, r.out);
  });
  const moneyLiveMutations = [
    ["пример без денежного блока", { "example.html": "<section data-report-section=\"plan\"></section>" }],
    ["пример без подписи допущений", { "example.html": MONEY_FX["example.html"].replace("Для примера:", "Расчёт:") }],
    ["пример без источников множителей", { "example.html": MONEY_FX["example.html"].replace("data-money-source=\"wordstat\"", "") }],
  ];
  moneyLiveMutations.forEach(([label, ov], i) => {
    const d = join(work, `money-fx-m${i}`); writeFx(d, { ...MONEY_FX, ...ov });
    const r = run(["--stage=delivery", "--check-money", "--repo-root", moneyGreen, "--fixture-dir", d]);
    expect(`money мутация live: ${label}`, r.code, 1, r.out);
  });
  {
    const d = join(work, "money-fx-missing"); const { ["example.html"]: _drop, ...rest } = MONEY_FX; writeFx(d, rest);
    const r = run(["--stage=delivery", "--check-money", "--repo-root", moneyGreen, "--fixture-dir", d]);
    expect("money live: фикстура примера отсутствует -> exit 1", r.code, 1, r.out);
  }

  { const r = run(["--stage=delivery"]); expect("usage: --stage=delivery без URL -> exit 2", r.code, 2, r.out); }
  { const r = run(["--stage=order", "--repo-root", green, "--repo-only"]); expect("--repo-only на зелёном репо", r.code, 0, r.out); }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) { console.error(`\n${failures.length} провал(ов): ${failures.join("; ")}`); process.exit(1); }
console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ");
