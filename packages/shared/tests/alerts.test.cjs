// R-02 (ADR-004): реестр алертов и notifyOperator (дедуп, отказоустойчивость, отключенный канал).
const assert = require("node:assert/strict");
const test = require("node:test");
const { alertKey, alertDedupSeconds, formatOperatorAlert, createOperatorNotifier, OPERATOR_ALERT_KINDS, isOperatorAlertKind } = require("../dist/ops/index.js");

test("ключ: вид + безопасный id; без id — только вид", () => {
  assert.equal(alertKey("order_failed", "11111111-1111-4111-8111-111111111111"), "order_failed:11111111-1111-4111-8111-111111111111");
  assert.equal(alertKey("reconcile_errors"), "reconcile_errors");
  assert.equal(alertKey("quota_exhausted", "expand query/ru"), "quota_exhausted:expand_query_ru");
});

test("дедуп: 1 час по умолчанию, квоты 6 часов; все виды в реестре", () => {
  assert.equal(alertDedupSeconds("order_failed"), 3600);
  assert.equal(alertDedupSeconds("quota_exhausted"), 6 * 3600);
  assert.ok(OPERATOR_ALERT_KINDS.length >= 11);
  assert.ok(isOperatorAlertKind("health_degraded")); assert.ok(!isOperatorAlertKind("nope"));
});

test("R-04b: order_paid в реестре, дедуп по заказу 1 час, текст напоминает про чек в Мой налог", () => {
  assert.ok(isOperatorAlertKind("order_paid"));
  assert.equal(alertDedupSeconds("order_paid"), 3600);
  assert.equal(alertKey("order_paid", "ord-1"), "order_paid:ord-1");
  const t = formatOperatorAlert("order_paid", { заказ: "ord-1", сумма: "7900 руб", email: "c@x.ru", ссылка: "https://neuroexpertise.ru/orders/ord-1", тест: "" });
  assert.match(t, /^\[NeuroExpert\] Аудит Старт: оплата получена - выбить чек в Мой налог\n/);
  assert.match(t, /сумма: 7900 руб\nemail: c@x.ru\nссылка: https:\/\/neuroexpertise.ru\/orders\/ord-1$/);
  assert.ok(!/тест:/.test(t));
});

test("текст: заголовок + поля, пустые пропускаются, без переносов внутри значения, лимит 3500", () => {
  const t = formatOperatorAlert("service_order", { пакет: "launch_30d", email: "a@x", город: "", ниша: null, long: "x".repeat(1000) });
  assert.match(t, /^\[NeuroExpert\] Новая заявка Launch Start \/ Managed Lite\n/);
  assert.match(t, /пакет: launch_30d\nemail: a@x\n/);
  assert.ok(!/город:/.test(t) && !/ниша:/.test(t));
  assert.ok(t.length <= 3500);
  assert.ok(!/ё/.test(formatOperatorAlert("order_failed")), "без ё");
});

function harness(over = {}) {
  const h = { claims: [], sent: [], errors: [], logs: [], state: new Map() };
  h.notify = createOperatorNotifier({
    claim: async (key, kind, msg, dedup) => { h.claims.push({ key, kind, dedup }); if (over.claimThrows) throw new Error("db down");
      const last = h.state.get(key); const now = over.now ?? 1000_000; if (last !== undefined && now - last < dedup * 1000) return false; h.state.set(key, now); return true; },
    send: async (text) => { if (over.sendThrows) throw new Error("tg 502"); h.sent.push(text); },
    recordError: async (key, err) => { h.errors.push({ key, err }); },
    enabled: over.enabled, log: (l) => h.logs.push(l), ...over.deps,
  });
  return h;
}

test("первый алерт отправляется, повтор в окне — deduped, претензия к БД одна на вызов", async () => {
  const h = harness();
  assert.equal(await h.notify("order_failed", "o1", { сумма: 7900 }), "sent");
  assert.equal(await h.notify("order_failed", "o1", { сумма: 7900 }), "deduped");
  assert.equal(await h.notify("order_failed", "o2"), "sent");
  assert.equal(h.sent.length, 2); assert.equal(h.claims.length, 3); assert.equal(h.claims[0].dedup, 3600);
});

test("Telegram упал: failed + recordError, исключение не выходит наружу", async () => {
  const h = harness({ sendThrows: true });
  assert.equal(await h.notify("sla_breached", "o1"), "failed");
  assert.deepEqual(h.errors.map(e => e.key), ["sla_breached:o1"]);
  assert.ok(h.logs.some(l => /send failed: tg 502/.test(l)));
});

test("БД недоступна: failed без исключения; канал не сконфигурирован: skipped без обращения к БД", async () => {
  const h = harness({ claimThrows: true });
  assert.equal(await h.notify("reconcile_errors", null), "failed");
  const h2 = harness({ enabled: () => false });
  assert.equal(await h2.notify("health_degraded", null), "skipped");
  assert.equal(h2.claims.length, 0);
});
