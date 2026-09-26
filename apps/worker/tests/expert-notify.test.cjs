// R-08: адаптер worker для notifyExpert - дедуп в expert_notifications, проверка ответа Telegram, e-mail всегда.
const assert = require('node:assert/strict'), test = require('node:test');
const {createWorkerExpertNotifier} = require('../dist/services/expert-notify.js');

const EXPERT = {id: '90171bf6-432b-415e-9c04-a66b0aa60e31', email: 'expert@clinic.ru', telegram_id: 123456789, full_name: 'Иван'};
const REF = '11111111-1111-4111-8111-111111111111';

// Минимальная таблица expert_notifications: upsert(ignoreDuplicates) / update / delete с фильтрами eq.
function notificationsTable() {
 const rows = [];
 const key = (r) => `${r.expert_id}:${r.kind}:${r.ref_id}`;
 function q() {
  let op = null, payload = null; const f = [];
  const x = {
   upsert(v) { op = 'upsert'; payload = v; return x; }, update(v) { op = 'update'; payload = v; return x; }, delete() { op = 'delete'; return x; },
   select() { return x; }, eq(k, v) { f.push((r) => r[k] === v); return x; },
   then(res) {
    let data = null;
    if (op === 'upsert') { if (rows.some((r) => key(r) === key(payload))) data = []; else { rows.push({...payload}); data = [{id: 'n1'}]; } }
    else if (op === 'update') { for (const r of rows.filter((r) => f.every((g) => g(r)))) Object.assign(r, payload); }
    else if (op === 'delete') { for (const r of rows.filter((r) => f.every((g) => g(r)))) rows.splice(rows.indexOf(r), 1); }
    return Promise.resolve({data, error: null}).then(res);
   },
  };
  return x;
 }
 return {rows, admin: {from: (name) => { assert.equal(name, 'expert_notifications'); return q(); }}};
}

const ENV = {TELEGRAM_BOT_TOKEN: 'bot-token', APP_URL: 'https://neuroexpertise.ru/'};

test('оба канала уходят, строка дедупа фиксирует итог; повтор - deduped', async () => {
 const t = notificationsTable(); const sent = {tg: [], mail: []};
 const fetch = async (url, init) => { sent.tg.push({url: String(url), body: JSON.parse(init.body)}); return new Response('{"ok":true}', {status: 200}); };
 const notify = createWorkerExpertNotifier({admin: t.admin, env: ENV, fetch, mail: async (m) => sent.mail.push(m), log: () => {}});
 const r = await notify('draft_ready', REF, EXPERT, {title: 'Имплант', content_id: REF});
 assert.deepEqual(r, {outcome: 'sent', telegram: 'sent', email: 'sent'});
 assert.equal(sent.tg[0].body.chat_id, 123456789);
 assert.equal(sent.tg[0].body.reply_markup.inline_keyboard[0][0].callback_data, `approve:${REF}`);
 assert.equal(sent.mail[0].to, 'expert@clinic.ru');
 assert.ok(sent.mail[0].text.includes(`https://neuroexpertise.ru/content/${REF}`));
 assert.equal(t.rows[0].telegram, 'sent'); assert.ok(t.rows[0].sent_at);
 assert.equal((await notify('draft_ready', REF, EXPERT, {content_id: REF})).outcome, 'deduped');
 assert.equal(sent.tg.length, 1);
});

test('ответ Telegram 400 - канал failed, письмо всё равно уходит', async () => {
 const t = notificationsTable(); const mails = [];
 const fetch = async () => new Response('{"ok":false,"description":"Bad Request: BUTTON_DATA_INVALID"}', {status: 400});
 const notify = createWorkerExpertNotifier({admin: t.admin, env: ENV, fetch, mail: async (m) => mails.push(m), log: () => {}});
 const r = await notify('published', REF, EXPERT, {title: 'x', url: 'https://neuroexpertise.ru/experts/ivan/x'});
 assert.deepEqual(r, {outcome: 'sent', telegram: 'failed', email: 'sent'});
 assert.equal(mails.length, 1); assert.equal(t.rows[0].telegram, 'failed');
});

test('ни один канал не дошёл - строка дедупа удалена (повтор job отправит снова)', async () => {
 const t = notificationsTable();
 const notify = createWorkerExpertNotifier({admin: t.admin, env: ENV, fetch: async () => new Response('', {status: 502}), mail: async () => { throw new Error('smtp down'); }, log: () => {}});
 assert.equal((await notify('lead', REF, EXPERT, {lead_id: REF, client_name: 'A', client_contact: 'B'})).outcome, 'failed');
 assert.equal(t.rows.length, 0);
});

test('без токена бота Telegram - failed, письмо уходит', async () => {
 const t = notificationsTable(); const mails = [];
 const notify = createWorkerExpertNotifier({admin: t.admin, env: {APP_URL: 'https://x.ru'}, fetch: async () => { throw new Error('не должен вызываться'); }, mail: async (m) => mails.push(m), log: () => {}});
 const r = await notify('booking', REF, EXPERT, {client_name: 'A', client_contact: 'B', date: '2026-10-01', time: '10:00'});
 assert.deepEqual(r, {outcome: 'sent', telegram: 'failed', email: 'sent'}); assert.equal(mails.length, 1);
});
