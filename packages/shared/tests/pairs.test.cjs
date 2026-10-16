const assert = require("node:assert/strict");
const test = require("node:test");

const {
  LOCAL_VERTICAL_IDS, isLocalVerticalId, normalizeCity, buildPairSlug, buildPairId, isPairId,
  buildPairName, expandSeedTemplates, PAIR_MIN_QUESTIONS, decidePairPreflight,
  decideOnDemandOutcome, buildPairReturnPath, isPairDemandStatus,
} = require("../dist/pairs/index.js");
const { PACKAGE_REGISTRY } = require("../dist/orders/index.js");

const DENTAL = [
  "стоматология {город}", "имплантация зубов {город}", "виниры цена {город}", "детский стоматолог {город}",
  "протезирование зубов {город}", "брекеты цена {город}", "удаление зуба мудрости {город}", "лечение кариеса цена {город}",
];

test("вертикали: ровно три фиксированные (§1), свободного ввода нет", () => {
  assert.deepEqual([...LOCAL_VERTICAL_IDS], ["dental", "clinic", "autoservice"]);
  assert.ok(isLocalVerticalId("dental"));
  assert.equal(isLocalVerticalId("vet"), false);
  assert.equal(isLocalVerticalId(undefined), false);
});

test("normalizeCity: обрезка, схлопывание пробелов, заглавные", () => {
  assert.equal(normalizeCity("  нижний   новгород "), "Нижний Новгород");
  assert.equal(normalizeCity("екатеринбург"), "Екатеринбург");
  assert.equal(normalizeCity("ростов - на - дону"), "Ростов-На-Дону");
});

test("normalizeCity: отвергает мусор и границы 2..80", () => {
  assert.equal(normalizeCity("Т"), null);
  assert.equal(normalizeCity("х".repeat(81)), null);
  assert.equal(normalizeCity("Тюмень; DROP TABLE"), null);
  assert.equal(normalizeCity("<b>Тюмень</b>"), null);
  assert.equal(normalizeCity(42), null);
});

test("buildPairSlug: <vertical>-<транслит>", () => {
  assert.equal(buildPairSlug("dental", "Тюмень"), "dental-tyumen");
  assert.equal(buildPairSlug("clinic", "Нижний Новгород"), "clinic-nizhnii-novgorod");
  assert.equal(buildPairSlug("autoservice", "  ЕКАТЕРИНБУРГ "), "autoservice-ekaterinburg");
});

test("buildPairSlug: разные написания одного города сходятся в один slug", () => {
  const a = buildPairSlug("dental", "Тюмень");
  assert.equal(buildPairSlug("dental", "тюмень"), a);
  assert.equal(buildPairSlug("dental", " ТЮМЕНЬ  "), a);
});

test("buildPairSlug: некорректный город -> null", () => {
  assert.equal(buildPairSlug("dental", "!!!"), null);
  assert.equal(buildPairSlug("dental", ""), null);
});

test("buildPairId: детерминирован, префикс b, валидный UUID-формат", () => {
  const id = buildPairId("dental-tyumen");
  assert.equal(id, buildPairId("dental-tyumen"));
  assert.ok(id.startsWith("b"));
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.ok(isPairId(id));
  assert.equal(isPairId("a0000000-0000-0000-0000-000000000001"), false);
});

test("buildPairId: разные пары -> разные id", () => {
  assert.notEqual(buildPairId("dental-tyumen"), buildPairId("clinic-tyumen"));
  assert.notEqual(buildPairId("dental-tyumen"), buildPairId("dental-tomsk"));
});

test("buildPairName: «Вертикаль · Город»", () => {
  assert.equal(buildPairName("Стоматология ", " Тюмень"), "Стоматология · Тюмень");
});

test("expandSeedTemplates: 8 -> 8, без остатка {город}", () => {
  const out = expandSeedTemplates(DENTAL, "тюмень");
  assert.equal(out.length, 8);
  assert.equal(out[0], "стоматология Тюмень");
  assert.equal(out[6], "удаление зуба мудрости Тюмень");
  assert.ok(out.every((k) => !k.includes("{город}")));
});

test("expandSeedTemplates: шаблон без плейсхолдера и мусорный город -> ошибка", () => {
  assert.throws(() => expandSeedTemplates([...DENTAL.slice(0, 7), "стоматология"], "Тюмень"), /без \{город\}/);
  assert.throws(() => expandSeedTemplates(DENTAL, "!"), /некорректный город/);
});

test("порог пары = questionCount пакета (решение (б))", () => {
  assert.equal(PAIR_MIN_QUESTIONS, 10);
  assert.equal(PAIR_MIN_QUESTIONS, PACKAGE_REGISTRY.audit_start.questionCount);
});

test("decidePairPreflight: ready только при >= 10", () => {
  assert.deepEqual(decidePairPreflight({ questionCount: 10, demandStatus: "filled" }), { status: "ready" });
  assert.deepEqual(decidePairPreflight({ questionCount: 25, demandStatus: null }), { status: "ready" });
  assert.equal(decidePairPreflight({ questionCount: 9, demandStatus: "filled" }).status, "collecting");
});

test("decidePairPreflight: сбор ставится ровно один раз (enqueue только при demandStatus null)", () => {
  const first = decidePairPreflight({ questionCount: 0, demandStatus: null });
  assert.equal(first.status, "collecting");
  assert.equal(first.enqueue, true);
  for (const s of ["queued", "running", "filled"]) {
    const d = decidePairPreflight({ questionCount: 0, demandStatus: s });
    assert.equal(d.status, "collecting");
    assert.equal(d.enqueue, false, s);
  }
});

test("decidePairPreflight: после honest empty — не ставим повторно и не открываем оплату", () => {
  const d = decidePairPreflight({ questionCount: 3, demandStatus: "empty" });
  assert.equal(d.status, "empty");
  assert.equal(d.enqueue, false);
  assert.match(d.message, /не открыта/);
});

test("decideOnDemandOutcome: on_demand не ставит find_gaps (решение (а)), filled/empty по порогу", () => {
  assert.deepEqual(decideOnDemandOutcome({ mode: "on_demand", questionCount: 12 }), { demandStatus: "filled", notify: true, enqueueFindGaps: false });
  assert.deepEqual(decideOnDemandOutcome({ mode: "on_demand", questionCount: 9 }), { demandStatus: "empty", notify: false, enqueueFindGaps: false });
  assert.deepEqual(decideOnDemandOutcome({ mode: "on_demand", questionCount: 0 }), { demandStatus: "empty", notify: false, enqueueFindGaps: false });
});

test("decideOnDemandOutcome: cron-режим не меняется — find_gaps ставится, пары не трогаются", () => {
  assert.deepEqual(decideOnDemandOutcome({ mode: "cron", questionCount: 0 }), { demandStatus: null, notify: false, enqueueFindGaps: true });
});

test("buildPairReturnPath: prefill формы для возврата по письму", () => {
  assert.equal(buildPairReturnPath("dental", "Тюмень"), "/order/audit-start?vertical=dental&city=%D0%A2%D1%8E%D0%BC%D0%B5%D0%BD%D1%8C");
});

test("pairKeywordStems: город и generic-слова исключены, основы по 5 букв", () => {
  const { pairKeywordStems } = require("../dist/pairs/index.js");
  assert.deepEqual(pairKeywordStems("имплантация зубов Тюмень", "Тюмень"), ["импла", "зубов"]);
  assert.deepEqual(pairKeywordStems("виниры цена Тюмень", "Тюмень"), ["винир"]);
  assert.deepEqual(pairKeywordStems("сдать анализы Нижний Новгород", "Нижний Новгород"), ["анали"]);
  assert.deepEqual(pairKeywordStems("узи платно Тюмень", "Тюмень"), ["узи"]);
  assert.deepEqual(pairKeywordStems("вызов врача на дом Тюмень", "Тюмень"), ["врача"]);
});

test("isRelevantPairPhrase: короткий термин «узи» и все 24 шаблона §4 дают непустые основы", () => {
  const { isRelevantPairPhrase, pairKeywordStems } = require("../dist/pairs/index.js");
  assert.ok(isRelevantPairPhrase("узи тюмень платно", "узи платно Тюмень", "Тюмень"));
  const templates = [
    "стоматология", "имплантация зубов", "виниры цена", "детский стоматолог", "протезирование зубов", "брекеты цена", "удаление зуба мудрости", "лечение кариеса цена",
    "частная клиника", "платный терапевт", "узи платно", "сдать анализы", "гинеколог платно", "кардиолог приём", "медосмотр для работы", "вызов врача на дом",
    "автосервис", "ремонт двигателя", "замена масла", "шиномонтаж", "диагностика автомобиля", "кузовной ремонт", "ремонт ходовой", "автоэлектрик",
  ];
  for (const t of templates) assert.ok(pairKeywordStems(`${t} Тюмень`, "Тюмень").length > 0, t);
});

test("isRelevantPairPhrase: фразы спроса с вертикальным термином принимаются, мусор с одним городом — нет", () => {
  const { isRelevantPairPhrase } = require("../dist/pairs/index.js");
  assert.ok(isRelevantPairPhrase("стоматология тюмень цены", "стоматология Тюмень", "Тюмень"));
  assert.ok(isRelevantPairPhrase("имплантация зубов тюмень под ключ", "имплантация зубов Тюмень", "Тюмень"));
  assert.ok(isRelevantPairPhrase("сколько стоит вылечить кариес", "лечение кариеса цена Тюмень", "Тюмень"));
  assert.ok(isRelevantPairPhrase("стоматолог детский тюмень", "детский стоматолог Тюмень", "Тюмень"));
  assert.equal(isRelevantPairPhrase("сколько стоит проезд в тюмени", "стоматология Тюмень", "Тюмень"), false);
  assert.equal(isRelevantPairPhrase("мфк тюмень", "стоматология Тюмень", "Тюмень"), false);
  assert.equal(isRelevantPairPhrase("цена на бензин тюмень", "виниры цена Тюмень", "Тюмень"), false);
});

test("isPairDemandStatus: перечень как в миграции 027", () => {
  for (const s of ["queued", "running", "filled", "empty"]) assert.ok(isPairDemandStatus(s));
  assert.equal(isPairDemandStatus("done"), false);
});
