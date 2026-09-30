const assert = require('node:assert/strict');
const test = require('node:test');
const {checkPackageLimit, getAllowedFormats, isFormatAllowed, checkNicheLimit, getMaxNiches, checkSubscriptionAmount, packageAllowance, monthStartUtc, resolveTier, findTier, packageLimitMessage, nextSubscriptionExpiry} = require('../dist/billing/limits.js');
const {SUBSCRIPTION_TIERS, ALL_FORMATS} = require('../dist/constants.js');

const ME = '90171bf6-432b-415e-9c04-a66b0aa60e31';

// Заморозка тарифов 2026-03-19: таблица зафиксирована, юнит R-09 её не двигает.
test('таблица тарифов не изменилась (цены, ниши, пакеты, форматы)', () => {
 const snap = Object.fromEntries(Object.values(SUBSCRIPTION_TIERS).map((t) => [t.id, [t.price, t.maxNiches, t.packagesPerMonth, t.formats.length]]));
 assert.deepEqual(snap, {free: [0, 1, 3, 2], starter: [1490, 2, Infinity, 5], pro: [2990, 3, Infinity, 5], expert: [4990, 5, Infinity, 5], business: [24990, 10, Infinity, 5], enterprise: [99990, 20, Infinity, 5]});
});

test('неизвестный / пустой тариф считается бесплатным (fail-closed), прототипные ключи - не тариф', () => {
 for (const t of [undefined, null, '', 'vip', 'FREE', 'constructor', 'toString', '__proto__', 'hasOwnProperty']) assert.equal(resolveTier(t).id, 'free', String(t));
 assert.equal(findTier('constructor'), undefined); assert.equal(findTier('pro').id, 'pro');
 assert.deepEqual(getAllowedFormats('vip'), ['telegram_post', 'seo_article']);
 assert.equal(getMaxNiches(null), 1);
});

test('срок подписки: месяц от оплаты, досрочное продление - от текущего срока, 31-е обрезается', () => {
 const iso = (d) => d.toISOString();
 assert.equal(iso(nextSubscriptionExpiry(new Date('2026-09-30T10:00:00Z'), null)), '2026-10-30T10:00:00.000Z');
 assert.equal(iso(nextSubscriptionExpiry(new Date('2026-01-31T10:00:00Z'), null)), '2026-02-28T10:00:00.000Z');
 assert.equal(iso(nextSubscriptionExpiry(new Date('2028-01-31T10:00:00Z'), null)), '2028-02-29T10:00:00.000Z');
 assert.equal(iso(nextSubscriptionExpiry(new Date('2026-12-15T10:00:00Z'), null)), '2027-01-15T10:00:00.000Z');
 // Активная подписка до 20 октября, оплата 30 сентября -> до 20 ноября (остаток не теряется).
 assert.equal(iso(nextSubscriptionExpiry(new Date('2026-09-30T10:00:00Z'), '2026-10-20T00:00:00Z')), '2026-11-20T00:00:00.000Z');
 // Истёкший срок игнорируется - от момента оплаты.
 assert.equal(iso(nextSubscriptionExpiry(new Date('2026-09-30T10:00:00Z'), '2026-09-01T00:00:00Z')), '2026-10-30T10:00:00.000Z');
 assert.equal(iso(nextSubscriptionExpiry(new Date('2026-09-30T10:00:00Z'), 'garbage')), '2026-10-30T10:00:00.000Z');
});

test('лимит пакетов: free 3 в месяц, граница 2/3/4, платные без лимита', () => {
 assert.deepEqual(checkPackageLimit('free', 2), {allowed: true, limit: 3, used: 2, remaining: 1});
 assert.deepEqual(checkPackageLimit('free', 3), {allowed: false, limit: 3, used: 3, remaining: 0});
 assert.deepEqual(checkPackageLimit('free', 4), {allowed: false, limit: 3, used: 4, remaining: 0});
 assert.equal(checkPackageLimit('free', -1).used, 0);
 for (const t of ['starter', 'pro', 'expert', 'business', 'enterprise']) {
  const c = checkPackageLimit(t, 10_000);
  assert.equal(c.allowed, true, t); assert.equal(c.limit, Infinity); assert.equal(c.remaining, Infinity);
 }
});

test('форматы по тарифу: free - пост и SEO-статья, платные - все пять', () => {
 assert.deepEqual(getAllowedFormats('free'), ['telegram_post', 'seo_article']);
 assert.equal(isFormatAllowed('free', 'cards'), false);
 assert.equal(isFormatAllowed('free', 'reels_script'), false);
 assert.equal(isFormatAllowed('free', 'seo_article'), true);
 for (const t of ['starter', 'pro', 'expert', 'business', 'enterprise']) assert.deepEqual(getAllowedFormats(t), ALL_FORMATS, t);
 // Возвращается копия: мутация не портит таблицу.
 getAllowedFormats('free').push('faq'); assert.equal(SUBSCRIPTION_TIERS.free.formats.length, 2);
});

test('лимит ниш из тарифа: free 1, starter 2, pro 3, expert 5, business 10, enterprise 20', () => {
 assert.deepEqual([...['free', 'starter', 'pro', 'expert', 'business', 'enterprise'].map((t) => getMaxNiches(t))], [1, 2, 3, 5, 10, 20]);
 assert.deepEqual(checkNicheLimit('free', 0), {allowed: true, limit: 1, used: 0, remaining: 1});
 assert.deepEqual(checkNicheLimit('free', 1), {allowed: false, limit: 1, used: 1, remaining: 0});
 assert.equal(checkNicheLimit('pro', 2).allowed, true); assert.equal(checkNicheLimit('pro', 3).allowed, false);
});

test('сверка суммы подписки: известный платный тариф, рубли, цена точно (без округления копеек)', () => {
 assert.deepEqual(checkSubscriptionAmount('pro', 2990), {ok: true, tier: SUBSCRIPTION_TIERS.pro, expected: 2990});
 assert.deepEqual(checkSubscriptionAmount('pro', 2990.0, 'RUB'), {ok: true, tier: SUBSCRIPTION_TIERS.pro, expected: 2990});
 assert.deepEqual(checkSubscriptionAmount('pro', 2990.4), {ok: false, reason: 'amount_mismatch', expected: 2990});
 assert.deepEqual(checkSubscriptionAmount('pro', 2989.51), {ok: false, reason: 'amount_mismatch', expected: 2990});
 assert.deepEqual(checkSubscriptionAmount('pro', 1490), {ok: false, reason: 'amount_mismatch', expected: 2990});
 assert.deepEqual(checkSubscriptionAmount('pro', 2991), {ok: false, reason: 'amount_mismatch', expected: 2990});
 assert.deepEqual(checkSubscriptionAmount('pro', NaN), {ok: false, reason: 'amount_mismatch', expected: 2990});
 assert.deepEqual(checkSubscriptionAmount('pro', 2990, 'USD'), {ok: false, reason: 'currency', expected: 2990});
 assert.deepEqual(checkSubscriptionAmount('free', 0), {ok: false, reason: 'free_tier', expected: 0});
 assert.deepEqual(checkSubscriptionAmount('vip', 100), {ok: false, reason: 'unknown_tier', expected: null});
 assert.deepEqual(checkSubscriptionAmount('constructor', 100), {ok: false, reason: 'unknown_tier', expected: null});
 assert.deepEqual(checkSubscriptionAmount(undefined, 2990), {ok: false, reason: 'unknown_tier', expected: null});
});

test('начало месяца по UTC, а не по локальному времени', () => {
 assert.equal(monthStartUtc(new Date('2026-09-30T23:59:59Z')), '2026-09-01T00:00:00.000Z');
 assert.equal(monthStartUtc(new Date('2026-10-01T00:00:00Z')), '2026-10-01T00:00:00.000Z');
 assert.equal(monthStartUtc(new Date('2026-12-31T22:00:00Z')), '2026-12-01T00:00:00.000Z');
});

test('текст отказа называет лимит, использованное и ссылку на тарифы', () => {
 const msg = packageLimitMessage(checkPackageLimit('free', 3), 'https://neuroexpertise.ru/billing');
 assert.match(msg, /3 пакета контента в месяц/); assert.match(msg, /использовано 3/); assert.match(msg, /https:\/\/neuroexpertise\.ru\/billing$/);
});

// Форма продюсера: supabase-js count через select(..., {count:'exact', head:true}) -> {count, error}.
function fakeDb(result, calls) {
 return {from(table) { calls.push(['from', table]); return {select(cols, opts) { calls.push(['select', cols, opts]); return {eq(c, v) { calls.push(['eq', c, v]); return {gte(c2, v2) { calls.push(['gte', c2, v2]); return Promise.resolve(result); }}; }}; }}; }};
}

test('packageAllowance: free считает леджер пакетов эксперта с начала месяца UTC (не content_packages)', async () => {
 const calls = []; const now = new Date('2026-09-30T10:00:00Z');
 const r = await packageAllowance(fakeDb({count: 2, error: null}, calls), 'free', ME, now);
 assert.deepEqual(r, {allowed: true, limit: 3, used: 2, remaining: 1});
 assert.deepEqual(calls, [['from', 'expert_package_ledger'], ['select', 'id', {count: 'exact', head: true}], ['eq', 'expert_id', ME], ['gte', 'created_at', '2026-09-01T00:00:00.000Z']]);
 const r3 = await packageAllowance(fakeDb({count: 3, error: null}, []), 'free', ME, now);
 assert.equal(r3.allowed, false);
 const rn = await packageAllowance(fakeDb({count: null, error: null}, []), 'free', ME, now);
 assert.equal(rn.used, 0); assert.equal(rn.allowed, true);
});

test('packageAllowance: платный тариф не ходит в БД; ошибка чтения - отказ (fail-closed)', async () => {
 const calls = [];
 const r = await packageAllowance(fakeDb({count: 99, error: null}, calls), 'starter', ME);
 assert.equal(r.allowed, true); assert.equal(r.limit, Infinity); assert.deepEqual(calls, []);
 const err = await packageAllowance(fakeDb({count: null, error: {message: 'boom'}}, []), 'free', ME);
 assert.equal(err.allowed, false); assert.equal(err.error, 'boom');
});
