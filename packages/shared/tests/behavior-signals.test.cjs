const assert = require("node:assert/strict");
const test = require("node:test");

const { deriveBehaviorSignals } = require("../dist/demand-to-revenue.js");

// Хелпер: N событий одного типа на одной странице.
function ev(type, count, extra = {}) {
  return Array.from({ length: count }, () => ({
    event_type: type,
    content_id: "page-1",
    ...extra,
  }));
}

const types = (signals) => signals.map((s) => s.signal_type).sort();

test("BUG-3: views_without_leads срабатывает на 30+ просмотрах без заявки", () => {
  const signals = deriveBehaviorSignals(ev("view", 35));
  assert.ok(signals.some((s) => s.signal_type === "views_without_leads"));
});

test("BUG-3: любое правило молчит, если есть заявка (form_submit)", () => {
  const events = [...ev("view", 50), ...ev("cta_click", 10), ...ev("form_submit", 1)];
  assert.deepEqual(deriveBehaviorSignals(events), []);
});

test("BUG-3: phone_without_sale на 5+ кликах по телефону без заявки", () => {
  const signals = deriveBehaviorSignals(ev("phone_click", 6));
  assert.ok(signals.some((s) => s.signal_type === "phone_without_sale"));
});

test("BUG-3 (new): cta_without_lead на 3+ кликах CTA без формы", () => {
  const signals = deriveBehaviorSignals(ev("cta_click", 4));
  assert.ok(signals.some((s) => s.signal_type === "cta_without_lead"));
});

test("BUG-3 (new): high_intent_drop на 4+ высоко-намеренных действиях", () => {
  const events = [...ev("form_start", 2), ...ev("route_click", 1), ...ev("messenger_click", 1)];
  const signals = deriveBehaviorSignals(events);
  assert.ok(signals.some((s) => s.signal_type === "high_intent_drop"));
});

test("BUG-3 (new): faq_gap на повторных визитах (views/sessions >= 3)", () => {
  // 30 просмотров от 3 сессий = 10 просмотров на сессию (повторные заходы).
  const events = [
    ...ev("view", 10, { session_hash: "s1" }),
    ...ev("view", 10, { session_hash: "s2" }),
    ...ev("view", 10, { session_hash: "s3" }),
  ];
  const signals = deriveBehaviorSignals(events);
  assert.ok(signals.some((s) => s.signal_type === "faq_gap"));
});

test("BUG-3: faq_gap НЕ срабатывает при разовых визитах (по сессии на просмотр)", () => {
  const events = Array.from({ length: 30 }, (_, i) => ({
    event_type: "view",
    content_id: "page-1",
    session_hash: `s${i}`,
  }));
  const signals = deriveBehaviorSignals(events);
  assert.ok(!signals.some((s) => s.signal_type === "faq_gap"));
});

test("BUG-3: на одной горячей странице срабатывает несколько правил", () => {
  const events = [
    ...ev("view", 120, { session_hash: "s1" }),
    ...ev("cta_click", 12),
    ...ev("form_start", 11),
    ...ev("phone_click", 7),
  ];
  const t = types(deriveBehaviorSignals(events));
  assert.ok(t.includes("views_without_leads"));
  assert.ok(t.includes("cta_without_lead"));
  assert.ok(t.includes("high_intent_drop"));
  assert.ok(t.includes("phone_without_sale"));
});

test("BUG-3: пустой вход → нет сигналов", () => {
  assert.deepEqual(deriveBehaviorSignals([]), []);
});

test("BUG-3: severity high при больших объёмах", () => {
  const signals = deriveBehaviorSignals(ev("view", 150));
  const v = signals.find((s) => s.signal_type === "views_without_leads");
  assert.equal(v.severity, "high");
});
