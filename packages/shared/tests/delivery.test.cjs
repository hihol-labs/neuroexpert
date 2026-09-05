const assert = require('node:assert/strict');
const test = require('node:test');
const {buildReportSnapshot, decideDeliveryMode, isSlaBreached, decideRefund} = require('../dist/delivery/index.js');
function report() {
 return {schema_version:1,niche:'Стоматология',type:'paid',source:'wordstat',ran_at:'2026-09-05T10:05:00Z',analyzer_model:'gpt-4o-mini',platforms_tried:['ChatGPT','GigaChat'],gaps:Array.from({length:10},(_,i)=>({
  id:`wordstat-${i}`,source_question_id:`11111111-1111-4111-8111-${String(i+1).padStart(12,'0')}`,question:`Лечение зуба ${i+1}`,search_intent:'commercial',monthly_volume:100+i,estimated_monthly_volume:100+i,collected_at:'2026-09-04T09:00:00Z',avg_gap_score:0,
  platforms:['ChatGPT','GigaChat'].map(platform=>({platform,status:'answered',ai_response:'Врач Иван Петров: https://example.org, осмотр через 6 месяцев.',method:'gpt-4o-mini',gap_score:0,markers:{has_expert_name:true,has_specific_examples:true,has_source_link:true,has_specific_numbers:true},weakness:'Требуется экспертная оценка.'}))
 }))};
}
test('full: две платформы на 10 вопросах',()=>assert.equal(decideDeliveryMode(report()),'full'));
for(const [n,mode] of [[8,'degraded'],[7,'failed'],[0,'failed']]) test(`coverage ${n}/10`,()=>{const r=report();r.gaps.slice(n).forEach(g=>g.platforms=[]);assert.equal(decideDeliveryMode(r),mode)});
test('одной живой платформы недостаточно',()=>{const r=report();r.gaps.forEach(g=>g.platforms.pop());assert.equal(decideDeliveryMode(r),'failed')});
test('третья недоступная платформа исключает full',()=>{const r=report();r.platforms_tried.push('Perplexity');assert.equal(decideDeliveryMode(r),'degraded')});
test('пустые ответы не покрывают вопрос',()=>{const r=report();r.gaps.slice(0,3).forEach(g=>g.platforms.forEach(p=>p.ai_response='  '));assert.equal(decideDeliveryMode(r),'failed')});
test('unavailable с остатком ответа не покрывает вопрос',()=>{const r=report();r.gaps.slice(0,3).forEach(g=>g.platforms.forEach(p=>p.status='unavailable'));assert.equal(decideDeliveryMode(r),'failed')});
const mutations = {
 '9 слотов': r=>r.gaps.pop(), 'повтор вопроса id':r=>r.gaps[9].source_question_id=r.gaps[0].source_question_id,
 'повтор текста':r=>r.gaps[9].question=r.gaps[0].question, 'повтор tried':r=>r.platforms_tried.push('ChatGPT'),
 'повтор платформы':r=>r.gaps[0].platforms.push(r.gaps[0].platforms[0]), 'неизвестная платформа':r=>r.platforms_tried.push('Invented'),
 'незаявленная платформа':r=>r.gaps[0].platforms[0].platform='Perplexity', 'нет timestamp':r=>delete r.ran_at,
 'нет collected_at':r=>delete r.gaps[0].collected_at, 'невозможный timestamp':r=>r.ran_at='2026-99-05T10:05:00Z', 'плохой source id':r=>r.gaps[0].source_question_id='foo',
 'нет analyzer':r=>delete r.analyzer_model,'нет method':r=>delete r.gaps[0].platforms[0].method,
};
for (const [name,mutate] of Object.entries(mutations)) test(`malformed: ${name}`,()=>{const r=report();mutate(r);assert.equal(decideDeliveryMode(r),'failed');assert.throws(()=>buildReportSnapshot(r))});
test('null и ноль частотности не подменяются',()=>{const r=report();r.gaps[0].monthly_volume=r.gaps[0].estimated_monthly_volume=null;r.gaps[1].monthly_volume=r.gaps[1].estimated_monthly_volume=0;const s=buildReportSnapshot(r);assert.equal(s.gaps[0].monthly_volume,null);assert.equal(s.gaps[1].monthly_volume,0)});
test('эвристический анализ помечен',()=>{const r=report();r.analyzer_model='heuristic';r.gaps.forEach(g=>g.platforms.forEach(p=>p.method='heuristic'));assert.equal(buildReportSnapshot(r).analyzer_model,'heuristic')});
test('нормализация пропуска и независимый снимок',()=>{const r=report();r.gaps[9].platforms.pop();const s=buildReportSnapshot(r);assert.equal(s.gaps[9].platforms[1].status,'unavailable');const saved=JSON.stringify(s);r.gaps[0].platforms[0].markers.has_source_link=false;assert.equal(JSON.stringify(s),saved);assert.equal(r.gaps[9].platforms.length,1)});
test('невалидный вход fail closed',()=>{for(const r of [null,undefined,{},[],'x']){assert.equal(decideDeliveryMode(r),'failed');assert.throws(()=>buildReportSnapshot(r))}});
test('SLA точная граница и неверные даты',()=>{const p='2026-09-05T10:00:00Z',t=Date.parse(p);assert.equal(isSlaBreached(p,t+3599999),false);assert.equal(isSlaBreached(p,t+3600000),true);assert.equal(isSlaBreached('bad',t),true);assert.equal(isSlaBreached(p,NaN),true);assert.equal(isSlaBreached(p,t-1),true)});
test('возврат только до delivery по failure/SLA',()=>{for(const mode of ['full','degraded','failed']){assert.equal(decideRefund(mode,false),mode==='failed');assert.equal(decideRefund(mode,true),true)}});
