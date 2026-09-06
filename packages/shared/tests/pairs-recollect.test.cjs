const assert = require("node:assert/strict");
const test = require("node:test");

const { decidePairPreflight, isPairRecollectDue, PAIR_RECOLLECT_DAYS } = require("../dist/pairs/index.js");

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 6, 12);
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();

test("DEMAND-1: порог повтора 7 дней; свежий empty не повторяется, старый — повторяется", () => {
  assert.equal(PAIR_RECOLLECT_DAYS, 7);
  assert.equal(isPairRecollectDue(iso(6 * DAY), NOW), false);
  assert.equal(isPairRecollectDue(iso(7 * DAY), NOW), true);
  assert.equal(isPairRecollectDue(iso(30 * DAY), NOW), true);
  assert.equal(isPairRecollectDue(null, NOW), false, "без отметки времени давность неизвестна — повтор не ставим (расход XMLRIVER)");
  assert.equal(isPairRecollectDue("garbage", NOW), false);
});

test("decidePairPreflight: empty свежий → empty без enqueue; empty старше 7 дней → collecting + enqueue + recollect", () => {
  const fresh = decidePairPreflight({ questionCount: 2, demandStatus: "empty", demandCollectedAt: iso(2 * DAY), now: NOW });
  assert.equal(fresh.status, "empty");
  assert.equal(fresh.enqueue, false);
  assert.equal(fresh.recollect, false);
  const stale = decidePairPreflight({ questionCount: 2, demandStatus: "empty", demandCollectedAt: iso(8 * DAY), now: NOW });
  assert.equal(stale.status, "collecting");
  assert.equal(stale.enqueue, true);
  assert.equal(stale.recollect, true);
  assert.match(stale.message, /повторный замер/);
});

test("decidePairPreflight: прежнее поведение сохранено — null → enqueue без recollect; queued/running → без enqueue; ready при ≥ 10", () => {
  assert.deepEqual(decidePairPreflight({ questionCount: 0, demandStatus: null, now: NOW }).enqueue, true);
  assert.equal(decidePairPreflight({ questionCount: 0, demandStatus: null, now: NOW }).recollect, false);
  assert.equal(decidePairPreflight({ questionCount: 0, demandStatus: "queued", now: NOW }).enqueue, false);
  assert.equal(decidePairPreflight({ questionCount: 3, demandStatus: "running", now: NOW }).enqueue, false);
  assert.deepEqual(decidePairPreflight({ questionCount: 10, demandStatus: "empty", demandCollectedAt: iso(30 * DAY), now: NOW }), { status: "ready" });
  // Старый вызов без demandCollectedAt: empty без отметки → прежнее поведение (empty, без повтора).
  assert.equal(decidePairPreflight({ questionCount: 0, demandStatus: "empty" }).status, "empty");
  assert.equal(decidePairPreflight({ questionCount: 0, demandStatus: "empty" }).recollect, false);
});
