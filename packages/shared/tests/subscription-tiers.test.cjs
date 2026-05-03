const assert = require("node:assert/strict");
const test = require("node:test");

const { ALL_FORMATS, SUBSCRIPTION_TIERS } = require("../dist/constants.js");

test("paid tiers expose all content formats", () => {
  for (const tierId of ["starter", "pro", "expert", "business", "enterprise"]) {
    assert.deepEqual(SUBSCRIPTION_TIERS[tierId].formats, ALL_FORMATS);
    assert.deepEqual(SUBSCRIPTION_TIERS[tierId].exportableFormats, ALL_FORMATS);
  }
});

test("free tier keeps the intended monetization limits", () => {
  assert.equal(SUBSCRIPTION_TIERS.free.price, 0);
  assert.equal(SUBSCRIPTION_TIERS.free.maxNiches, 1);
  assert.equal(SUBSCRIPTION_TIERS.free.packagesPerMonth, 3);
  assert.equal(SUBSCRIPTION_TIERS.free.commission, 0.15);
  assert.deepEqual(SUBSCRIPTION_TIERS.free.exportableFormats, ["telegram_post"]);
});
