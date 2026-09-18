const assert = require('node:assert/strict');
const test = require('node:test');
const {decideOrderSelection, decideGenerateNow, planExpertOrders, isFirstGenerateRequest, isSameOriginRequest, GENERATE_COOLDOWN_MS, MAX_TOPICS_PER_EXPERT, TOP_PRIORITY_COUNT} = require('../dist/orders/expert-selection.js');

const ME = '90171bf6-432b-415e-9c04-a66b0aa60e31', OTHER = '11111111-1111-4111-8111-111111111111';

test('владелец принимает pending -> accepted, пропускает -> rejected',()=>{
 assert.deepEqual(decideOrderSelection({expert_id:ME,status:'pending'}, ME, 'accept'), {ok:true,status:'accepted'});
 assert.deepEqual(decideOrderSelection({expert_id:ME,status:'pending'}, ME, 'skip'), {ok:true,status:'rejected'});
});
test('чужой заказ неотличим от несуществующего',()=>{
 assert.deepEqual(decideOrderSelection({expert_id:OTHER,status:'pending'}, ME, 'accept'), {ok:false,code:'not_found'});
 assert.deepEqual(decideOrderSelection(null, ME, 'accept'), {ok:false,code:'not_found'});
 assert.deepEqual(decideOrderSelection(undefined, ME, 'skip'), {ok:false,code:'not_found'});
 assert.deepEqual(decideOrderSelection({expert_id:ME,status:'pending'}, '', 'accept'), {ok:false,code:'not_found'});
});
test('уже обработанный заказ -> conflict для всех статусов CHECK, кроме pending',()=>{
 for (const status of ['accepted','recording','processing','review','published','rejected','expired'])
  assert.deepEqual(decideOrderSelection({expert_id:ME,status}, ME, 'accept'), {ok:false,code:'conflict'}, status);
});
test('неизвестное действие отклоняется до проверки заказа',()=>{
 assert.deepEqual(decideOrderSelection({expert_id:ME,status:'pending'}, ME, 'publish'), {ok:false,code:'bad_action'});
 assert.deepEqual(decideOrderSelection(null, ME, ''), {ok:false,code:'bad_action'});
});

const NOW = Date.parse('2026-09-18T12:00:00Z');
test('лимит генерации: первый запуск и запуск через сутки разрешены',()=>{
 assert.deepEqual(decideGenerateNow(null, NOW), {ok:true});
 assert.deepEqual(decideGenerateNow(undefined, NOW), {ok:true});
 assert.deepEqual(decideGenerateNow(new Date(NOW-GENERATE_COOLDOWN_MS).toISOString(), NOW), {ok:true});
});
test('лимит генерации: повтор в пределах суток -> отказ с временем следующей попытки',()=>{
 const d = decideGenerateNow('2026-09-18T09:00:00Z', NOW);
 assert.deepEqual(d, {ok:false, retry_at:'2026-09-19T09:00:00.000Z'});
 assert.equal(decideGenerateNow(new Date(NOW-GENERATE_COOLDOWN_MS+1).toISOString(), NOW).ok, false);
});
test('лимит генерации: метка из будущего = «только что», мусор не блокирует',()=>{
 assert.deepEqual(decideGenerateNow('2027-01-01T00:00:00Z', NOW), {ok:false, retry_at:new Date(NOW+GENERATE_COOLDOWN_MS).toISOString()});
 assert.deepEqual(decideGenerateNow('не дата', NOW), {ok:true});
});

test('гонка двух запусков: остаётся самый ранний запрос суток, при равенстве времени - меньший id',()=>{
 const t = (s)=>new Date(NOW+s*1000).toISOString();
 const mine = [{id:'b1',created_at:t(-5)},{id:'b2',created_at:t(-5)}];
 assert.equal(isFirstGenerateRequest(mine, [], NOW), true);
 assert.equal(isFirstGenerateRequest(mine, [{id:'z',created_at:t(-4)}], NOW), true, 'чужой позже нашего');
 assert.equal(isFirstGenerateRequest(mine, [{id:'z',created_at:t(-6)}], NOW), false, 'чужой раньше нашего');
 assert.equal(isFirstGenerateRequest(mine, [{id:'a0',created_at:t(-5)}], NOW), false, 'равное время, меньший id выигрывает');
 assert.equal(isFirstGenerateRequest(mine, [{id:'c9',created_at:t(-5)}], NOW), true, 'равное время, больший id проигрывает');
 assert.equal(isFirstGenerateRequest(mine, [{id:'old',created_at:new Date(NOW-GENERATE_COOLDOWN_MS-1000).toISOString()}], NOW), true, 'вне окна суток');
 assert.equal(isFirstGenerateRequest(mine, [{id:'bad',created_at:'не дата'}], NOW), true);
 assert.equal(isFirstGenerateRequest([], [], NOW), false, 'нечего защищать');
});
test('CSRF: разрешён только наш origin; без Origin - только Sec-Fetch-Site same-origin',()=>{
 const allowed = ['https://neuroexpertise.ru', '', 'битый url', 'http://localhost:3000/path'];
 assert.equal(isSameOriginRequest('https://neuroexpertise.ru', null, allowed), true);
 assert.equal(isSameOriginRequest('http://localhost:3000', 'same-origin', allowed), true);
 assert.equal(isSameOriginRequest('https://evil.example', 'cross-site', allowed), false);
 assert.equal(isSameOriginRequest('https://neuroexpertise.ru.evil.example', null, allowed), false);
 assert.equal(isSameOriginRequest('http://neuroexpertise.ru', null, allowed), false, 'другая схема - другой origin');
 assert.equal(isSameOriginRequest('null', 'cross-site', allowed), false, 'sandbox/opaque origin');
 assert.equal(isSameOriginRequest('мусор', null, allowed), false);
 assert.equal(isSameOriginRequest(null, 'same-origin', allowed), true);
 assert.equal(isSameOriginRequest(null, 'same-site', allowed), false);
 assert.equal(isSameOriginRequest(null, 'cross-site', allowed), false);
 assert.equal(isSameOriginRequest(null, null, allowed), false, 'ни Origin, ни Sec-Fetch-Site - отказ');
 assert.equal(isSameOriginRequest('https://neuroexpertise.ru', null, []), false);
 // Порт и регистр: URL().origin нормализует регистр хоста и порт по умолчанию, чужой порт - чужой origin.
 assert.equal(isSameOriginRequest('https://NeuroExpertise.RU', null, allowed), true);
 assert.equal(isSameOriginRequest('https://neuroexpertise.ru:443', null, allowed), true);
 assert.equal(isSameOriginRequest('https://neuroexpertise.ru:8443', null, allowed), false);
 assert.equal(isSameOriginRequest('http://localhost:3001', null, allowed), false);
 assert.equal(isSameOriginRequest('http://LOCALHOST:3000', null, allowed), true);
});

const questions = Array.from({length:30},(_,i)=>({id:`q${i}`, question_text:`Сколько стоит имплант ${i}`}));
const experts = [{id:ME, eligible:true, telegram_id:42}, {id:OTHER, eligible:true, telegram_id:null}, {id:'x', eligible:false, telegram_id:7}];
test('cron (без onlyExpertId): темы всем подходящим экспертам, лимит и приоритет',()=>{
 const p = planExpertOrders({questions, experts, existing:[]});
 assert.equal(p.orders.filter(o=>o.expert_id===ME).length, MAX_TOPICS_PER_EXPERT);
 assert.equal(p.orders.filter(o=>o.expert_id===OTHER).length, MAX_TOPICS_PER_EXPERT);
 assert.equal(p.orders.filter(o=>o.expert_id==='x').length, 0);
 assert.equal(p.orders.filter(o=>o.expert_id===ME && o.is_priority).length, TOP_PRIORITY_COUNT);
 assert.deepEqual(p.notify, [{expert_id:ME, telegram_id:42, count:20, samples:questions.slice(0,3).map(q=>q.question_text)}]);
});
test('ручной запуск: темы только запросившему эксперту',()=>{
 const p = planExpertOrders({questions, experts, existing:[], onlyExpertId:OTHER});
 assert.ok(p.orders.length === MAX_TOPICS_PER_EXPERT && p.orders.every(o=>o.expert_id===OTHER));
 assert.deepEqual(p.notify, []);
 assert.deepEqual(planExpertOrders({questions, experts, existing:[], onlyExpertId:'нет такого'}).orders, []);
 assert.deepEqual(planExpertOrders({questions, experts, existing:[], onlyExpertId:'x'}).orders, []);
});
test('дедуп: уже выданные пары пропускаются, выдача добирается следующими вопросами',()=>{
 const existing = questions.slice(0,15).map(q=>`${ME}:${q.id}`);
 const p = planExpertOrders({questions, experts, existing, onlyExpertId:ME});
 assert.deepEqual(p.orders.map(o=>o.question_id), questions.slice(15).map(q=>q.id));
 const all = questions.map(q=>`${ME}:${q.id}`);
 assert.deepEqual(planExpertOrders({questions, experts, existing:all, onlyExpertId:ME}), {orders:[], notify:[]});
});
test('пустые входы',()=>{
 assert.deepEqual(planExpertOrders({questions:[], experts, existing:[]}), {orders:[], notify:[]});
 assert.deepEqual(planExpertOrders({questions, experts:[], existing:[]}), {orders:[], notify:[]});
});
