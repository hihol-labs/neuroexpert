// R-02 (ADR-004): точки вызова notifyOperator в delivery/reconcile и адаптер worker (claim через RPC, send через tgFetch).
const assert=require('node:assert/strict'),test=require('node:test');
const {createAuditDelivery}=require('../dist/services/audit-delivery.js');
const {createPaymentReconcile}=require('../dist/services/payment-reconcile.js');
const {createWorkerOperatorNotifier}=require('../dist/services/operator-alerts.js');
const ID='11111111-1111-4111-8111-111111111111',OWNER='22222222-2222-4222-8222-222222222222',NOW=Date.parse('2026-09-08T10:30:00Z'); // внутри SLA (paid 10:00, deadline 11:00)
const json=(body,status=200)=>new Response(JSON.stringify(body),{status});
const clone=v=>structuredClone(v);

function table(rows){const h={rows:rows.map(clone)};function q(){const f=[];let patch,lim=Infinity,single=false;const x={select(){return x},update(v){patch=v;return x},eq(k,v){f.push(r=>r[k]===v);return x},
 is(k,v){f.push(r=>(r[k]??null)===v);return x},in(k,v){f.push(r=>v.includes(r[k]));return x},lte(k,v){f.push(r=>(r[k]??'9')<=v);return x},order(){return x},limit(n){lim=n;return x},maybeSingle(){single=true;return x},
 then(res){let m=h.rows.filter(r=>f.every(g=>g(r))).slice(0,lim);if(patch)for(const r of m)Object.assign(r,clone(patch));const rows=m.map(clone);return Promise.resolve({data:single?(rows[0]??null):rows,error:null}).then(res)}};return x}
 h.q=q;return h;}

test('delivery: SLA-свип и провал оплаченного замера шлют алерты; возврат succeeded -> order_refunded',async()=>{
 const alerts=[];const notify=async(kind,id,fields)=>{alerts.push({kind,id,fields});return 'sent'};
 const paid={id:ID,owner_id:OWNER,email:'c@x',package:'audit_start',niche_id:'n',job_id:'job-1',status:'paid',amount_rub:7900,paid_at:'2026-09-08T10:00:00Z',sla_deadline_at:'2026-09-08T11:00:00Z',
  yukassa_payment_id:'pay-1',payment_test:true,payment_shop_id:'test-shop',payment_verified_at:null,report:null,refund_id:null,refund_status:'not_required',refund_attempts:0,refund_next_attempt_at:null,notification_status:'not_required',notification_attempts:0,notification_next_attempt_at:null,failure_reason:null};
 const t=table([paid]);
 const admin={from(){return t.q()},async rpc(name,args){const r=t.rows[0];
  if(name==='fail_package_audit'){if(r.status==='paid'&&(!args.p_only_if_sla_breached||NOW>=Date.parse(r.sla_deadline_at))){Object.assign(r,{status:'failed',failure_reason:args.p_reason,refund_status:'pending',refund_next_attempt_at:new Date(NOW).toISOString()})}return {data:true,error:null}}
  if(name==='ensure_package_audit_job')return {data:'job-1',error:null};return {data:null,error:{message:'unexpected '+name}}}};
 const http=async(url,init={})=>{const p=new URL(String(url)).pathname;if(p==='/api/audit')return json({},503);
  if(p.startsWith('/v3/payments/'))return json({id:'pay-1',status:'succeeded',test:true,amount:{value:'7900.00',currency:'RUB'},recipient:{account_id:'test-shop'},metadata:{order_id:ID,user_id:OWNER,type:'package',package:'audit_start'}});
  return json({id:'refund-1',status:'succeeded',payment_id:'pay-1',amount:{value:'7900.00',currency:'RUB'}})};
 const svc=createAuditDelivery({admin,fetch:http,now:()=>NOW,env:{YUKASSA_TEST_SHOP_ID:'test-shop',YUKASSA_TEST_SECRET_KEY:'k',AUDIT_INTERNAL_TOKEN:'t'},sendReady:async()=>{},notifyOperator:notify});
 await svc.run({order_id:ID},{attempts:3,maxAttempts:3,jobId:'job-1'});
 assert.deepEqual(alerts.map(a=>a.kind),['order_failed','order_refunded']);
 assert.equal(alerts[0].id,ID);assert.equal(alerts[0].fields.причина,'audit_attempts_exhausted');assert.equal(t.rows[0].status,'refunded');
 // SLA-свип: просроченный paid -> sla_breached
 const t2=table([{...paid,sla_deadline_at:'2026-09-08T11:00:00Z'}]);const alerts2=[];const NOW2=Date.parse('2026-09-08T12:30:00Z');
 const admin2={from(){return t2.q()},async rpc(name,args){const r=t2.rows[0];if(name==='fail_package_audit'&&r.status==='paid')Object.assign(r,{status:'failed',failure_reason:args.p_reason,refund_status:'pending'});return {data:true,error:null}}};
 const svc2=createAuditDelivery({admin:admin2,fetch:http,now:()=>NOW2,env:{},sendReady:async()=>{},notifyOperator:async(k,i)=>{alerts2.push(k);return 'sent'}});
 await svc2.sweep();assert.deepEqual(alerts2,['sla_breached']);
});

test('delivery: SLA-провал внутри run() идёт под ключом sla_breached (тот же, что у свипа) — один алерт на событие',async()=>{
 const alerts=[];const LATE=Date.parse('2026-09-08T12:30:00Z');
 const paid={id:ID,owner_id:OWNER,email:'c@x',package:'audit_start',niche_id:'n',job_id:'job-1',status:'paid',amount_rub:7900,paid_at:'2026-09-08T10:00:00Z',sla_deadline_at:'2026-09-08T11:00:00Z',
  yukassa_payment_id:'pay-1',payment_test:true,payment_shop_id:'test-shop',payment_verified_at:null,report:null,refund_id:null,refund_status:'not_required',refund_attempts:0,refund_next_attempt_at:null,notification_status:'not_required',notification_attempts:0,notification_next_attempt_at:null,failure_reason:null};
 const t=table([paid]);
 const admin={from(){return t.q()},async rpc(name,args){const r=t.rows[0];if(name==='fail_package_audit'&&r.status==='paid'&&(!args.p_only_if_sla_breached||LATE>=Date.parse(r.sla_deadline_at)))Object.assign(r,{status:'failed',failure_reason:args.p_reason,refund_status:'pending'});return {data:true,error:null}}};
 const svc=createAuditDelivery({admin,fetch:async()=>json({},500),now:()=>LATE,env:{},sendReady:async()=>{},notifyOperator:async(k,i)=>{alerts.push([k,i]);return 'sent'}});
 await svc.run({order_id:ID},{attempts:1,maxAttempts:3,jobId:'job-1'});
 assert.deepEqual(alerts,[['sla_breached',ID]]);assert.equal(t.rows[0].failure_reason,'audit_sla_breached');
});

test('delivery: ошибка SMTP при письме клиенту -> email_failed; без notifyOperator ничего не падает',async()=>{
 const refunded={id:'r1',email:'c@x',status:'refunded',paid_at:'2026-09-08T08:00:00Z',amount_rub:7900,refund_status:'succeeded',notification_status:'not_required',created_at:'2026-09-08T07:00:00Z'};
 const t=table([refunded]);const alerts=[];
 const admin={from(){return t.q()},async rpc(){return {data:null,error:null}}};
 const svc=createAuditDelivery({admin,fetch:async()=>json({},500),now:()=>NOW,env:{},sendReady:async()=>{},sendMail:async()=>{throw new Error('smtp 4xx')},notifyOperator:async(k,i,f)=>{alerts.push({k,i,f});return 'sent'}});
 await svc.sweep();assert.deepEqual(alerts.map(a=>[a.k,a.i]),[['email_failed','r1:refund']]);assert.match(alerts[0].f.ошибка,/smtp 4xx/);
 const svc2=createAuditDelivery({admin:{from(){return table([refunded]).q()},async rpc(){return {data:null,error:null}}},fetch:async()=>json({},500),now:()=>NOW,env:{},sendReady:async()=>{},sendMail:async()=>{throw new Error('x')}});
 await svc2.sweep();
});

test('reconcile: identity mismatch -> reconcile_mismatch; ошибки прохода -> один reconcile_errors',async()=>{
 const order={id:ID,owner_id:OWNER,email:'c@x',package:'audit_start',status:'pending',amount_rub:7900,yukassa_payment_id:'pay-1',payment_test:false,payment_shop_id:'live-shop',job_id:null,created_at:new Date(NOW-3600000).toISOString()};
 const boom={...order,id:'o-boom',yukassa_payment_id:'pay-boom'};
 const t=table([order,boom]);const alerts=[];
 const http=async(url,init)=>{const id=decodeURIComponent(new URL(String(url)).pathname.split('/').pop());if(id==='pay-boom')return json({},503);
  return json({id:'pay-1',status:'succeeded',test:false,amount:{value:'100.00',currency:'RUB'},metadata:{type:'package',package:'audit_start',order_id:ID,user_id:OWNER}})};
 const svc=createPaymentReconcile({admin:{from(){return t.q()},async rpc(){return {data:null,error:null}}},fetch:http,now:()=>NOW,log:()=>{},sendStatusLink:async()=>{},
  env:{YUKASSA_SHOP_ID:'live-shop',YUKASSA_SECRET_KEY:'l'},notifyOperator:async(k,i,f)=>{alerts.push({k,i,f});return 'sent'}});
 const s=await svc.run();assert.equal(s.kept,1);assert.equal(s.errors,1);
 assert.deepEqual(alerts.map(a=>[a.k,a.i]),[['reconcile_mismatch',ID],['reconcile_errors',null]]);
 assert.match(alerts[0].f.причина,/amount mismatch/);assert.equal(alerts[1].f.ошибок,1);assert.equal(t.rows[0].status,'pending');
});

test('адаптер worker: claim через RPC, send через tgFetch в админ-чат, дедуп по ответу RPC, ошибка TG -> record_operator_alert_error',async()=>{
 const rpc=[];const sent=[];let claimResult=true;let tgStatus=200;
 const admin={async rpc(name,args){rpc.push({name,args});if(name==='claim_operator_alert')return {data:claimResult,error:null};return {data:null,error:null}}};
 const fetchFn=async(url,init)=>{sent.push({url:String(url),body:JSON.parse(init.body)});return new Response('{}',{status:tgStatus})};
 const env={TELEGRAM_BOT_TOKEN:'bot-1',TELEGRAM_ADMIN_CHAT_ID:'42'};
 const notify=createWorkerOperatorNotifier({admin,env,fetch:fetchFn,log:()=>{}});
 assert.equal(await notify('order_failed',ID,{заказ:ID}),'sent');
 assert.equal(rpc[0].name,'claim_operator_alert');assert.equal(rpc[0].args.p_key,'order_failed:'+ID);assert.equal(rpc[0].args.p_dedup_seconds,3600);
 assert.match(sent[0].url,/bot-1\/sendMessage$/);assert.equal(sent[0].body.chat_id,'42');assert.match(sent[0].body.text,/замер не выполнен/);
 claimResult=false;assert.equal(await notify('order_failed',ID),'deduped');assert.equal(sent.length,1);
 claimResult=true;tgStatus=502;assert.equal(await notify('sla_breached',ID),'failed');assert.ok(rpc.some(r=>r.name==='record_operator_alert_error'));
 const off=createWorkerOperatorNotifier({admin,env:{},fetch:fetchFn,log:()=>{}});assert.equal(await off('health_degraded',null),'skipped');
});
