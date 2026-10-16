const assert = require('node:assert/strict');
const test = require('node:test');
const {decidePublish, faqProblems, uniqueSlug} = require('../dist/content/publish.js');

const ME = '90171bf6-432b-415e-9c04-a66b0aa60e31', OTHER = '11111111-1111-4111-8111-111111111111';
// Форма продюсера: worker generate-content пишет format_faq как Array<{question, answer}>.
const pair = (q = 'Сколько стоит имплантация зуба?', a = 'Цена зависит от системы имплантов и объёма подготовки, от 35 000 рублей.') => ({question: q, answer: a});
const FAQ = [pair(), pair('Больно ли ставить имплант?'), pair('Сколько служит имплант?')];
const pkg = (over = {}) => ({expert_id: ME, status: 'review', slug: 'implantaciya-zuba', format_faq: FAQ, ...over});

// Прежний гейт /api/publish - эталон эквивалентности.
function legacyHasValidFaq(value) {
 if (!Array.isArray(value) || value.length < 3) return false;
 return value.every((item) => item && typeof item === 'object' && typeof item.question === 'string' && item.question.trim().length > 8 && typeof item.answer === 'string' && item.answer.trim().length > 20);
}

test('владелец публикует проверенный черновик', () => {
 assert.deepEqual(decidePublish(pkg(), ME), {ok: true});
 assert.deepEqual(decidePublish(pkg({status: 'approved'}), ME), {ok: true});
});
test('чужой пакет неотличим от несуществующего', () => {
 for (const p of [pkg({expert_id: OTHER}), null, undefined]) assert.deepEqual(decidePublish(p, ME), {ok: false, code: 'not_found'});
 assert.deepEqual(decidePublish(pkg(), ''), {ok: false, code: 'not_found'});
});
test('статусы CHECK: публикация только из review и approved', () => {
 assert.deepEqual(decidePublish(pkg({status: 'published'}), ME), {ok: false, code: 'already_published'});
 for (const status of ['generating', 'rejected', 'failed', 'мусор']) assert.deepEqual(decidePublish(pkg({status}), ME), {ok: false, code: 'bad_status'}, status);
});
test('пустой slug не публикуется (URL …/null)', () => {
 for (const slug of [null, '', '   ']) assert.deepEqual(decidePublish(pkg({slug}), ME), {ok: false, code: 'no_slug'});
});
test('FAQ-гейт отдаёт список проблем', () => {
 const d = decidePublish(pkg({format_faq: [pair(), pair('Коротко?', 'Да.')]}), ME);
 assert.equal(d.ok, false); assert.equal(d.code, 'faq_required');
 assert.deepEqual(d.problems, ['Нужно не меньше 3 пар «вопрос — ответ», сейчас 2.', 'Пара 2: вопрос короче 9 символов.', 'Пара 2: ответ короче 21 символа.']);
});
test('порядок проверок: владелец раньше статуса, статус раньше FAQ', () => {
 assert.equal(decidePublish(pkg({expert_id: OTHER, status: 'published'}), ME).code, 'not_found');
 assert.equal(decidePublish(pkg({status: 'failed', format_faq: []}), ME).code, 'bad_status');
});
test('faqProblems эквивалентен прежнему hasValidFaq на границах и мусоре', () => {
 const q8 = 'Восемь!!', q9 = 'Девять!!!', a20 = 'x'.repeat(20), a21 = 'x'.repeat(21);
 const cases = [FAQ, [], null, undefined, 'строка', {question: 'x'}, [pair(), pair()], [pair(), pair(), null], [pair(), pair(), 'x'], [pair(), pair(), {}],
  [pair(q8, a21), pair(), pair()], [pair(q9, a21), pair(), pair()], [pair(q9, a20), pair(), pair()], [pair(`  ${q8}  `, a21), pair(), pair()],
  [pair(), pair(), pair(), pair()], [pair(), pair(), {question: 5, answer: a21}], [pair(), pair(), {question: q9}]];
 for (const c of cases) assert.equal(faqProblems(c).length === 0, legacyHasValidFaq(c), JSON.stringify(c)?.slice(0, 80));
});
test('uniqueSlug: суффикс при коллизии, пустая основа', () => {
 assert.equal(uniqueSlug('implant', []), 'implant');
 assert.equal(uniqueSlug('implant', ['implant']), 'implant-2');
 assert.equal(uniqueSlug('implant', new Set(['implant', 'implant-2', 'implant-3'])), 'implant-4');
 assert.equal(uniqueSlug('implant', ['implant-2']), 'implant');
 assert.equal(uniqueSlug('  ', []), 'article');
 assert.equal(uniqueSlug('', ['article']), 'article-2');
});
