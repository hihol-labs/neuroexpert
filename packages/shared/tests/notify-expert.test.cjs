const assert = require('node:assert/strict');
const test = require('node:test');
const {createExpertNotifier, planExpertChannels, formatExpertNotification, isServiceEmail} = require('../dist/notify/expert.js');

const EXPERT = {id: '90171bf6-432b-415e-9c04-a66b0aa60e31', email: 'expert@clinic.ru', telegram_id: 123456789, full_name: 'Иван Петров'};
const CONTENT = 'c0ffee00-1111-4111-8111-111111111111';

test('каналы: e-mail всегда, Telegram при наличии; служебный адрес бота не получает писем', () => {
 assert.deepEqual(planExpertChannels(EXPERT), {telegram: true, email: true});
 assert.deepEqual(planExpertChannels({email: 'expert@clinic.ru', telegram_id: null}), {telegram: false, email: true});
 assert.deepEqual(planExpertChannels({email: 'tg_123@neuroexpert.bot', telegram_id: 123}), {telegram: true, email: false});
 assert.deepEqual(planExpertChannels({email: 'не адрес', telegram_id: 0}), {telegram: false, email: false});
 assert.equal(isServiceEmail(' TG_1@NeuroExpert.BOT '), true);
 assert.equal(isServiceEmail('bot@neuroexpertise.ru'), false);
});

test('шаблоны: callback_data в пределах 64 байт, данные клиента экранируются в письме', () => {
 const d = formatExpertNotification('draft_ready', {title: 'Имплант', content_id: CONTENT}, 'https://neuroexpertise.ru/');
 for (const row of d.keyboard) for (const b of row) assert.ok(Buffer.byteLength(b.callback_data) <= 64, b.callback_data);
 assert.ok(d.text.includes('https://neuroexpertise.ru/content/' + CONTENT));
 const l = formatExpertNotification('lead', {lead_id: CONTENT, client_name: '<script>alert(1)</script>', client_contact: '+7 900', client_message: 'a & b'}, 'https://x.ru');
 assert.ok(!l.html.includes('<script>'));
 assert.ok(l.html.includes('&lt;script&gt;') && l.html.includes('a &amp; b'));
 assert.ok(l.telegramText.includes('<script>alert(1)</script>'), 'Telegram без parse_mode - текст как есть');
 const p = formatExpertNotification('published', {title: 'Имплант', url: 'https://neuroexpertise.ru/experts/ivan/implant'}, 'https://x.ru');
 assert.ok(p.keyboard.flat().every((b) => b.url && !b.callback_data), 'только url-кнопки - нет copy_post:<url> длиннее 64 байт');
 const inj = formatExpertNotification('draft_ready', {title: 'Имплант\r\nBcc: attacker@evil.ru', content_id: CONTENT}, 'https://x.ru');
 assert.ok(!/[\r\n]/.test(inj.subject), 'тема письма - одна строка');
 const b = formatExpertNotification('booking', {client_name: 'Анна', client_contact: 'a@b.ru', date: '2026-10-01', time: '10:00'}, 'https://x.ru');
 assert.equal(b.keyboard, undefined, 'у записи нет кнопок без обработчиков');
 assert.ok(b.text.includes('2026-10-01 10:00'));
});

function harness(over = {}) {
 const calls = {tg: [], mail: [], complete: [], release: []};
 const claimed = new Set();
 const deps = {
  appUrl: 'https://neuroexpertise.ru',
  claim: async (e, k, r) => { const key = `${e}:${k}:${r}`; if (claimed.has(key)) return false; claimed.add(key); return true; },
  complete: async (...a) => calls.complete.push(a),
  release: async (e, k, r, err) => { claimed.delete(`${e}:${k}:${r}`); calls.release.push(err); },
  sendTelegram: async (chat, text, kb) => calls.tg.push({chat, text, kb}),
  sendEmail: async (to, subject) => calls.mail.push({to, subject}),
  log: () => {},
  ...over,
 };
 return {notify: createExpertNotifier(deps), calls};
}

test('оба канала: Telegram и письмо уходят, итог записан', async () => {
 const {notify, calls} = harness();
 const r = await notify('draft_ready', CONTENT, EXPERT, {title: 'Имплант', content_id: CONTENT});
 assert.deepEqual(r, {outcome: 'sent', telegram: 'sent', email: 'sent'});
 assert.equal(calls.tg[0].chat, 123456789); assert.equal(calls.mail[0].to, 'expert@clinic.ru');
 assert.deepEqual(calls.complete[0][3], {telegram: 'sent', email: 'sent'});
});

test('дедуп: повтор того же события не шлёт второй раз', async () => {
 const {notify, calls} = harness();
 await notify('published', CONTENT, EXPERT, {title: 'x', url: 'https://x.ru/a'});
 const r = await notify('published', CONTENT, EXPERT, {title: 'x', url: 'https://x.ru/a'});
 assert.equal(r.outcome, 'deduped'); assert.equal(calls.tg.length, 1); assert.equal(calls.mail.length, 1);
});

test('сбой Telegram не мешает письму; итог sent', async () => {
 const {notify, calls} = harness({sendTelegram: async () => { throw new Error('telegram 400'); }});
 const r = await notify('lead', CONTENT, EXPERT, {lead_id: CONTENT, client_name: 'A', client_contact: 'B'});
 assert.deepEqual(r, {outcome: 'sent', telegram: 'failed', email: 'sent'});
 assert.equal(calls.mail.length, 1); assert.equal(calls.release.length, 0);
});

test('оба канала упали: строка дедупа снимается, повтор job отправит снова', async () => {
 let fail = true;
 const {notify, calls} = harness({sendTelegram: async () => { if (fail) throw new Error('tg down'); }, sendEmail: async () => { if (fail) throw new Error('smtp down'); }});
 const r = await notify('booking', CONTENT, EXPERT, {client_name: 'A', client_contact: 'B'});
 assert.equal(r.outcome, 'failed'); assert.equal(calls.release.length, 1); assert.match(calls.release[0], /tg down.*smtp down/);
 fail = false;
 assert.equal((await notify('booking', CONTENT, EXPERT, {client_name: 'A', client_contact: 'B'})).outcome, 'sent');
});

test('нет ни Telegram, ни настоящего адреса - skipped без обращения к дедупу', async () => {
 let claims = 0;
 const {notify} = harness({claim: async () => { claims++; return true; }});
 const r = await notify('draft_ready', CONTENT, {id: EXPERT.id, email: 'tg_1@neuroexpert.bot', telegram_id: null}, {});
 assert.equal(r.outcome, 'skipped'); assert.equal(claims, 0);
});

test('сбой дедупа (БД) - failed, без отправки и без исключения', async () => {
 const {notify, calls} = harness({claim: async () => { throw new Error('db down'); }});
 assert.equal((await notify('draft_ready', CONTENT, EXPERT, {})).outcome, 'failed');
 assert.equal(calls.tg.length + calls.mail.length, 0);
});
