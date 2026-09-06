const assert = require("node:assert/strict");
const test = require("node:test");

const {
  SlidingWindowLimiter, DailyBudget, parseLimitEnv, clientIpFromHeaders, DEFAULT_MAX_KEYS,
} = require("../dist/security/index.js");

test("sliding window: limit за окно, отказ ничего не записывает, окно освобождается", () => {
  const l = new SlidingWindowLimiter({ limit: 2, windowMs: 1000 });
  assert.equal(l.consume("a", 0).allowed, true);
  assert.equal(l.consume("a", 100).allowed, true);
  const denied = l.consume("a", 200);
  assert.equal(denied.allowed, false);
  assert.equal(denied.remaining, 0);
  assert.equal(denied.retryAfterMs, 800);
  // Отказ не «продлевает» блокировку: после истечения первого хита слот свободен.
  assert.equal(l.consume("a", 1001).allowed, true);
  // Другой ключ независим.
  assert.equal(l.consume("b", 200).allowed, true);
});

test("sliding window: число ключей ограничено maxKeys (защита памяти от подделки XFF)", () => {
  const l = new SlidingWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 100 });
  for (let i = 0; i < 1000; i += 1) l.consume(`ip-${i}`, i);
  assert.ok(l.size() <= 100, `size=${l.size()}`);
  // Самые свежие ключи сохраняются, самые старые вытеснены.
  assert.equal(l.consume("ip-999", 1000).allowed, false);
  assert.equal(l.consume("ip-0", 1000).allowed, true);
});

test("sliding window: по умолчанию DEFAULT_MAX_KEYS, валидация опций", () => {
  assert.equal(DEFAULT_MAX_KEYS, 10_000);
  assert.throws(() => new SlidingWindowLimiter({ limit: 0, windowMs: 10 }));
  assert.throws(() => new SlidingWindowLimiter({ limit: 1, windowMs: 0 }));
});

test("daily budget: лимит на сутки UTC, сброс при смене дня, нулевой бюджет = всё закрыто", () => {
  const b = new DailyBudget(2);
  const day1 = Date.UTC(2026, 8, 6, 10);
  assert.deepEqual(b.consume(day1), { allowed: true, used: 1, limit: 2, day: "2026-09-06" });
  assert.equal(b.consume(day1 + 1).allowed, true);
  assert.equal(b.consume(day1 + 2).allowed, false);
  assert.equal(b.snapshot(day1 + 3).used, 2);
  const day2 = Date.UTC(2026, 8, 7, 0, 0, 1);
  assert.deepEqual(b.consume(day2), { allowed: true, used: 1, limit: 2, day: "2026-09-07" });
  const zero = new DailyBudget(0);
  assert.equal(zero.consume(day1).allowed, false);
  assert.throws(() => new DailyBudget(-1));
});

test("parseLimitEnv: пусто/мусор → fallback, целое ≥ 0 принимается", () => {
  assert.equal(parseLimitEnv(undefined, 5), 5);
  assert.equal(parseLimitEnv("", 5), 5);
  assert.equal(parseLimitEnv("abc", 5), 5);
  assert.equal(parseLimitEnv("-3", 5), 5);
  assert.equal(parseLimitEnv("2.5", 5), 5);
  assert.equal(parseLimitEnv("0", 5), 0);
  assert.equal(parseLimitEnv("12", 5), 12);
});

test("clientIpFromHeaders: первый XFF, иначе X-Real-IP, иначе unknown; длина ограничена", () => {
  const h = (map) => (name) => map[name] ?? null;
  assert.equal(clientIpFromHeaders(h({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
  assert.equal(clientIpFromHeaders(h({ "x-real-ip": " 5.6.7.8 " })), "5.6.7.8");
  assert.equal(clientIpFromHeaders(h({})), "unknown");
  assert.equal(clientIpFromHeaders(h({ "x-forwarded-for": "x".repeat(200) })).length, 64);
});
