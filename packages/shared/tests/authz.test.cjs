const assert = require("node:assert/strict");
const test = require("node:test");

const {
  scopeBusinessIds,
  isExpertOwnedByKey,
  reviewMutationDecision,
} = require("../dist/authz.js");

// SEC-1 — scopeBusinessIds
test("scopeBusinessIds: запрошенный доступный business → scope = [он]", () => {
  assert.deepEqual(scopeBusinessIds("b1", ["b1", "b2"]), { allowed: true, scope: ["b1"] });
});

test("SEC-1: запрошенный НЕдоступный business → forbidden, пустой scope", () => {
  assert.deepEqual(scopeBusinessIds("bX", ["b1", "b2"]), { allowed: false, scope: [] });
});

test("scopeBusinessIds: без business_id → scope = все доступные", () => {
  assert.deepEqual(scopeBusinessIds(null, ["b1", "b2"]), { allowed: true, scope: ["b1", "b2"] });
});

test("SEC-1: без business_id и без доступных → не allowed, пустой scope (нет утечки всех бизнесов)", () => {
  assert.deepEqual(scopeBusinessIds(undefined, []), { allowed: false, scope: [] });
});

// SEC-2 — isExpertOwnedByKey
test("SEC-2: expert_id владельца ключа → разрешён", () => {
  assert.equal(isExpertOwnedByKey("u1", "u1"), true);
});

test("SEC-2: чужой expert_id → запрещён", () => {
  assert.equal(isExpertOwnedByKey("u2", "u1"), false);
});

test("isExpertOwnedByKey: без expert_id фильтра → ограничение неприменимо", () => {
  assert.equal(isExpertOwnedByKey(null, "u1"), true);
});

test("isExpertOwnedByKey: пустая строка трактуется как отсутствие фильтра (true)", () => {
  // В роуте expertId="" falsy → ветка citations не выполняется (data:[]), утечки нет.
  assert.equal(isExpertOwnedByKey("", "u1"), true);
});

// SEC-5 — reviewMutationDecision
test("SEC-5: владелец item → allow", () => {
  assert.equal(reviewMutationDecision("u1", "u1", null), "allow");
});

test("SEC-5: не владелец и business_id == null → forbid (закрытая дыра)", () => {
  assert.equal(reviewMutationDecision("u2", "u1", null), "forbid");
});

test("SEC-5: не владелец и business_id == undefined → forbid", () => {
  assert.equal(reviewMutationDecision("u2", "u1", undefined), "forbid");
});

test("SEC-5: не владелец, но есть business_id → нужна проверка доступа", () => {
  assert.equal(reviewMutationDecision("u2", "u1", "b1"), "needs_business_check");
});
