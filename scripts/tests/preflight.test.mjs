/**
 * Мутационный тест оракула scripts/verify-preflight.mjs.
 *
 * Строит зелёный фикстурный репозиторий + зелёные сетевые фикстуры, убеждается
 * что оракул проходит (exit 0), затем вносит по одной заведомой регрессии —
 * на КАЖДОЙ оракул обязан покраснеть (exit 1). Защита от оракула-тавтологии.
 *
 * Запуск: node scripts/tests/preflight.test.mjs
 * Успех: exit 0 и строка «ВСЕ ПРОВЕРКИ ПРОШЛИ» в stdout.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const oracle = resolve(here, "..", "verify-preflight.mjs");

// ------------------------------------------------------------
// Зелёные фикстуры
// ------------------------------------------------------------

const GREEN_CONTRACT = `# План

## Контракт продукта Audit Start v1 (AF-0)

### 1. SKU

Audit Start, 7 900 ₽, единица «ниша × город».

### 2. Report schema (зафиксирована по фактическому продюсеру)

sub_queries в состав платного отчёта НЕ входят.

### 3. Provenance

Каждый material claim несёт источник.

### 4. Degraded mode — порог живых платформ

Отчёт выдаётся при ≥ 2 платформы и 8 из 10 вопросов.

### 5. SLA

Цель p95 ≤ 15 минут, жёсткая граница 60 минут.

### 6. Refund / failure policy

Полный провал -> автоматический 100% возврат.

## Следующий раздел
`;

const GREEN_PLAN = `# CURRENT_PLAN

- [x] 754 исторических failures не запускаются массово: выбран archive.
`;

const GREEN_SALES = `# SALES_LOG

2026-08-30 | касания 10 | ответы 2 | демо 1 | оплаты 0
2026-08-31 | касания 12 | ответы 3 | демо 1 | оплаты 0 | заметка
`;

const GREEN_HEALTH = {
  status: "ok",
  auth: { status: "ok", magic_link_ready: true, smtp_configured: true },
  worker: {
    pending_jobs: 0,
    failed_jobs: 0,
    by_type: { expand_query: { pending: 0, processing: 0, completed: 3, failed: 0 } },
    last_expand_query: { status: "completed", subqueries: 4, error: null, completed_at: "2026-09-01T12:00:00Z" },
  },
  // DEMAND-3: проба провайдеров (форма — packages/shared/src/providers/probe.ts).
  providers: {
    wordstat: { state: "ok", detail: null, checked_at: "2026-09-06T12:00:00Z" },
    openai: { state: "ok", detail: null, checked_at: "2026-09-06T12:00:00Z" },
    yandexgpt: { state: "ok", detail: null, checked_at: "2026-09-06T12:00:00Z" },
    gigachat: { state: "ok", detail: null, checked_at: "2026-09-06T12:00:00Z" },
    perplexity: { state: "no_key", detail: null, checked_at: "2026-09-06T12:00:00Z" },
  },
  providers_summary: { llm_ok: 3, llm_required: 2, wordstat_ok: true, degraded: false, reasons: [], cached: false },
};

const boundaryBlock = (sku) =>
  `<section data-automation-boundary="${sku}"><p>граница ${sku}</p></section>`;

const GREEN_PRICING = `<html><body>
${boundaryBlock("audit-start")}
${boundaryBlock("launch-start")}
${boundaryBlock("managed-lite")}
</body></html>`;

const GREEN_AUDIT = `<html><body>${boundaryBlock("audit-start")}</body></html>`;

function writeRepo(root, { contract = GREEN_CONTRACT, plan = GREEN_PLAN, sales = GREEN_SALES, files = {} } = {}) {
  // files: произвольные файлы репо (R-02 --check-alerts); null — не создавать.
  for (const [rel, body] of Object.entries(files)) {
    if (body === null) continue;
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  writeFileSync(join(root, "docs", "plan", "SELF_SERVE_PLAN.md"), contract);
  writeFileSync(join(root, "CURRENT_PLAN.md"), plan);
  if (sales !== null) writeFileSync(join(root, "SALES_LOG.md"), sales);
}

function writeFixtures(dir, { health = GREEN_HEALTH, webhookStatus = 400, pricing = GREEN_PRICING, audit = GREEN_AUDIT } = {}) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "health.json"), JSON.stringify(health));
  writeFileSync(join(dir, "webhook.json"), JSON.stringify({ status: webhookStatus }));
  writeFileSync(join(dir, "pricing.html"), pricing);
  writeFileSync(join(dir, "audit.html"), audit);
}

function runOracle(repoRoot, fixtureDir, extraFlags = []) {
  try {
    const stdout = execFileSync(
      process.execPath,
      [oracle, "--repo-root", repoRoot, "--fixture-dir", fixtureDir, ...extraFlags],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { code: 0, out: stdout };
  } catch (err) {
    return { code: err.status ?? -1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

// ------------------------------------------------------------
// Кейсы
// ------------------------------------------------------------

const failures = [];
let caseNo = 0;

function expect(label, actual, expected, out) {
  caseNo += 1;
  if (actual === expected) {
    console.log(`  OK  [${caseNo}] ${label} -> exit ${actual}`);
  } else {
    failures.push(label);
    console.error(`FAIL  [${caseNo}] ${label}: exit ${actual}, ожидался ${expected}\n${out}`);
  }
}

const work = mkdtempSync(join(tmpdir(), "preflight-test-"));
try {
  // T0: зелёный кандидат.
  const greenRepo = join(work, "repo-green");
  const greenFx = join(work, "fx-green");
  writeRepo(greenRepo);
  writeFixtures(greenFx);
  {
    const { code, out } = runOracle(greenRepo, greenFx);
    expect("позитив: всё зелёное", code, 0, out);
  }

  // Мутации: [label, repo-overrides, fixture-overrides, extraFlags]
  const mutations = [
    ["контракт: секция «### 4. Degraded mode» удалена",
      { contract: GREEN_CONTRACT.replace("### 4. Degraded mode — порог живых платформ", "### 4. Порог") }, {}, []],
    ["контракт: маркер «автоматический 100% возврат» удалён",
      { contract: GREEN_CONTRACT.replace("автоматический 100% возврат", "возврат по заявке") }, {}, []],
    ["контракт: фиксация sub_queries снята",
      { contract: GREEN_CONTRACT.replace("НЕ входят", "входят") }, {}, []],
    ["план: решение по 754 разотмечено ([ ])",
      { plan: GREEN_PLAN.replace("- [x] 754", "- [ ] 754") }, {}, []],
    ["SALES_LOG отсутствует", { sales: null }, {}, []],
    ["SALES_LOG: последняя запись ломает формат",
      { sales: GREEN_SALES + "2026-09-01 | много касаний, все хорошие\n" }, {}, []],
    ["health: magic_link_ready=false",
      {}, { health: { ...GREEN_HEALTH, auth: { ...GREEN_HEALTH.auth, magic_link_ready: false } } }, []],
    ["health: последний expand_query failed",
      {}, {
        health: {
          ...GREEN_HEALTH,
          worker: { ...GREEN_HEALTH.worker, last_expand_query: { status: "failed", subqueries: null, error: "credit balance too low", completed_at: null } },
        },
      }, []],
    ["health: пустой успех — completed с subqueries=0 (QUEUE-4)",
      {}, {
        health: {
          ...GREEN_HEALTH,
          worker: { ...GREEN_HEALTH.worker, last_expand_query: { status: "completed", subqueries: 0, error: null, completed_at: "2026-09-01T12:00:00Z" } },
        },
      }, []],
    ["health: свидетельство last_expand_query отсутствует",
      {}, {
        health: {
          ...GREEN_HEALTH,
          worker: { ...GREEN_HEALTH.worker, last_expand_query: null },
        },
      }, []],
    ["health: блок providers отсутствует (DEMAND-3)",
      {}, { health: { ...GREEN_HEALTH, providers: undefined, providers_summary: undefined } }, []],
    ["health: providers degraded — Wordstat no_balance",
      {}, {
        health: {
          ...GREEN_HEALTH,
          providers: { ...GREEN_HEALTH.providers, wordstat: { state: "no_balance", detail: "Недостаточно средств", checked_at: "2026-09-06T12:00:00Z" } },
          providers_summary: { llm_ok: 3, llm_required: 2, wordstat_ok: false, degraded: true, reasons: ["wordstat no_balance"], cached: false },
        },
      }, []],
    ["health: providers degraded — живых LLM меньше порога",
      {}, {
        health: {
          ...GREEN_HEALTH,
          providers_summary: { llm_ok: 1, llm_required: 2, wordstat_ok: true, degraded: true, reasons: ["llm ok 1 < 2"], cached: true },
        },
      }, []],
    ["webhook: маршрут отсутствует (404)", {}, { webhookStatus: 404 }, []],
    ["webhook: принимает мусор (200)", {}, { webhookStatus: 200 }, []],
    ["pricing: нет блока managed-lite",
      {}, { pricing: GREEN_PRICING.replace(boundaryBlock("managed-lite"), "") }, []],
    ["--check-sales-today: последняя запись заведомо старая",
      { sales: "2020-01-01 | касания 1 | ответы 0 | демо 0 | оплаты 0\n" }, {}, ["--check-sales-today"]],
  ];

  mutations.forEach(([label, repoOv, fxOv, extraFlags], i) => {
    const repo = join(work, `repo-m${i}`);
    const fx = join(work, `fx-m${i}`);
    writeRepo(repo, repoOv);
    writeFixtures(fx, fxOv);
    const { code, out } = runOracle(repo, fx, extraFlags);
    expect(`мутация: ${label}`, code, 1, out);
  });

  // ===== R-02 --check-alerts: зелёное фикстурное репо контракта алертов =====
  const ALERT_FILES = {
    "packages/supabase/migrations/030_operator_alerts.sql": "CREATE TABLE public.operator_alerts (key text primary key, last_sent_at timestamptz);\nCREATE FUNCTION public.claim_operator_alert(p_key text, p_kind text, p_message text, p_dedup_seconds integer) RETURNS boolean;\nCREATE FUNCTION public.record_operator_alert_error(p_key text, p_error text) RETURNS void;\n",
    "packages/shared/src/ops/alerts.ts": "export function formatOperatorAlert() {}\nexport function alertDedupSeconds() {}\nconst KINDS = [\"health_degraded\", \"service_order\", \"quota_exhausted\"];\n",
    "packages/shared/src/ops/notify-operator.ts": "export function createOperatorNotifier(deps) { return async () => { const ok = await deps.claim(); if (!ok) return \"deduped\"; deps.recordError; } }\n",
    "apps/worker/src/services/operator-alerts.ts": "import { tgFetch } from \"shared/http/telegram-fetch\";\nimport { createOperatorNotifier } from \"shared\";\nadmin.rpc(\"claim_operator_alert\", {});\nprocess.env.TELEGRAM_ADMIN_CHAT_ID;\n",
    "apps/worker/src/services/audit-delivery.ts": "await deps.notifyOperator?.(\"order_failed\", id, {});\nawait deps.notifyOperator?.(\"order_refunded\", id, {});\nawait deps.notifyOperator?.(\"sla_breached\", id, {});\nawait deps.notifyOperator?.(\"email_failed\", id, {});\n",
    "apps/worker/src/services/payment-reconcile.ts": "await deps.notifyOperator?.(\"reconcile_mismatch\", id, {});\nawait deps.notifyOperator?.(\"reconcile_errors\", null, {});\n",
    "apps/worker/src/index.ts": "await notifyOperator(\"quota_exhausted\", jobType, {});\nawait notifyOperator(\"health_degraded\", null, {});\nfetch(new URL(\"/api/health\", base));\n",
    "apps/web/lib/operator-alerts.ts": "admin.rpc(\"claim_operator_alert\", {});\ncreateOperatorNotifier({});\n",
    "apps/web/app/api/service-orders/route.ts": "await notifyOperator(\"service_order\", data.id, {});\n",
    "apps/web/app/api/health/route.ts": "supabase.from(\"operator_alerts\");\nreturn NextResponse.json({ alerts: { last_sent_at, sent_24h, failed_24h } });\n",
  };
  const ALERT_HEALTH = { ...GREEN_HEALTH, alerts: { last_sent_at: "2026-09-08T10:00:00Z", sent_24h: 2, failed_24h: 0 } };
  {
    const repo = join(work, "alerts-green"); const fx = join(work, "alerts-fx");
    writeRepo(repo, { files: ALERT_FILES }); writeFixtures(fx, { health: ALERT_HEALTH });
    const r = runOracle(repo, fx, ["--check-alerts"]); expect("alerts: позитив", r.code, 0, r.out);
    const r2 = runOracle(repo, fx, []); expect("без --check-alerts зелёное репо без файлов алертов не требуется", r2.code, 0, r2.out);
    const bare = join(work, "alerts-bare"); writeRepo(bare); const fxb = join(work, "alerts-fx-bare"); writeFixtures(fxb, { health: { ...GREEN_HEALTH, alerts: { last_sent_at: null, sent_24h: 0, failed_24h: 0 } } });
    const r3 = runOracle(bare, fxb, ["--check-alerts"]); expect("alerts: пустое репо -> exit 1", r3.code, 1, r3.out);
    const m = /(\d+) finding\(s\)/.exec(r3.out); expect("alerts: пустое репо даёт ровно 4 групповых находки", m ? Number(m[1]) : -1, 4, r3.out);
  }
  const AF = ALERT_FILES;
  const alertMutations = [
    ["миграция: нет RPC дедупликации claim_operator_alert", { "packages/supabase/migrations/030_operator_alerts.sql": AF["packages/supabase/migrations/030_operator_alerts.sql"].replace("claim_operator_alert", "insert_alert") }],
    ["shared: notifier не дедуплицирует (нет deduped)", { "packages/shared/src/ops/notify-operator.ts": AF["packages/shared/src/ops/notify-operator.ts"].replace("\"deduped\"", "\"sent\"") }],
    ["worker: провал заказа не алертит", { "apps/worker/src/services/audit-delivery.ts": AF["apps/worker/src/services/audit-delivery.ts"].replace("notifyOperator?.(\"order_failed\"", "log(\"order_failed\"") }],
    ["worker: сверка не алертит о mismatch", { "apps/worker/src/services/payment-reconcile.ts": AF["apps/worker/src/services/payment-reconcile.ts"].replace("notifyOperator?.(\"reconcile_mismatch\"", "log(\"reconcile_mismatch\"") }],
    ["worker: квоты не алертят", { "apps/worker/src/index.ts": AF["apps/worker/src/index.ts"].replace("notifyOperator(\"quota_exhausted\"", "console.error(\"quota\"") }],
    ["worker: watcher health не читает /api/health", { "apps/worker/src/index.ts": AF["apps/worker/src/index.ts"].replace("/api/health", "/api/ping") }],
    ["worker: адаптер шлёт не через tgFetch (прокси)", { "apps/worker/src/services/operator-alerts.ts": AF["apps/worker/src/services/operator-alerts.ts"].replace("tgFetch", "fetch") }],
    ["web: заявка service-orders не алертит (B-AUTO-11)", { "apps/web/app/api/service-orders/route.ts": "return NextResponse.json({ ok: true });\n" }],
    ["web: health без блока alerts", { "apps/web/app/api/health/route.ts": "return NextResponse.json({});\n" }],
  ];
  alertMutations.forEach(([label, ov], i) => {
    const repo = join(work, `alerts-m${i}`); const fx = join(work, `alerts-fx-m${i}`);
    writeRepo(repo, { files: { ...ALERT_FILES, ...ov } }); writeFixtures(fx, { health: ALERT_HEALTH });
    const r = runOracle(repo, fx, ["--check-alerts"]); expect(`alerts мутация репо: ${label}`, r.code, 1, r.out);
  });
  const alertLiveMutations = [
    ["health: alerts.sent_24h не число (миграция 030 не применена)", { ...GREEN_HEALTH, alerts: { last_sent_at: null, sent_24h: null, failed_24h: null } }],
    ["health: alerts.last_sent_at мусор", { ...GREEN_HEALTH, alerts: { last_sent_at: "вчера", sent_24h: 1, failed_24h: 0 } }],
    ["health: блока alerts нет", { ...GREEN_HEALTH }],
  ];
  alertLiveMutations.forEach(([label, health], i) => {
    const repo = join(work, `alerts-lm${i}`); const fx = join(work, `alerts-lfx-m${i}`);
    writeRepo(repo, { files: ALERT_FILES }); writeFixtures(fx, { health });
    const r = runOracle(repo, fx, ["--check-alerts"]); expect(`alerts мутация live: ${label}`, r.code, 1, r.out);
  });

  // ===== R-04' (R-04b) --check-paid-alert: алерт order_paid при оплате (триггер ручного чека) =====
  const PAID_FILES = {
    ...ALERT_FILES,
    "packages/shared/src/ops/alerts.ts": ALERT_FILES["packages/shared/src/ops/alerts.ts"] + "const MORE = [\"order_paid\"]; // Аудит Старт: оплата получена - выбить чек в Мой налог\n",
    "apps/web/app/api/webhooks/yukassa/route.ts": "import { notifyOperator } from \"@/lib/operator-alerts\";\nif (t.changed) { void notifyOperator(\"order_paid\", orderId, {}); }\n",
    "apps/worker/src/services/payment-reconcile.ts": ALERT_FILES["apps/worker/src/services/payment-reconcile.ts"] + "if (t.changed) { void deps.notifyOperator?.(\"order_paid\", order.id, {}); }\n",
    "apps/web/app/api/orders/route.ts": "const shopMode = canary ? \"dark\" : mode;\nconst credentials = yukassaCredentials(shopMode);\ninsert({\n      payment_shop_id: credentials.shopId,\n      payment_test: shopMode === \"dark\",\n    });\nif (payment.test !== (shopMode === \"dark\")) fail();\nreturn json({\n    mode,\n    payment_test: shopMode === \"dark\",\n  });\n",
  };
  {
    const repo = join(work, "paid-green"); const fx = join(work, "paid-fx");
    writeRepo(repo, { files: PAID_FILES }); writeFixtures(fx, { health: ALERT_HEALTH });
    const r = runOracle(repo, fx, ["--check-paid-alert"]); expect("paid-alert: позитив", r.code, 0, r.out);
    const r2 = runOracle(repo, fx, ["--check-alerts"]); expect("paid-alert: --check-alerts не требует order_paid (обратная совместимость)", r2.code, 0, r2.out);
    const base = join(work, "paid-base"); const fxb = join(work, "paid-fx-base");
    writeRepo(base, { files: ALERT_FILES }); writeFixtures(fxb, { health: ALERT_HEALTH });
    const r3 = runOracle(base, fxb, ["--check-paid-alert"]); expect("paid-alert: канал R-02 без order_paid -> exit 1", r3.code, 1, r3.out);
    expect("paid-alert: находка помечена [paid-alert]", /\[paid-alert\]/.test(r3.out), true, r3.out);
  }
  const PF = PAID_FILES;
  const paidMutations = [
    ["shared: kind order_paid не в реестре", { "packages/shared/src/ops/alerts.ts": PF["packages/shared/src/ops/alerts.ts"].replace("\"order_paid\"", "\"order_done\"") }],
    ["shared: заголовок не напоминает про Мой налог", { "packages/shared/src/ops/alerts.ts": PF["packages/shared/src/ops/alerts.ts"].replace("Мой налог", "чек") }],
    ["webhook: оплата не алертит (только лог)", { "apps/web/app/api/webhooks/yukassa/route.ts": PF["apps/web/app/api/webhooks/yukassa/route.ts"].replace("notifyOperator(\"order_paid\"", "console.log(\"order_paid\"") }],
    ["webhook: алерт не через адаптер @/lib/operator-alerts", { "apps/web/app/api/webhooks/yukassa/route.ts": PF["apps/web/app/api/webhooks/yukassa/route.ts"].replace("@/lib/operator-alerts", "@/lib/telegram") }],
    ["сверка: markPaid не алертит", { "apps/worker/src/services/payment-reconcile.ts": PF["apps/worker/src/services/payment-reconcile.ts"].replace("notifyOperator?.(\"order_paid\"", "log(\"order_paid\"") }],
    ["сверка: файл отсутствует", { "apps/worker/src/services/payment-reconcile.ts": null }],
    ["orders: канарейка при live идёт в боевой магазин (инцидент 2026-09-08)", { "apps/web/app/api/orders/route.ts": PF["apps/web/app/api/orders/route.ts"].replace("? \"dark\" : mode", "? mode : mode") }],
    ["orders: объявление есть, но ключи кассы берутся по mode (частичный откат)", { "apps/web/app/api/orders/route.ts": PF["apps/web/app/api/orders/route.ts"].replace("yukassaCredentials(shopMode)", "yukassaCredentials(mode)") }],
    ["orders: payment_test заказа (INSERT) пишется по mode, ответ роута не изменён", { "apps/web/app/api/orders/route.ts": PF["apps/web/app/api/orders/route.ts"].replace("      payment_test: shopMode === \"dark\",", "      payment_test: mode === \"dark\",") }],
    ["orders: проверка payment.test ответа кассы по mode", { "apps/web/app/api/orders/route.ts": PF["apps/web/app/api/orders/route.ts"].replace("payment.test !== (shopMode", "payment.test !== (mode") }],
    ["orders: payment_test в JSON-ответе по mode, INSERT не изменён (канарейка получит ложное true/false)", { "apps/web/app/api/orders/route.ts": PF["apps/web/app/api/orders/route.ts"].replace("    mode,\n    payment_test: shopMode", "    mode,\n    payment_test: mode") }],
  ];
  paidMutations.forEach(([label, ov], i) => {
    const repo = join(work, `paid-m${i}`); const fx = join(work, `paid-fx-m${i}`);
    const files = { ...PAID_FILES }; for (const [k, v] of Object.entries(ov)) { if (v === null) delete files[k]; else files[k] = v; }
    writeRepo(repo, { files }); writeFixtures(fx, { health: ALERT_HEALTH });
    const r = runOracle(repo, fx, ["--check-paid-alert"]); expect(`paid-alert мутация: ${label}`, r.code, 1, r.out);
  });

  // Приоритет «находки > транспорт»: repo-находка не маскируется exit 3
  // (находка ревью 2026-08-31). Мёртвый URL, ретраи и таймаут минимальны.
  function runOracleLive(repoRoot, extraFlags = []) {
    try {
      const stdout = execFileSync(
        process.execPath,
        [oracle, "--repo-root", repoRoot, "--base-url", "http://127.0.0.1:1", ...extraFlags],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, PREFLIGHT_ATTEMPTS: "1", PREFLIGHT_TIMEOUT_MS: "800", PREFLIGHT_RETRY_DELAY_MS: "0" },
        },
      );
      return { code: 0, out: stdout };
    } catch (err) {
      return { code: err.status ?? -1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
    }
  }
  {
    const redRepo = join(work, "repo-transport-red");
    writeRepo(redRepo, { sales: null }); // repo-находка: SALES_LOG отсутствует
    const { code, out } = runOracleLive(redRepo);
    expect("транспорт мёртв + repo-находка -> exit 1, не 3", code, 1, out);
    if (!out.includes("SALES_LOG.md")) {
      failures.push("repo-находка не напечатана при транспортной ошибке");
      console.error("FAIL  repo-находка не напечатана при транспортной ошибке\n" + out);
    }
  }
  {
    const { code, out } = runOracleLive(join(work, "repo-green"));
    expect("транспорт мёртв + чистое репо -> exit 3", code, 3, out);
  }

  // Usage-контракт.
  {
    const { code, out } = runOracle(greenRepo, greenFx, ["--неизвестный"]);
    expect("usage: неизвестный флаг -> exit 2", code, 2, out);
  }
  {
    // repo-only на зелёном репо: живой контур не требуется.
    let res;
    try {
      const stdout = execFileSync(process.execPath, [oracle, "--repo-root", greenRepo, "--repo-only"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      res = { code: 0, out: stdout };
    } catch (err) {
      res = { code: err.status ?? -1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
    }
    expect("--repo-only на зелёном репо", res.code, 0, res.out);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\n${failures.length} провал(ов): ${failures.join("; ")}`);
  process.exit(1);
}
console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ");
