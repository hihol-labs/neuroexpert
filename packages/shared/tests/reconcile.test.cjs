const assert = require("node:assert/strict");
const test = require("node:test");

const {
  kassaShopsFromEnv, selectShopForOrder, assessPackagePayment, assessPackageRefund, assessExpertPayment,
} = require("../dist/orders/index.js");

const LIVE = { id: "1336507", key: "live_x", test: false };
const TEST = { id: "999", key: "test_x", test: true };
const ORDER = {
  id: "11111111-1111-4111-8111-111111111111",
  owner_id: "22222222-2222-4222-8222-222222222222",
  package: "audit_start",
  amount_rub: 7900,
  yukassa_payment_id: "pay-1",
  payment_test: false,
  payment_shop_id: "1336507",
};
const PAYMENT = {
  id: "pay-1", status: "succeeded", test: false,
  amount: { value: "7900.00", currency: "RUB" },
  metadata: { type: "package", package: "audit_start", order_id: ORDER.id, user_id: ORDER.owner_id },
};

test("kassaShopsFromEnv: пары без ключа отбрасываются, порядок test → live", () => {
  assert.deepEqual(kassaShopsFromEnv({ YUKASSA_SHOP_ID: "1", YUKASSA_SECRET_KEY: "k" }), [{ id: "1", key: "k", test: false }]);
  assert.deepEqual(kassaShopsFromEnv({ YUKASSA_TEST_SHOP_ID: "9" }), []);
  assert.equal(kassaShopsFromEnv({ YUKASSA_TEST_SHOP_ID: "9", YUKASSA_TEST_SECRET_KEY: "t", YUKASSA_SHOP_ID: "1", YUKASSA_SECRET_KEY: "k" }).length, 2);
});

test("selectShopForOrder: магазин заказа; без фиксации магазина при двух кандидатах — null (сверить нельзя)", () => {
  assert.equal(selectShopForOrder(ORDER, [TEST, LIVE]), LIVE);
  assert.equal(selectShopForOrder({ ...ORDER, payment_test: true, payment_shop_id: "999" }, [TEST, LIVE]), TEST);
  assert.equal(selectShopForOrder({ ...ORDER, payment_shop_id: null, payment_test: null }, [TEST, LIVE]), null);
  assert.equal(selectShopForOrder({ ...ORDER, payment_shop_id: null, payment_test: false }, [TEST, LIVE]), LIVE);
  assert.equal(selectShopForOrder(ORDER, [TEST]), null);
});

test("assessPackagePayment: эталон проходит; каждое расхождение — отказ с причиной", () => {
  assert.deepEqual(assessPackagePayment(ORDER, PAYMENT, { status: "succeeded", shop: LIVE }), { ok: true });
  const bad = (patch, orderPatch = {}) => assessPackagePayment({ ...ORDER, ...orderPatch }, { ...PAYMENT, ...patch }, { status: "succeeded", shop: LIVE });
  assert.equal(assessPackagePayment(ORDER, null, { status: "succeeded", shop: LIVE }).ok, false);
  assert.match(bad({ id: "pay-2" }).reason, /payment id/);
  assert.match(bad({ status: "pending" }).reason, /status pending/);
  assert.match(bad({ test: true }).reason, /test flag/);
  assert.match(bad({ amount: { value: "100.00", currency: "RUB" } }).reason, /amount/);
  assert.match(bad({ amount: { value: "7900.00", currency: "USD" } }).reason, /amount/);
  assert.match(bad({ metadata: { ...PAYMENT.metadata, order_id: "other" } }).reason, /order mismatch/);
  assert.match(bad({ metadata: { ...PAYMENT.metadata, user_id: "other" } }).reason, /owner mismatch/);
  assert.match(bad({ metadata: { ...PAYMENT.metadata, package: "launch" } }).reason, /package mismatch/);
  assert.match(bad({ metadata: undefined }).reason, /package mismatch/);
  // Подделка payment.canceled: API говорит succeeded — событие отвергается.
  assert.match(assessPackagePayment(ORDER, PAYMENT, { status: "canceled", shop: LIVE }).reason, /expected canceled/);
  assert.deepEqual(assessPackagePayment(ORDER, { ...PAYMENT, status: "canceled" }, { status: "canceled", shop: LIVE }), { ok: true });
});

test("assessPackageRefund: успешный возврат по платежу заказа, не больше суммы; подделка отвергается", () => {
  const refund = { id: "rf-1", status: "succeeded", payment_id: "pay-1", amount: { value: "7900.00", currency: "RUB" } };
  assert.deepEqual(assessPackageRefund(ORDER, refund, PAYMENT, LIVE), { ok: true });
  assert.equal(assessPackageRefund(ORDER, null, PAYMENT, LIVE).ok, false);
  assert.match(assessPackageRefund(ORDER, { ...refund, status: "pending" }, PAYMENT, LIVE).reason, /refund status/);
  assert.match(assessPackageRefund(ORDER, { ...refund, payment_id: "pay-9" }, PAYMENT, LIVE).reason, /refund payment/);
  assert.match(assessPackageRefund(ORDER, { ...refund, amount: { value: "9000.00", currency: "RUB" } }, PAYMENT, LIVE).reason, /refund amount/);
  assert.match(assessPackageRefund(ORDER, refund, { ...PAYMENT, metadata: { ...PAYMENT.metadata, order_id: "x" } }, LIVE).reason, /order mismatch/);
});

test("assessExpertPayment: legacy-контур сверяет id, статус и expert_id", () => {
  const p = { id: "pay-e", status: "succeeded", amount: { value: "990.00", currency: "RUB" }, metadata: { expert_id: "exp-1", type: "subscription" } };
  assert.deepEqual(assessExpertPayment(p, { paymentId: "pay-e", expertId: "exp-1", status: "succeeded" }), { ok: true });
  assert.equal(assessExpertPayment(null, { paymentId: "pay-e", expertId: "exp-1", status: "succeeded" }).ok, false);
  assert.match(assessExpertPayment(p, { paymentId: "pay-e", expertId: "exp-2", status: "succeeded" }).reason, /expert/);
  assert.match(assessExpertPayment(p, { paymentId: "pay-e", expertId: "exp-1", status: "canceled" }).reason, /expected canceled/);
  assert.match(assessExpertPayment({ ...p, amount: undefined }, { paymentId: "pay-e", expertId: "exp-1", status: "succeeded" }).reason, /amount/);
});
