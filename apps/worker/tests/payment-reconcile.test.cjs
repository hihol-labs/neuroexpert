// R-01 (ADR-004): сверка pending/expired-заказов с кассой — фейковая касса и фейковая БД.
const assert=require('node:assert/strict'),test=require('node:test');
const {createPaymentReconcile}=require('../dist/services/payment-reconcile.js');
const {createAuditDelivery}=require('../dist/services/audit-delivery.js');
const OWNER='22222222-2222-4222-8222-222222222222',NOW=Date.parse('2026-09-08T12:00:00Z'),H=3600000;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status});
const clone=v=>structuredClone(v);

function order(over={}){return {id:`o-${Math.random().toString(16).slice(2,8)}`,owner_id:OWNER,email:'client@example.org',package:'audit_start',status:'pending',
 amount_rub:7900,yukassa_payment_id:'pay-1',payment_test:false,payment_shop_id:'live-shop',job_id:null,niche_id:'pair-1',created_at:new Date(NOW-2*H).toISOString(),...over};}
function payment(o,over={}){return {id:o.yukassa_payment_id,status:'succeeded',test:false,amount:{value:'7900.00',currency:'RUB'},
 metadata:{type:'package',package:'audit_start',order_id:o.id,user_id:o.owner_id},...over};}

/** Многострочная фейковая таблица package_orders: select/update/eq/in/is/order/limit/rpc. */
function harness(rows,options={}){
 const h={rows:rows.map(clone),kassa:options.kassa||{},kassaCalls:[],rpc:[],links:[],log:[],now:NOW};
 function query(){const filters=[];let patch,ordered=false,lim=Infinity;const q={
  select(){return q},update(v){patch=v;return q},eq(k,v){filters.push(r=>r[k]===v);return q},is(k,v){filters.push(r=>(r[k]??null)===v);return q},
  in(k,v){filters.push(r=>v.includes(r[k]));return q},lte(k,v){filters.push(r=>r[k]<=v);return q},order(){ordered=true;return q},limit(n){lim=n;return q},
  then(resolve){let m=h.rows.filter(r=>filters.every(f=>f(r)));if(ordered)m.sort((a,b)=>a.created_at<b.created_at?-1:1);m=m.slice(0,lim);
   if(patch)for(const r of m)Object.assign(r,clone(patch));return Promise.resolve({data:m.map(clone),error:null}).then(resolve)}};return q}
 h.pairs=[]; // R-03: активация локальной пары при paid — update niches ... .eq(id).not(vertical is null)
 const nichesQuery=()=>{const c={};const q={update(v){c.v=v;return q},eq(k,v){c.id=v;return q},not(){h.pairs.push({id:c.id,...c.v});return Promise.resolve({error:null})}};return q};
 const admin={from(t){if(t==='niches')return nichesQuery();assert.equal(t,'package_orders');return query()},async rpc(name,args){h.rpc.push({name,args});
  const r=h.rows.find(x=>x.id===args.p_order_id);if(name==='ensure_package_audit_job'){if(!r||r.status!=='paid')return {data:null,error:null};r.job_id??='job-'+r.id;return {data:r.job_id,error:null}}
  return {data:null,error:{message:'unexpected rpc '+name}}}};
 async function http(url,init={}){const u=new URL(String(url));const shop=Buffer.from(init.headers.Authorization.slice(6),'base64').toString().split(':')[0];
  const id=decodeURIComponent(u.pathname.split('/').pop());h.kassaCalls.push({shop,id});
  const entry=h.kassa[id];if(entry==='boom')return json({},503);if(!entry||entry.shop!==shop)return json({},404);return json(entry.payment)}
 h.service=createPaymentReconcile({admin,fetch:http,now:()=>h.now,log:l=>h.log.push(l),sendStatusLink:async(email,id)=>{if(options.linkFails)throw new Error('smtp down');h.links.push(id)},
  env:{YUKASSA_TEST_SHOP_ID:'test-shop',YUKASSA_TEST_SECRET_KEY:'t',YUKASSA_SHOP_ID:'live-shop',YUKASSA_SECRET_KEY:'l',...(options.env||{})}});
 return h;}

test('потерянный webhook: succeeded в кассе -> paid, job через ensure_package_audit_job, письмо-ссылка',async()=>{
 const o=order();const h=harness([o],{kassa:{'pay-1':{shop:'live-shop',payment:payment(o)}}});
 const s=await h.service.run();assert.deepEqual(s,{scanned:1,paid:1,failed:0,expired:0,kept:0,errors:0});
 const r=h.rows[0];assert.equal(r.status,'paid');assert.ok(r.paid_at);assert.equal(r.job_id,'job-'+o.id);assert.equal(r.reconciled_at,new Date(NOW).toISOString());
 assert.deepEqual(h.rpc.map(x=>x.name),['ensure_package_audit_job']);assert.deepEqual(h.links,[o.id]);
 assert.deepEqual(h.pairs,[{id:'pair-1',is_active:true}],'R-03: оплаченная локальная пара активирована');
});

test('гонка с webhook: заказ уже paid с job — сверка его не трогает и job не дублирует',async()=>{
 const o=order({status:'paid',paid_at:new Date(NOW-H).toISOString(),job_id:'job-1'});const h=harness([o],{kassa:{'pay-1':{shop:'live-shop',payment:payment(o)}}});
 const s=await h.service.run();assert.equal(s.scanned,0);assert.equal(h.rpc.length,0);assert.equal(h.rows[0].job_id,'job-1');
});

test('succeeded, но сумма/metadata не сходятся -> keep + лог для оператора, статус не меняется',async()=>{
 const o=order();const h=harness([o],{kassa:{'pay-1':{shop:'live-shop',payment:payment(o,{amount:{value:'100.00',currency:'RUB'}})}}});
 const s=await h.service.run();assert.equal(s.kept,1);assert.equal(h.rows[0].status,'pending');assert.equal(h.rpc.length,0);
 assert.ok(h.log.some(l=>/identity mismatch/.test(l)));
});

test('canceled в кассе -> failed без paid_at; письмо не шлётся',async()=>{
 const o=order();const h=harness([o],{kassa:{'pay-1':{shop:'live-shop',payment:payment(o,{status:'canceled'})}}});
 const s=await h.service.run();assert.equal(s.failed,1);assert.equal(h.rows[0].status,'failed');assert.equal(h.rows[0].failure_reason,'payment.canceled');assert.equal(h.links.length,0);
});

test('pending в кассе: внутри окна ждёт; старше окна -> expired; окно из env',async()=>{
 const fresh=order();const stale=order({yukassa_payment_id:'pay-2',created_at:new Date(NOW-25*H).toISOString()});
 const kassa={'pay-1':{shop:'live-shop',payment:payment(fresh,{status:'pending'})},'pay-2':{shop:'live-shop',payment:payment(stale,{status:'pending'})}};
 const h=harness([fresh,stale],{kassa});const s=await h.service.run();
 assert.deepEqual([s.kept,s.expired],[1,1]);assert.equal(h.rows[0].status,'pending');assert.equal(h.rows[1].status,'expired');assert.ok(h.rows[1].expired_at);
 const h2=harness([fresh,stale],{kassa,env:{PACKAGE_ORDER_EXPIRE_MINUTES:'2880'}});const s2=await h2.service.run();assert.equal(s2.expired,0);
});

test('заказ без платежа в кассе (id нет / 404) протухает по окну',async()=>{
 const noId=order({yukassa_payment_id:null,created_at:new Date(NOW-30*H).toISOString()});const gone=order({yukassa_payment_id:'pay-9',created_at:new Date(NOW-30*H).toISOString()});
 const h=harness([noId,gone]);const s=await h.service.run();assert.equal(s.expired,2);assert.equal(h.kassaCalls.length,1);
});

test('ошибка транспорта кассы (503): заказ пропущен, не протух, error посчитан',async()=>{
 const o=order({created_at:new Date(NOW-30*H).toISOString()});const h=harness([o],{kassa:{'pay-1':'boom'}});
 const s=await h.service.run();assert.equal(s.errors,1);assert.equal(h.rows[0].status,'pending');
});

test('оплата после протухания: expired + succeeded -> paid + job; expired без оплаты остаётся',async()=>{
 const late=order({status:'expired',expired_at:new Date(NOW-H).toISOString(),created_at:new Date(NOW-40*H).toISOString()});
 const still=order({status:'expired',yukassa_payment_id:'pay-3',expired_at:new Date(NOW-H).toISOString(),created_at:new Date(NOW-40*H).toISOString()});
 const h=harness([late,still],{kassa:{'pay-1':{shop:'live-shop',payment:payment(late)},'pay-3':{shop:'live-shop',payment:payment(still,{status:'pending'})}}});
 const s=await h.service.run();assert.deepEqual([s.paid,s.kept],[1,1]);assert.equal(h.rows[0].status,'paid');assert.ok(h.rows[0].job_id);assert.equal(h.rows[1].status,'expired');
});

test('магазин заказа недоступен (legacy без shop id при двух магазинах) -> keep, даже старый',async()=>{
 const o=order({payment_shop_id:null,payment_test:null,created_at:new Date(NOW-50*H).toISOString()});const h=harness([o],{kassa:{'pay-1':{shop:'live-shop',payment:payment(o)}}});
 const s=await h.service.run();assert.equal(s.kept,1);assert.equal(h.rows[0].status,'pending');assert.equal(h.kassaCalls.length,0);
});

test('письмо-ссылка упало: заказ всё равно paid с job, ошибка в логе',async()=>{
 const o=order();const h=harness([o],{kassa:{'pay-1':{shop:'live-shop',payment:payment(o)}},linkFails:true});
 const s=await h.service.run();assert.equal(s.paid,1);assert.equal(h.rows[0].status,'paid');assert.ok(h.log.some(l=>/status email .* failed: smtp down/.test(l)));
});

test('лимит 100 за проход, старые первыми',async()=>{
 const rows=Array.from({length:120},(_,i)=>order({yukassa_payment_id:null,created_at:new Date(NOW-(200-i)*H).toISOString()}));
 const h=harness(rows);const s=await h.service.run();assert.equal(s.scanned,100);assert.equal(h.rows.filter(r=>r.status==='expired').length,100);
 assert.equal(h.rows[119].status,'pending');
});

// ===== письма клиенту о провале/возврате из свипа delivery (идемпотентность) =====
function deliveryHarness(rows,options={}){
 const h={rows:rows.map(clone),mails:[],now:NOW};
 function query(){const filters=[];let patch,lim=Infinity;const q={select(){return q},update(v){patch=v;return q},eq(k,v){filters.push(r=>r[k]===v);return q},
  is(k,v){filters.push(r=>(r[k]??null)===v);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},lte(k,v){filters.push(r=>(r[k]??'9')<=v);return q},order(){return q},limit(n){lim=n;return q},
  then(resolve){let m=h.rows.filter(r=>filters.every(f=>f(r))).slice(0,lim);if(patch)for(const r of m)Object.assign(r,clone(patch));return Promise.resolve({data:m.map(clone),error:null}).then(resolve)}};return q}
 const admin={from(){return query()},async rpc(){return {data:null,error:null}}};
 h.service=createAuditDelivery({admin,fetch:async()=>json({},500),now:()=>h.now,env:{},sendReady:async()=>{},
  sendMail:options.noMailer?undefined:async m=>{if(options.smtpFails)throw new Error('smtp 4xx');h.mails.push(m)}});
 return h;}

test('свип: письмо о провале только при списанной оплате, один раз; письмо о возврате один раз',async()=>{
 const failedPaid={id:'f1',email:'a@x',status:'failed',paid_at:'2026-09-08T10:00:00Z',amount_rub:7900,refund_status:'submitted',notification_status:'not_required',created_at:'2026-09-08T09:00:00Z',city:'Тюмень',niches:{name:'Стоматология'}};
 const failedUnpaid={id:'f2',email:'b@x',status:'failed',paid_at:null,amount_rub:7900,refund_status:'not_required',notification_status:'not_required',created_at:'2026-09-08T09:00:00Z'};
 const refunded={id:'r1',email:'c@x',status:'refunded',paid_at:'2026-09-08T08:00:00Z',amount_rub:7900,refund_status:'succeeded',notification_status:'not_required',created_at:'2026-09-08T07:00:00Z'};
 const h=deliveryHarness([failedPaid,failedUnpaid,refunded]);await h.service.sweep();
 assert.deepEqual(h.mails.map(m=>[m.to,m.subject.startsWith('Аудит Старт: замер не выполнен')||m.subject.startsWith('Аудит Старт: возврат')]),[['a@x',true],['c@x',true]]);
 assert.match(h.mails[0].text,/автоматически/);assert.match(h.mails[0].text,/Стоматология, Тюмень/);assert.match(h.mails[0].text,/\/orders\/f1/);
 assert.ok(h.rows[0].failure_email_sent_at);assert.equal(h.rows[1].failure_email_sent_at??null,null);assert.ok(h.rows[2].refund_email_sent_at);
 await h.service.sweep();assert.equal(h.mails.length,2);
});

test('свип: ошибка SMTP пишется в *_email_last_error и повторяется на следующем свипе',async()=>{
 const refunded={id:'r1',email:'c@x',status:'refunded',paid_at:'2026-09-08T08:00:00Z',amount_rub:7900,refund_status:'succeeded',notification_status:'not_required',created_at:'2026-09-08T07:00:00Z'};
 const h=deliveryHarness([refunded],{smtpFails:true});await h.service.sweep();
 assert.equal(h.rows[0].refund_email_sent_at??null,null);assert.match(h.rows[0].refund_email_last_error,/smtp 4xx/);
});

test('свип: параллельные свипы (две реплики) отправляют письмо один раз — claim до отправки',async()=>{
 const refunded={id:'r1',email:'c@x',status:'refunded',paid_at:'2026-09-08T08:00:00Z',amount_rub:7900,refund_status:'succeeded',notification_status:'not_required',created_at:'2026-09-08T07:00:00Z'};
 const h=deliveryHarness([refunded]);await Promise.all([h.service.sweep(),h.service.sweep()]);assert.equal(h.mails.length,1);assert.ok(h.rows[0].refund_email_sent_at);
});

test('свип без транспорта писем: письма пропускаются, свип не падает',async()=>{
 const h=deliveryHarness([{id:'r1',email:'c@x',status:'refunded',paid_at:'x',amount_rub:7900,refund_status:'succeeded',notification_status:'not_required',created_at:'2026-09-08T07:00:00Z'}],{noMailer:true});
 await h.service.sweep();assert.equal(h.mails.length,0);
});
