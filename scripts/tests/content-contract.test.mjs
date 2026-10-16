// R-10 «Source-backed контракт и защита метрик» (READINESS_PLAN R-10, E-AUTO-16/19/20).
// Оракул: node --test scripts/tests/content-contract.test.mjs
// Собирает packages/shared и проверяет поведение собранного dist (промпты, проверка утверждений, гейт
// публикации, решение /api/page-events), плюс статическую границу: потребители в worker и web.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const src = (rel) => readFileSync(join(ROOT, rel), "utf8");
let prompts, claims, publish, pageEvents;

before(() => {
  const build = spawnSync("pnpm", ["--filter", "shared", "build"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(build.status, 0, `shared build failed:\n${build.stdout}\n${build.stderr}`);
  prompts = require(join(ROOT, "packages/shared/dist/prompts/content-gen.js"));
  claims = require(join(ROOT, "packages/shared/dist/content/claims.js"));
  publish = require(join(ROOT, "packages/shared/dist/content/publish.js"));
  pageEvents = require(join(ROOT, "packages/shared/dist/content/page-events.js"));
});

const TRANSCRIPT =
  "Имплантацию я делаю двенадцать лет, у меня сертификат Straumann. Средняя цена импланта у нас 35 000 рублей, " +
  "приживаемость около 97%. Пациенты часто благодарят за безболезненную установку. Подробнее на сайте dentclinic.ru.";
const params = { transcript: TRANSCRIPT, expertName: "Анна Петрова", questionText: "Сколько стоит имплант?" };

// ---------- E-AUTO-20: промпты ----------
test("каждый промпт генерации запрещает выдумывать регалии, отзывы и цифры", () => {
  const rule = prompts.NO_FABRICATION;
  assert.equal(typeof rule, "string");
  for (const word of ["регали", "отзыв", "цифр", "ссылк", "расшифровк"]) assert.match(rule.toLowerCase(), new RegExp(word), word);
  assert.ok(prompts.SYSTEM_PROMPT_CONTENT.includes(rule), "system prompt");
  for (const name of ["buildTelegramPostPrompt", "buildMinimalArticlePrompt", "buildSeoArticlePrompt", "buildCardsPrompt", "buildReelsScriptPrompt", "buildFaqPrompt"]) {
    assert.ok(prompts[name](params).includes(rule), name);
  }
});

test("SEO-промпт больше не просит внешние ссылки, которых нет в расшифровке", () => {
  const seo = prompts.buildSeoArticlePrompt(params);
  assert.doesNotMatch(seo, /авторитетные внешние источники/i);
  assert.match(seo, /только если эксперт сам/i);
});

// ---------- E-AUTO-20: sources[] и отклонение утверждений без источника ----------
test("утверждение с опорой в расшифровке получает источник", () => {
  const r = claims.checkClaims("Цена импланта - 35 000 рублей, приживаемость 97%.", TRANSCRIPT);
  assert.deepEqual(r.unsupported, []);
  assert.equal(r.sources.length, 2);
  for (const s of r.sources) assert.ok(TRANSCRIPT.includes(s.quote.slice(0, 20)), s.quote);
});

test("выдуманные цифры отклоняются", () => {
  const r = claims.checkClaims("Успешность лечения - 99%, мы провели более 5000 операций.", TRANSCRIPT);
  assert.deepEqual(r.unsupported.map((c) => c.kind).sort(), ["number", "number"]);
});

test("малые числа с кириллической единицей (5 лет, в 2 раза) тоже проверяются", () => {
  const r = claims.checkClaims("Опыт 5 лет, боль снижается в 2 раза, приём 3 мин.", TRANSCRIPT);
  assert.deepEqual(r.unsupported.map((c) => c.text), ["5 лет", "2 раза", "3 мин"]);
});

test("выдуманные регалии отклоняются, названные экспертом - нет", () => {
  assert.deepEqual(claims.checkClaims("У врача есть сертификат производителя.", TRANSCRIPT).unsupported, []);
  const r = claims.checkClaims("Анна Петрова - кандидат медицинских наук и член ассоциации имплантологов.", TRANSCRIPT);
  assert.ok(r.unsupported.length >= 2, JSON.stringify(r.unsupported));
  assert.ok(r.unsupported.every((c) => c.kind === "credential"));
});

test("выдуманные отзывы отклоняются, переданные слова эксперта - нет", () => {
  assert.deepEqual(claims.checkClaims("Пациенты благодарят за безболезненную установку.", TRANSCRIPT).unsupported, []);
  const r = claims.checkClaims("Отзывы клиентов: «лучший врач города».", "Я ставлю импланты с местной анестезией.");
  assert.equal(r.unsupported.length, 1);
  assert.equal(r.unsupported[0].kind, "review");
});

test("ссылка без упоминания домена в расшифровке отклоняется", () => {
  assert.deepEqual(claims.checkClaims("Подробнее: [сайт клиники](https://www.dentclinic.ru/implant).", TRANSCRIPT).unsupported, []);
  const r = claims.checkClaims("См. [рекомендации ВОЗ](https://who.int/oral-health).", TRANSCRIPT);
  assert.equal(r.unsupported.length, 1);
  assert.equal(r.unsupported[0].kind, "link");
});

test("номера пунктов списка и текст без утверждений не дают ложных срабатываний", () => {
  const r = claims.checkClaims("1. Консультация\n2. Снимок\n3. Установка\n\nВрач подберёт систему индивидуально.", TRANSCRIPT);
  assert.deepEqual(r, { sources: [], unsupported: [] });
  assert.deepEqual(claims.checkClaims("", TRANSCRIPT), { sources: [], unsupported: [] });
});

// ---------- E-AUTO-20: гейт публикации ----------
const ME = "90171bf6-432b-415e-9c04-a66b0aa60e31";
const FAQ = [1, 2, 3].map((n) => ({ question: `Вопрос номер ${n} про имплант?`, answer: "Ответ эксперта по теме, достаточно длинный для FAQ." }));
const pkg = (over = {}) => ({ expert_id: ME, status: "review", slug: "implant", format_faq: FAQ, format_seo_article: "Цена - 35 000 рублей.", format_telegram_post: "", transcript: TRANSCRIPT, ...over });

test("публикация с утверждениями без источника отклоняется с перечнем", () => {
  const d = publish.decidePublish(pkg({ format_seo_article: "Успешность - 99%. Врач - профессор кафедры." }), ME);
  assert.equal(d.ok, false);
  assert.equal(d.code, "unsupported_claims");
  assert.ok(d.problems.some((p) => p.includes("99%")), JSON.stringify(d.problems));
});

test("утверждения в FAQ и Telegram-посте тоже проверяются", () => {
  const faq = [...FAQ.slice(0, 2), { question: "Сколько операций у врача?", answer: "Врач провёл более 5000 операций за карьеру." }];
  assert.equal(publish.decidePublish(pkg({ format_faq: faq }), ME).code, "unsupported_claims");
  assert.equal(publish.decidePublish(pkg({ format_telegram_post: "Скидка 30% до конца месяца!" }), ME).code, "unsupported_claims");
});

test("публикация с опорой на расшифровку проходит; без расшифровки (старые пакеты) проверка пропускается", () => {
  assert.deepEqual(publish.decidePublish(pkg(), ME), { ok: true });
  assert.deepEqual(publish.decidePublish(pkg({ transcript: null, format_seo_article: "Успешность - 99%." }), ME), { ok: true });
});

// ---------- E-AUTO-16: /api/page-events ----------
const ID = "11111111-1111-4111-8111-111111111111";

test("решение page-events: лимит, формат id, тип события, опубликованность", () => {
  const d = pageEvents.pageEventDecision;
  assert.equal(d({ rateAllowed: false, contentId: ID, eventType: "view" }).status, 429);
  assert.equal(d({ rateAllowed: true, contentId: "not-a-uuid", eventType: "view" }).status, 400);
  assert.equal(d({ rateAllowed: true, contentId: ID, eventType: "hack" }).status, 400);
  assert.equal(d({ rateAllowed: true, contentId: ID, eventType: "view", published: false }).status, 404);
  assert.deepEqual(d({ rateAllowed: true, contentId: ID, eventType: "view" }), { ok: true });
  assert.deepEqual(d({ rateAllowed: true, contentId: ID, eventType: "lead", published: true }), { ok: true });
  assert.equal(pageEvents.PAGE_EVENTS_LIMIT, 60);
  assert.equal(pageEvents.PAGE_EVENTS_WINDOW_MS, 60_000);
});

test("маршрут /api/page-events ограничивает по IP и проверяет опубликованность до записи", () => {
  const route = src("apps/web/app/api/page-events/route.ts");
  for (const token of ["SlidingWindowLimiter", "clientIpFromHeaders", "pageEventDecision", "PAGE_EVENTS_LIMIT"]) assert.ok(route.includes(token), token);
  assert.match(route, /\.eq\("status",\s*"published"\)/);
  assert.ok(route.indexOf("published") < route.indexOf("increment_page_metric"), "проверка опубликованности до RPC");
});

// ---------- потребители в worker и web ----------
test("валидатор worker проверяет утверждения по расшифровке и сохраняет sources", () => {
  const v = src("apps/worker/src/jobs/validate-content.ts");
  for (const token of ["checkClaims", "transcript", "unsupported_claims", "sources"]) assert.ok(v.includes(token), token);
});

test("сервис публикации передаёт расшифровку в гейт, сайт и бот объясняют отказ", () => {
  assert.ok(src("apps/web/lib/publish-service.ts").includes("transcript"));
  assert.match(src("apps/web/lib/publish-service.ts"), /unsupported_claims:\s*422/);
  assert.ok(src("apps/web/app/(dashboard)/content/[id]/page.tsx").includes("unsupported_claims"));
  assert.ok(src("apps/bot/src/handlers/callback.ts").includes("unsupported_claims"));
});

// ---------- E-AUTO-19: пустой каталог TG-чатов ----------
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "dist") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

test("пустой каталог TG-чатов не рендерит блок: каждый потребитель проверяет пустой список", () => {
  const lib = src("apps/web/lib/niche-channels.ts");
  assert.match(lib, /return\s+NICHE_TELEGRAM_CHANNELS\[[^\]]+\]\s*\?\?\s*\[\]/);
  assert.doesNotMatch(lib, /api\/publish\/route\.ts/, "устаревшая ссылка на удалённый код");
  const consumers = walk(join(ROOT, "apps")).filter((p) => !p.endsWith("niche-channels.ts") && /getNicheChannels|NICHE_TELEGRAM_CHANNELS/.test(readFileSync(p, "utf8")));
  for (const file of consumers) assert.match(readFileSync(file, "utf8"), /\.length\s*(>|===|!==)\s*0/, `${file}: нет проверки пустого каталога`);
});
