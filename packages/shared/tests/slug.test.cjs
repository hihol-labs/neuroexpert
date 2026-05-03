const assert = require("node:assert/strict");
const test = require("node:test");

const { slugifyLatin, transliterate } = require("../dist/utils/slug.js");

test("transliterate converts Russian product text to latin", () => {
  assert.equal(
    transliterate("НейроЭксперт для психологов"),
    "neiroekspert dlya psihologov",
  );
});

test("slugifyLatin creates stable URL slugs", () => {
  assert.equal(
    slugifyLatin("  НейроЭксперт: AI-система для экспертов!  "),
    "neiroekspert-ai-sistema-dlya-ekspertov",
  );
});

test("slugifyLatin trims to max length without trailing dash", () => {
  assert.equal(slugifyLatin("Очень длинный заголовок", 12), "ochen-dlinny");
});
