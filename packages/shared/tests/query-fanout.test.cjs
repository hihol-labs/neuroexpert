const assert = require("node:assert/strict");
const test = require("node:test");

const { normalizeFanoutResponse } = require("../dist/prompts/query-fanout.js");

const item = (query) => ({ query, cluster: "informational", user_intent: "i", desired_answer: "d", next_cta: "c" });

test("массив объектов проходит как есть", () => {
  const out = normalizeFanoutResponse([item("а"), item("б")]);
  assert.equal(out.length, 2);
  assert.equal(out[1].query, "б");
});

test("массив строк проходит как есть", () => {
  assert.deepEqual(normalizeFanoutResponse(["а", "б"]), ["а", "б"]);
});

test("OpenAI json_object: массив завёрнут в ключ subqueries", () => {
  const out = normalizeFanoutResponse({ subqueries: [item("а"), item("б"), item("в")] });
  assert.equal(out.length, 3);
});

test("OpenAI json_object: массив под произвольным ключом", () => {
  const out = normalizeFanoutResponse({ fanout_queries: [item("а")] });
  assert.equal(out.length, 1);
  assert.equal(out[0].query, "а");
});

test("пустые и мусорные элементы отбрасываются", () => {
  const out = normalizeFanoutResponse([item(""), item("   "), { cluster: "x" }, 42, null, "ок"]);
  assert.deepEqual(out, ["ок"]);
});

test("объект без массива внутри -> пусто (решение об ошибке — у вызывающего)", () => {
  assert.deepEqual(normalizeFanoutResponse({ answer: "нет" }), []);
  assert.deepEqual(normalizeFanoutResponse({}), []);
  assert.deepEqual(normalizeFanoutResponse(null), []);
  assert.deepEqual(normalizeFanoutResponse("текст"), []);
});
