const assert = require("node:assert/strict");
const test = require("node:test");

const {
  PACKAGE_REGISTRY, getPackage, isPackageId,
  transition, mayEnqueueAuditJob,
  decidePreflight, countConfiguredPlatforms, PREFLIGHT_MIN_PLATFORMS,
  buildPackagePaymentMetadata, parsePackageMetadata,
} = require("../dist/orders/index.js");

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";

test("реестр: audit_start = 7 900 ₽, 10 вопросов, SLA 15/60 (контракт v1)", () => {
  const p = getPackage("audit_start");
  assert.equal(p.amountRub, 7900);
  assert.equal(p.questionCount, 10);
  assert.equal(p.slaTargetMinutes, 15);
  assert.equal(p.slaHardLimitMinutes, 60);
  assert.ok(Object.isFrozen(PACKAGE_REGISTRY));
});

test("реестр: неизвестный пакет и мусор отвергаются", () => {
  assert.equal(getPackage("audit_full"), null);
  assert.equal(getPackage(undefined), null);
  assert.equal(isPackageId("__proto__"), false);
});

test("машина состояний: штатные переходы", () => {
  assert.deepEqual(transition("pending", "payment.succeeded"), { ok: true, next: "paid", changed: true });
  assert.deepEqual(transition("pending", "payment.canceled"), { ok: true, next: "failed", changed: true });
  assert.deepEqual(transition("paid", "refund.succeeded"), { ok: true, next: "refunded", changed: true });
});

test("машина состояний: повтор webhook идемпотентен", () => {
  assert.deepEqual(transition("paid", "payment.succeeded"), { ok: true, next: "paid", changed: false });
  assert.deepEqual(transition("refunded", "refund.succeeded"), { ok: true, next: "refunded", changed: false });
});

test("машина состояний: запрещённые переходы", () => {
  assert.equal(transition("failed", "payment.succeeded").ok, false);
  assert.equal(transition("pending", "refund.succeeded").ok, false);
  assert.equal(transition("refunded", "payment.succeeded").ok, false);
  assert.equal(transition("paid", "unknown.event").ok, false);
});

test("job аудита: только из paid и только один раз", () => {
  assert.equal(mayEnqueueAuditJob("paid", null), true);
  assert.equal(mayEnqueueAuditJob("paid", U1), false);
  assert.equal(mayEnqueueAuditJob("pending", null), false);
  assert.equal(mayEnqueueAuditJob("refunded", null), false);
});

test("pre-flight: платформы ниже порога -> deny platforms", () => {
  const d = decidePreflight({ configuredPlatforms: PREFLIGHT_MIN_PLATFORMS - 1, questionCount: 50 });
  assert.equal(d.allow, false);
  assert.equal(d.reason, "platforms");
});

test("pre-flight: нет вопросов по паре -> deny questions (данные раньше денег)", () => {
  const d = decidePreflight({ configuredPlatforms: 3, questionCount: 0 });
  assert.equal(d.allow, false);
  assert.equal(d.reason, "questions");
});

test("pre-flight: порог достигнут -> allow", () => {
  assert.deepEqual(decidePreflight({ configuredPlatforms: 2, questionCount: 1 }), { allow: true });
});

test("платформы по конфигурации: то же множество, что у /api/audit", () => {
  assert.equal(countConfiguredPlatforms({}), 0);
  assert.equal(countConfiguredPlatforms({ OPENAI_API_KEY: "k" }), 1);
  assert.equal(countConfiguredPlatforms({ OPENAI_API_KEY: "k", GIGACHAT_CLIENT_ID: "a", GIGACHAT_CLIENT_SECRET: "b" }), 2);
  assert.equal(countConfiguredPlatforms({ YANDEX_API_KEY: "k" }), 0, "Yandex без FOLDER_ID не считается");
  assert.equal(countConfiguredPlatforms({ YANDEX_API_KEY: "k", YANDEX_FOLDER_ID: "f", PERPLEXITY_API_KEY: "p" }), 2);
});

test("metadata: build -> parse round-trip", () => {
  const m = buildPackagePaymentMetadata({ package: "audit_start", orderId: U1, userId: U2 });
  assert.deepEqual(parsePackageMetadata(m), { type: "package", package: "audit_start", order_id: U1, user_id: U2 });
});

test("metadata: expert-платёж и мусор -> null (уходят в прежнюю ветку)", () => {
  assert.equal(parsePackageMetadata({ type: "subscription", expert_id: U1 }), null);
  assert.equal(parsePackageMetadata({ type: "package", package: "audit_full", order_id: U1, user_id: U2 }), null);
  assert.equal(parsePackageMetadata({ type: "package", package: "audit_start", order_id: "not-uuid", user_id: U2 }), null);
  assert.equal(parsePackageMetadata(null), null);
});
