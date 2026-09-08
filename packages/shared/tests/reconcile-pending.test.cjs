// R-01 (ADR-004): решение сверки по pending/expired-заказу и статус expired в машине состояний.
const assert = require("node:assert/strict");
const test = require("node:test");

const { decidePendingOrder, transition, mayEnqueueAuditJob } = require("../dist/orders/index.js");

const LIVE = { id: "1336507", key: "live_x", test: false };
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-09-08T12:00:00Z");
const ORDER = {
  id: "11111111-1111-4111-8111-111111111111",
  owner_id: "22222222-2222-4222-8222-222222222222",
  package: "audit_start",
  amount_rub: 7900,
  yukassa_payment_id: "pay-1",
  payment_test: false,
  payment_shop_id: "1336507",
  status: "pending",
  created_at: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(), // 2 часа назад
};
const PAYMENT = {
  id: "pay-1", status: "succeeded", test: false,
  amount: { value: "7900.00", currency: "RUB" },
  metadata: { type: "package", package: "audit_start", order_id: ORDER.id, user_id: ORDER.owner_id },
};
const opts = (over = {}) => ({ now: NOW, expireAfterMs: DAY, shop: LIVE, ...over });

test("потерянный webhook: succeeded в кассе + идентичность сошлась -> mark_paid", () => {
  assert.deepEqual(decidePendingOrder(ORDER, PAYMENT, opts()), { action: "mark_paid" });
});

test("succeeded, но сумма/metadata не сходятся -> keep с причиной (руками не чинить)", () => {
  const d = decidePendingOrder(ORDER, { ...PAYMENT, amount: { value: "100.00", currency: "RUB" } }, opts());
  assert.equal(d.action, "keep");
  assert.match(d.reason, /succeeded but payment amount mismatch/);
  const d2 = decidePendingOrder(ORDER, { ...PAYMENT, metadata: { ...PAYMENT.metadata, order_id: "other" } }, opts());
  assert.equal(d2.action, "keep");
});

test("canceled в кассе -> mark_failed (денег нет)", () => {
  assert.deepEqual(decidePendingOrder(ORDER, { ...PAYMENT, status: "canceled" }, opts()), { action: "mark_failed", reason: "payment.canceled" });
});

test("платёж ещё pending в кассе внутри окна -> keep; старше окна -> expire", () => {
  assert.equal(decidePendingOrder(ORDER, { ...PAYMENT, status: "pending" }, opts()).action, "keep");
  const stale = { ...ORDER, created_at: new Date(NOW - 25 * 60 * 60 * 1000).toISOString() };
  assert.deepEqual(decidePendingOrder(stale, { ...PAYMENT, status: "pending" }, opts()), { action: "expire" });
  // Окно — параметр: 48 часов ещё не протухло.
  assert.equal(decidePendingOrder(stale, { ...PAYMENT, status: "pending" }, opts({ expireAfterMs: 2 * DAY })).action, "keep");
});

test("заказ без платежа в кассе (id нет или 404) протухает по окну, внутри окна ждёт", () => {
  const noId = { ...ORDER, yukassa_payment_id: null };
  assert.equal(decidePendingOrder(noId, null, opts()).action, "keep");
  const staleNoId = { ...noId, created_at: new Date(NOW - 2 * DAY).toISOString() };
  assert.deepEqual(decidePendingOrder(staleNoId, null, opts()), { action: "expire" });
  const stale404 = { ...ORDER, created_at: new Date(NOW - 2 * DAY).toISOString() };
  assert.deepEqual(decidePendingOrder(stale404, null, opts()), { action: "expire" });
});

test("магазин заказа недоступен -> keep, состояние не меняется даже для старого заказа", () => {
  const stale = { ...ORDER, created_at: new Date(NOW - 3 * DAY).toISOString() };
  assert.deepEqual(decidePendingOrder(stale, PAYMENT, opts({ shop: null })), { action: "keep", reason: "payment shop unavailable" });
});

test("оплата после протухания: expired + succeeded -> mark_paid; expired без оплаты остаётся expired", () => {
  const expired = { ...ORDER, status: "expired", created_at: new Date(NOW - 5 * DAY).toISOString() };
  assert.deepEqual(decidePendingOrder(expired, PAYMENT, opts()), { action: "mark_paid" });
  assert.equal(decidePendingOrder(expired, { ...PAYMENT, status: "pending" }, opts()).action, "keep");
  assert.equal(decidePendingOrder(expired, null, opts()).action, "keep");
});

test("машина состояний: order.expired только из pending; payment.succeeded из expired разрешён", () => {
  assert.deepEqual(transition("pending", "order.expired"), { ok: true, next: "expired", changed: true });
  assert.deepEqual(transition("expired", "payment.succeeded"), { ok: true, next: "paid", changed: true });
  assert.deepEqual(transition("expired", "order.expired"), { ok: true, next: "expired", changed: false });
  assert.equal(transition("paid", "order.expired").ok, false);
  assert.equal(transition("failed", "order.expired").ok, false);
  assert.equal(transition("expired", "refund.succeeded").ok, false);
  assert.equal(mayEnqueueAuditJob("expired", null), false);
});
