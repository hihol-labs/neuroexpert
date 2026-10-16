const assert = require('node:assert/strict');
const test = require('node:test');
const {buildReportSnapshot} = require('../dist/delivery/index.js');
const {computeMoneyBlock, mentionsToken, parseAvgCheck, parseConversion, clientHost, clientBrand} = require('../dist/delivery/money.js');

// Снимок строится реальным продюсером (buildReportSnapshot), а не предположенной формой.
function snapshot(mutate) {
 const raw = {schema_version:1,niche:'Стоматология',type:'paid',source:'wordstat',ran_at:'2026-09-05T10:05:00Z',analyzer_model:'gpt-4o-mini',platforms_tried:['ChatGPT','GigaChat'],gaps:Array.from({length:10},(_,i)=>({
  id:`wordstat-${i}`,source_question_id:`11111111-1111-4111-8111-${String(i+1).padStart(12,'0')}`,question:`Имплантация зуба ${i+1}`,search_intent:'commercial',monthly_volume:100,estimated_monthly_volume:100,collected_at:'2026-09-04T09:00:00Z',
  platforms:['ChatGPT','GigaChat'].map(platform=>({platform,status:'answered',ai_response:'Обратитесь в проверенную клинику, сравните отзывы.',method:'gpt-4o-mini',gap_score:10,markers:{has_expert_name:false,has_specific_examples:false,has_source_link:false,has_specific_numbers:false},weakness:'Нет источников.'}))
 }))};
 if (mutate) mutate(raw);
 return buildReportSnapshot(raw);
}
const CLIENT = {website:'https://www.Ulybka-Tmn.ru/price', brand:'Улыбка Плюс', avg_check:'15 000', conversion:'2'};

test('нет чека или конверсии -> null',()=>{
 assert.equal(computeMoneyBlock(snapshot(), {...CLIENT, avg_check:''}), null);
 assert.equal(computeMoneyBlock(snapshot(), {...CLIENT, conversion:undefined}), null);
 assert.equal(computeMoneyBlock(snapshot(), null), null);
 assert.equal(computeMoneyBlock(snapshot(), undefined), null);
});
test('нечем опознать клиента (нет сайта и названия) -> null, 100% не подставляется',()=>{
 assert.equal(computeMoneyBlock(snapshot(), {avg_check:'15000', conversion:'2'}), null);
 assert.equal(computeMoneyBlock(snapshot(), {avg_check:'15000', conversion:'2', brand:'я', website:'не сайт'}), null);
});
test('клиента не называют нигде: 10 x 100 запросов x 2% x 15 000',()=>{
 const m = computeMoneyBlock(snapshot(), CLIENT);
 assert.equal(m.questions_measured, 10); assert.equal(m.questions_unnamed, 10);
 assert.equal(m.volume_unnamed, 1000); assert.equal(m.lost_clients, 20); assert.equal(m.lost_rub, 300000);
 assert.deepEqual(m.identified_by, ['ulybka-tmn.ru','улыбка плюс']);
});
test('клиент назван в части вопросов (домен с www и в другом регистре, название в другом регистре)',()=>{
 const m = computeMoneyBlock(snapshot(r=>{
  r.gaps[0].platforms[1].ai_response='Подробнее: https://WWW.ulybka-tmn.ru/implant - цены и врачи.';
  r.gaps[1].platforms[0].ai_response='Часто советуют клинику «УЛЫБКА   ПЛЮС» на Республики.';
 }), CLIENT);
 assert.equal(m.questions_unnamed, 8); assert.equal(m.volume_unnamed, 800); assert.equal(m.lost_rub, 240000);
});
test('вопрос без ответов не измерен, вопрос без частотности не входит в сумму',()=>{
 const m = computeMoneyBlock(snapshot(r=>{
  r.gaps[0].platforms=[];
  r.gaps[1].monthly_volume=null; r.gaps[1].estimated_monthly_volume=null;
 }), CLIENT);
 assert.equal(m.questions_unanswered, 1); assert.equal(m.questions_without_volume, 1);
 assert.equal(m.questions_measured, 8); assert.equal(m.volume_measured, 800); assert.equal(m.volume_unnamed, 800);
});
test('все частотности неизвестны -> null',()=>{
 assert.equal(computeMoneyBlock(snapshot(r=>r.gaps.forEach(g=>{g.monthly_volume=null;g.estimated_monthly_volume=null;})), CLIENT), null);
});
test('клиента называют везде -> честный ноль, блок есть',()=>{
 const m = computeMoneyBlock(snapshot(r=>r.gaps.forEach(g=>{g.platforms[0].ai_response='Клиника Улыбка Плюс, ulybka-tmn.ru';})), CLIENT);
 assert.equal(m.questions_unnamed, 0); assert.equal(m.lost_rub, 0); assert.equal(m.lost_clients, 0);
});
test('округление: клиенты до десятых, рубли до целых',()=>{
 const m = computeMoneyBlock(snapshot(r=>r.gaps.forEach(g=>{g.monthly_volume=33;g.estimated_monthly_volume=33;})), {...CLIENT, conversion:'0,75', avg_check:'12345'});
 assert.equal(m.volume_unnamed, 330); assert.equal(m.lost_clients, 2.5); assert.equal(m.lost_rub, Math.round(330*0.0075*12345));
});
test('источники множителей: два наших, два клиентских',()=>{
 const m = computeMoneyBlock(snapshot(), CLIENT);
 assert.deepEqual(m.multipliers.map(x=>[x.key,x.source]), [['volume','wordstat'],['unnamed','measured'],['conversion','client'],['avg_check','client']]);
 assert.ok(m.multipliers.filter(x=>x.source==='client').every(x=>x.source_label==='ваша оценка'));
 assert.ok(m.multipliers[0].source_label.includes('2026-09-04'));
});
test('сопоставление целым словом: подстрока не считается упоминанием',()=>{
 for (const [text, token, want] of [
  ['чистка хлоркой не нужна','лор',false], ['клиника лор, запись','лор',true], ['«лор»','лор',true], ['лор-центр на ленина','лор',false],
  ['см. notexample.com','example.com',false], ['см. sub.example.com/x','example.com',true], ['см. example.com.ru','example.com',false],
  ['сайт example.com. далее','example.com',true], ['советуют улыбка плюс.рекомендуем','улыбка плюс',true], ['улыбка плюсовая','улыбка плюс',false], ['example.com','example.com',true], ['my-example.com','example.com',false],
 ]) assert.equal(mentionsToken(text, token), want, `${token} в «${text}»`);
});
test('короткое название (меньше 3 символов) не принимается; подстрока бренда не занижает потери',()=>{
 assert.equal(clientBrand('ЛО'), null);
 const m = computeMoneyBlock(snapshot(r=>r.gaps.forEach(g=>{g.platforms[0].ai_response='Обработка хлоркой не заменяет чистку у врача.';})), {brand:'лор', avg_check:'1000', conversion:'1'});
 assert.equal(m.questions_unnamed, 10);
});
test('дата частотности берётся из collected_at, а не из ran_at; токены без дублей',()=>{
 const m = computeMoneyBlock(snapshot(r=>{r.gaps[0].collected_at='2026-08-28T09:00:00Z';}), {website:'ulybka-tmn.ru', brand:'ulybka-tmn.ru', avg_check:'1000', conversion:'1'});
 assert.equal(m.multipliers[0].source_label, 'Wordstat, сбор с 2026-08-28 по 2026-09-04');
 assert.ok(m.multipliers[1].source_label.includes('2026-09-05'));
 assert.deepEqual(m.identified_by, ['ulybka-tmn.ru']);
 assert.equal(computeMoneyBlock(snapshot(), CLIENT).multipliers[0].source_label, 'Wordstat, сбор 2026-09-04');
});
test('parseAvgCheck: границы и мусор',()=>{
 for (const [raw, want] of [['15 000',15000],['15000 ₽',15000],[7900,7900],['1',1],['100000000',100000000],['100000001',null],['0',null],['-5',null],['15000.5',null],['1e5',null],['abc',null],['',null],[NaN,null],[Infinity,null],[null,null],[{},null]])
  assert.equal(parseAvgCheck(raw), want, `avg_check ${String(raw)}`);
});
test('parseConversion: 0 < x <= 100, до двух знаков',()=>{
 for (const [raw, want] of [['2',2],['2%',2],['0,5',0.5],['0.75',0.75],['100',100],[1.5,1.5],['0',null],['100.01',null],['101',null],['0.001',null],['-1',null],['два',null],['',null],[undefined,null]])
  assert.equal(parseConversion(raw), want, `conversion ${String(raw)}`);
});
test('clientHost / clientBrand',()=>{
 assert.equal(clientHost('ulybka-tmn.ru'), 'ulybka-tmn.ru');
 assert.equal(clientHost('https://www.Example.COM/path?x=1'), 'example.com');
 assert.equal(clientHost('localhost'), null); assert.equal(clientHost('  '), null); assert.equal(clientHost(42), null);
 assert.equal(clientBrand('  Улыбка   Плюс '), 'улыбка плюс'); assert.equal(clientBrand('я'), null); assert.equal(clientBrand('x'.repeat(101)), null);
});
