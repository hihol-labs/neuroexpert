const assert = require("node:assert/strict");
const test = require("node:test");

const {
  classifyHttpProbe, classifyWordstatBody, summarizeProviders,
  PROVIDERS_MIN_LLM, PROVIDERS_CACHE_MS, PROVIDER_IDS, LLM_PROVIDER_IDS,
} = require("../dist/providers/index.js");
const { PREFLIGHT_MIN_PLATFORMS } = require("../dist/orders/index.js");

const probe = (state) => ({ state, detail: null, checked_at: "2026-09-06T00:00:00Z" });

test("константы: порог LLM = порог pre-flight, кеш 10 минут, 5 провайдеров", () => {
  assert.equal(PROVIDERS_MIN_LLM, PREFLIGHT_MIN_PLATFORMS);
  assert.equal(PROVIDERS_CACHE_MS, 600_000);
  assert.deepEqual([...PROVIDER_IDS], ["wordstat", "openai", "yandexgpt", "gigachat", "perplexity"]);
  assert.deepEqual([...LLM_PROVIDER_IDS], ["openai", "yandexgpt", "gigachat", "perplexity"]);
});

test("classifyHttpProbe: 2xx ok; 401/403 forbidden; 403 с биллингом → no_balance (инцидент Yandex); 402/429-quota → no_balance; прочее error", () => {
  assert.deepEqual(classifyHttpProbe(200, ""), { state: "ok", detail: null });
  assert.equal(classifyHttpProbe(401, "invalid api key").state, "forbidden");
  assert.equal(classifyHttpProbe(403, '{"message":"Permission denied"}').state, "forbidden");
  assert.equal(classifyHttpProbe(403, "The cloud is blocked: billing account has no payment").state, "no_balance");
  assert.equal(classifyHttpProbe(402, "").state, "no_balance");
  assert.equal(classifyHttpProbe(429, '{"error":{"type":"insufficient_quota"}}').state, "no_balance");
  assert.equal(classifyHttpProbe(429, "rate limit").state, "error");
  assert.equal(classifyHttpProbe(500, "boom").state, "error");
  assert.ok(classifyHttpProbe(500, "x".repeat(300)).detail.length < 140, "detail усечён");
});

test("classifyWordstatBody: фразы → ok; ошибка баланса → no_balance; ошибка ключа → forbidden; 0 фраз → empty; XML-ошибка распознаётся", () => {
  assert.equal(classifyWordstatBody(200, JSON.stringify({ content: { includingPhrases: { items: [{ phrase: "стоматология тюмень", number: 100 }] } } })).state, "ok");
  assert.equal(classifyWordstatBody(200, JSON.stringify({ popular: [{ phrase: "x" }] })).state, "ok");
  assert.equal(classifyWordstatBody(200, JSON.stringify({ error: "Недостаточно средств на балансе" })).state, "no_balance");
  assert.equal(classifyWordstatBody(200, JSON.stringify({ error: { message: "Insufficient balance" } })).state, "no_balance");
  assert.equal(classifyWordstatBody(200, JSON.stringify({ error: "Неверный ключ доступа" })).state, "forbidden");
  assert.equal(classifyWordstatBody(200, JSON.stringify({ error: "Сервис временно недоступен" })).state, "error");
  assert.equal(classifyWordstatBody(200, JSON.stringify({ content: { includingPhrases: { items: [] } } })).state, "empty");
  assert.equal(classifyWordstatBody(200, "<response><error code=\"31\">Закончились средства</error></response>").state, "no_balance");
  assert.equal(classifyWordstatBody(200, "<response><phrase>x</phrase></response>").state, "ok");
  assert.equal(classifyWordstatBody(503, "").state, "error");
});

test("summarizeProviders: degraded при wordstat≠ok или LLM<2; skipped не считается; всё skipped — не degraded", () => {
  const green = { wordstat: probe("ok"), openai: probe("ok"), gigachat: probe("ok"), yandexgpt: probe("forbidden"), perplexity: probe("no_key") };
  assert.deepEqual(summarizeProviders(green), { llm_ok: 2, llm_required: 2, wordstat_ok: true, degraded: false, reasons: [] });
  const noBalance = { ...green, wordstat: probe("no_balance") };
  assert.equal(summarizeProviders(noBalance).degraded, true);
  assert.deepEqual(summarizeProviders(noBalance).reasons, ["wordstat no_balance"]);
  const oneLlm = { ...green, gigachat: probe("error") };
  assert.equal(summarizeProviders(oneLlm).degraded, true);
  assert.deepEqual(summarizeProviders(oneLlm).reasons, ["llm ok 1 < 2"]);
  const empty = { ...green, wordstat: probe("empty") };
  assert.equal(summarizeProviders(empty).degraded, true);
  const skipped = Object.fromEntries(PROVIDER_IDS.map((id) => [id, probe("skipped")]));
  assert.deepEqual(summarizeProviders(skipped).degraded, false);
  assert.deepEqual(summarizeProviders(skipped).reasons, ["probe skipped"]);
  assert.equal(summarizeProviders({}).degraded, false);
});
