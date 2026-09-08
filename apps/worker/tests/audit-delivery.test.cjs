const assert=require('node:assert/strict'),test=require('node:test');
const {createAuditDelivery}=require('../dist/services/audit-delivery.js');
const ID='11111111-1111-4111-8111-111111111111',OWNER='22222222-2222-4222-8222-222222222222',START=Date.parse('2026-09-05T10:05:00Z');
const clone=v=>structuredClone(v),json=(body,status=200)=>new Response(JSON.stringify(body),{status});
function report(){return {schema_version:1,niche:'Стоматология',type:'paid',source:'wordstat',ran_at:new Date(START).toISOString(),analyzer_model:'gpt-4o-mini',platforms_tried:['ChatGPT','GigaChat'],gaps:Array.from({length:10},(_,i)=>({id:`wordstat-${i}`,question:`Лечение зуба ${i+1}`,search_intent:'commercial',source_question_id:`33333333-3333-4333-8333-${String(i+1).padStart(12,'0')}`,collected_at:'2026-09-04T09:00:00Z',monthly_volume:100+i,estimated_monthly_volume:100+i,avg_gap_score:0,platforms:['ChatGPT','GigaChat'].map(platform=>({platform,status:'answered',ai_response:'Осмотр через 6 месяцев.',method:'gpt-4o-mini',gap_score:0,weakness:'Нужна экспертная проверка.',markers:{has_expert_name:true,has_specific_examples:true,has_source_link:true,has_specific_numbers:true}}))}))}}
function harness(options={}){
 const h={now:START,events:[],engineCalls:[],paymentShops:[],refunds:[],mails:[]};
 h.row={id:ID,owner_id:OWNER,email:'owner@example.org',package:'audit_start',niche_id:'dentistry',job_id:'job-1',status:'paid',amount_rub:7900,paid_at:'2026-09-05T10:00:00Z',sla_deadline_at:'2026-09-05T11:00:00Z',yukassa_payment_id:'payment-1',payment_test:!options.live,payment_shop_id:options.live?'live-shop':'test-shop',payment_verified_at:null,report:null,refund_id:null,refund_status:'not_required',refund_attempts:0,refund_next_attempt_at:null,notification_status:'not_required',notification_attempts:0,notification_next_attempt_at:null,...options.row};
 if(options.legacy)Object.assign(h.row,{payment_test:null,payment_shop_id:null});
 function query(){const filters=[];let patch,single=false;const q={
  select(){return q},update(v){patch=v;return q},eq(k,v){filters.push(r=>r[k]===v);return q},is(k,v){return q.eq(k,v)},in(k,v){filters.push(r=>v.includes(r[k]));return q},lte(k,v){filters.push(r=>r[k]!=null&&r[k]<=v);return q},order(){return q},limit(){return q},maybeSingle(){single=true;return q},
  then(resolve,reject){const matches=filters.every(f=>f(h.row));if(matches&&patch)Object.assign(h.row,clone(patch));const rows=matches?[clone(h.row)]:[];return Promise.resolve({data:single?rows[0]||null:rows,error:null}).then(resolve,reject)}
 };return q}
 h.rpcCalls=[];
 const admin={from(table){assert.equal(table,'package_orders');return query()},async rpc(name,args){assert.equal(args.p_order_id,ID);h.rpcCalls.push({name,args});
  if(name==='ensure_package_audit_job'){h.row.job_id='recovered-job';return {data:'recovered-job',error:null}}
  if(name==='complete_package_audit'){
   if(options.commitError)return {data:null,error:{message:'commit rejected'}};
   if(h.row.status==='paid'&&h.now<Date.parse(h.row.sla_deadline_at)){Object.assign(h.row,{status:'delivered',report:clone(args.p_report),report_mode:args.p_mode,notification_status:'pending',notification_next_attempt_at:new Date(h.now).toISOString()});h.events.push('committed')}
  }else{assert.equal(name,'fail_package_audit');if(h.row.status==='paid'&&(!args.p_only_if_sla_breached||h.now>=Date.parse(h.row.sla_deadline_at))){Object.assign(h.row,{status:'failed',refund_status:'pending',refund_next_attempt_at:new Date(h.now).toISOString()});h.events.push('failed')}}return {data:true,error:null}
 } };
 async function http(url,init={}){const parsed=new URL(String(url));if(parsed.pathname==='/api/audit'){h.engineCalls.push({url:String(url),init});return options.engine?options.engine(h):json(report())}
  const shop=Buffer.from(init.headers.Authorization.slice(6),'base64').toString().split(':')[0];
  if(parsed.pathname.startsWith('/v3/payments/')){h.paymentShops.push(shop);const live=Boolean(options.live||options.legacy);if(shop!==(live?'live-shop':'test-shop'))return json({},404);return json({id:'payment-1',status:'succeeded',test:!live,amount:{value:'7900.00',currency:'RUB'},recipient:{account_id:shop},metadata:{order_id:ID,user_id:OWNER,type:'package',package:'audit_start'}})}
  assert.equal(parsed.pathname,'/v3/refunds');assert.equal(init.method,'POST');h.refunds.push({shop,key:init.headers['Idempotence-Key'],body:JSON.parse(init.body)});if(options.refundTimeout&&h.refunds.length===1)throw new Error('refund timeout');return json({id:'refund-1',status:'succeeded',payment_id:'payment-1',amount:{value:'7900.00',currency:'RUB'}})
 }
 h.service=createAuditDelivery({admin,fetch:http,now:()=>h.now,env:{YUKASSA_TEST_SHOP_ID:'test-shop',YUKASSA_TEST_SECRET_KEY:'test-key',YUKASSA_SHOP_ID:'live-shop',YUKASSA_SECRET_KEY:'live-key',AUDIT_INTERNAL_TOKEN:'internal-token',AUDIT_INTERNAL_URL:'http://web:3000'},async sendReady(email,orderId){assert.equal(h.row.status,'delivered');assert.ok(h.row.report);h.mails.push({email,orderId});h.events.push('mail');if(options.smtpOnce&&h.mails.length===1)throw new Error('SMTP unavailable')}});
 h.run=(payload={},context={})=>h.service.run({order_id:ID,...payload},{attempts:1,maxAttempts:3,jobId:'job-1',...context});return h;
}
test('paid commits before mail; paid request includes internal token',async()=>{const h=harness();assert.equal((await h.run()).status,'delivered');assert.deepEqual(h.events,['committed','mail']);assert.equal(h.row.notification_status,'sent');assert.equal(h.refunds.length,0);assert.equal(h.engineCalls.length,1);assert.deepEqual(JSON.parse(h.engineCalls[0].init.body),{niche_id:'dentistry',type:'paid',details:{}});assert.equal(h.engineCalls[0].init.headers['x-audit-internal'],'internal-token')});
test('SMTP retry survives delivered job without rerunning engine',async()=>{const h=harness({smtpOnce:true});await h.run();assert.equal(h.row.notification_status,'pending');await h.run();assert.equal(h.mails.length,1);h.now+=300001;await h.run();assert.equal(h.mails.length,2);assert.equal(h.row.notification_status,'sent');assert.equal(h.engineCalls.length,1)});
test('unpaid orders cannot invoke engine or refund',async()=>{for(const status of ['pending','failed','refunded']){const h=harness({row:{status,paid_at:null,refund_status:'pending',refund_next_attempt_at:new Date(START).toISOString()}});assert.equal((await h.run()).status,status);assert.equal(h.engineCalls.length,0);assert.equal(h.refunds.length,0);assert.equal(h.paymentShops.length,0)}});
test('live simulate flag cannot force refund on final attempt',async()=>{const h=harness({live:true});await h.run({simulate:'fail'},{attempts:3});assert.equal(h.row.status,'delivered');assert.equal(h.engineCalls.length,1);assert.equal(h.refunds.length,0)});
test('final engine failure persists failure and refunds full amount',async()=>{const h=harness({engine:()=>json({},503)});await h.run({},{attempts:3});assert.equal(h.row.status,'refunded');assert.equal(h.mails.length,0);assert.deepEqual(h.refunds[0].body,{payment_id:'payment-1',amount:{value:'7900.00',currency:'RUB'}})});
test('legacy discovers original shop from API, ignoring checkout flag',async()=>{const h=harness({legacy:true});await h.run();assert.deepEqual(h.paymentShops,['test-shop','live-shop']);assert.equal(h.row.payment_test,false);assert.equal(h.row.payment_shop_id,'live-shop');assert.equal(h.row.status,'delivered')});
test('refund timeout retries same idempotency key after lease',async()=>{const h=harness({refundTimeout:true,engine:()=>json({},503)});await h.run({},{attempts:3});assert.equal(h.row.status,'failed');assert.match(h.row.refund_last_error,/timeout/);await h.service.sweep();assert.equal(h.refunds.length,1);h.now+=300001;await h.service.sweep();assert.equal(h.row.status,'refunded');assert.equal(h.refunds.length,2);assert.equal(h.refunds[0].key,`refund-${ID}`);assert.equal(h.refunds[1].key,h.refunds[0].key);assert.equal(h.engineCalls.length,1)});
test('concurrent runs commit once and claim one mail',async()=>{const h=harness();await Promise.all([h.run(),h.run()]);assert.equal(h.events.filter(e=>e==='committed').length,1);assert.equal(h.mails.length,1);assert.equal(h.row.notification_attempts,1);assert.equal(h.refunds.length,0)});
test('SLA sweep beats late engine without report or mail',async()=>{const h=harness({engine:async state=>{state.now+=3600000;await state.service.sweep();return json(report())}});await h.run();assert.equal(h.row.status,'refunded');assert.equal(h.row.report,null);assert.equal(h.mails.length,0);assert.equal(h.refunds.length,1)});
test('database commit error cannot send ready notification',async()=>{const h=harness({commitError:true});await assert.rejects(h.run(),/audit database: commit rejected/);assert.equal(h.row.status,'paid');assert.equal(h.row.report,null);assert.equal(h.mails.length,0);assert.equal(h.refunds.length,0)});
test('sweep recovers paid order without attached job before SLA',async()=>{const h=harness({row:{job_id:null}});await h.service.sweep();assert.equal(h.row.job_id,'recovered-job');assert.equal(h.row.status,'paid');assert.equal(h.engineCalls.length,0);assert.equal(h.refunds.length,0)});
// R-01: decideRefund подключён без смены причин провала (Important full-чекера r3).
test('content failure below threshold fails with audit_below_delivery_threshold (no SLA guard) and refunds',async()=>{
 const failed=report();failed.gaps.forEach(g=>{g.platforms=g.platforms.map(p=>({platform:p.platform,status:'unavailable'}));g.avg_gap_score=null;});
 const h=harness({engine:()=>json(failed)});const r=await h.run();
 const fail=h.rpcCalls.find(c=>c.name==='fail_package_audit');assert.ok(fail,'fail_package_audit called');
 assert.equal(fail.args.p_reason,'audit_below_delivery_threshold');assert.equal(fail.args.p_only_if_sla_breached,false);
 assert.ok(['failed','refunded'].includes(r.status),r.status);assert.ok(['pending','submitted','succeeded'].includes(h.row.refund_status),'refund queued');assert.equal(h.rpcCalls.filter(c=>c.name==='complete_package_audit').length,0);
});
test('late engine past SLA fails with audit_sla_breached guarded by p_only_if_sla_breached',async()=>{
 const h=harness({engine:async state=>{state.now+=3600000;return json(report())}});await h.run();
 const fail=h.rpcCalls.find(c=>c.name==='fail_package_audit');assert.ok(fail);
 assert.equal(fail.args.p_reason,'audit_sla_breached');assert.equal(fail.args.p_only_if_sla_breached,true);assert.equal(h.row.status,'refunded');
});
