const assert = require('node:assert/strict');
const test = require('node:test');
const {signTelegramLinkToken, verifyTelegramLinkToken, newLinkNonce, hashLinkNonce, LINK_TOKEN_TTL_MS} = require('../dist/notify/link-token.js');

const SECRET = 'a'.repeat(64), OTHER = 'b'.repeat(64);
const PROFILE = '90171bf6-432b-415e-9c04-a66b0aa60e31';
const NOW = Date.parse('2026-09-26T12:00:00Z');

test('подписанный токен проверяется и возвращает профиль и номер', () => {
 const nonce = newLinkNonce();
 const t = signTelegramLinkToken(PROFILE, nonce, NOW, SECRET);
 const v = verifyTelegramLinkToken(t, SECRET, NOW + 1000);
 assert.equal(v.ok, true); assert.equal(v.profileId, PROFILE); assert.equal(v.nonce, nonce);
 assert.equal(v.expiresAt, Math.floor((NOW + LINK_TOKEN_TTL_MS) / 1000) * 1000);
});
test('токен укладывается в параметр /start Telegram (до 64 символов, A-Za-z0-9_-)', () => {
 const t = signTelegramLinkToken(PROFILE, newLinkNonce(), NOW, SECRET);
 assert.ok(t.length <= 64, String(t.length)); assert.match(t, /^[A-Za-z0-9_-]+$/);
});
test('срок 15 минут', () => {
 const t = signTelegramLinkToken(PROFILE, newLinkNonce(), NOW, SECRET);
 assert.equal(verifyTelegramLinkToken(t, SECRET, NOW + LINK_TOKEN_TTL_MS - 1000).ok, true);
 assert.deepEqual(verifyTelegramLinkToken(t, SECRET, NOW + LINK_TOKEN_TTL_MS), {ok: false, code: 'expired'});
});
test('чужой секрет и порча токена отвергаются', () => {
 const t = signTelegramLinkToken(PROFILE, newLinkNonce(), NOW, SECRET);
 assert.deepEqual(verifyTelegramLinkToken(t, OTHER, NOW), {ok: false, code: 'bad_signature'});
 // Порча байта подписи (а не символа строки: последний символ base64url несёт «хвостовые» биты).
 const mac = Buffer.from(t.slice(2), 'base64url'); mac[35] ^= 0x01;
 assert.deepEqual(verifyTelegramLinkToken('l_' + mac.toString('base64url'), SECRET, NOW), {ok: false, code: 'bad_signature'});
 // Подмена профиля в теле без знания секрета: подпись не сходится.
 const raw = Buffer.from(t.slice(2), 'base64url'); raw[0] ^= 1;
 assert.deepEqual(verifyTelegramLinkToken('l_' + raw.toString('base64url'), SECRET, NOW), {ok: false, code: 'bad_signature'});
});
test('неканоническая запись того же токена отвергается (детерминированно, 200 прогонов)', () => {
 const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
 for (let i = 0; i < 200; i++) {
  const t = signTelegramLinkToken(PROFILE, newLinkNonce(), NOW, SECRET);
  assert.equal(verifyTelegramLinkToken(t, SECRET, NOW).ok, true);
  // 54 символа на 40 байт: у последнего символа младшие 4 бита - хвост; флип младшего бита меняет только хвост.
  const v = ALPHA.indexOf(t.at(-1));
  const variant = t.slice(0, -1) + ALPHA[v ^ 1];
  assert.equal(Buffer.from(variant.slice(2), 'base64url').equals(Buffer.from(t.slice(2), 'base64url')), true, 'те же байты');
  assert.deepEqual(verifyTelegramLinkToken(variant, SECRET, NOW), {ok: false, code: 'bad_format'});
 }
});
test('старый формат (сырой id профиля) и мусор - bad_format', () => {
 for (const bad of [PROFILE, 'l_', 'l_!!!', 'x_' + 'A'.repeat(54), 'l_' + 'A'.repeat(10), '', 'l_' + 'A'.repeat(80)]) assert.equal(verifyTelegramLinkToken(bad, SECRET, NOW).ok, false, bad);
 assert.deepEqual(verifyTelegramLinkToken(PROFILE, SECRET, NOW), {ok: false, code: 'bad_format'});
});
test('без секрета или с коротким - fail-closed', () => {
 const t = signTelegramLinkToken(PROFILE, newLinkNonce(), NOW, SECRET);
 for (const s of [undefined, '', 'short']) assert.deepEqual(verifyTelegramLinkToken(t, s, NOW), {ok: false, code: 'no_secret'});
 assert.throws(() => signTelegramLinkToken(PROFILE, newLinkNonce(), NOW, 'short'));
 assert.throws(() => signTelegramLinkToken('не-uuid', newLinkNonce(), NOW, SECRET));
 assert.throws(() => signTelegramLinkToken(PROFILE, 'zz', NOW, SECRET));
});
test('в профиле хранится хэш номера, а не номер', () => {
 const n = newLinkNonce();
 assert.match(hashLinkNonce(n), /^[0-9a-f]{64}$/);
 assert.notEqual(hashLinkNonce(n), n); assert.equal(hashLinkNonce(n), hashLinkNonce(n)); assert.notEqual(hashLinkNonce(n), hashLinkNonce(newLinkNonce()));
});
test('номер - 16 hex, разные вызовы дают разные номера', () => {
 const a = newLinkNonce(), b = newLinkNonce();
 assert.match(a, /^[0-9a-f]{16}$/); assert.notEqual(a, b);
});
