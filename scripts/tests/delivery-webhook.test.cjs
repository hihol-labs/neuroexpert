const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const webRequire=Module.createRequire(path.resolve('apps/web/package.json'));
const {NextRequest}=webRequire('next/server');
test('paid webhook returns 500 on job insert failure, retry attaches exactly one job',async()=>{
 const saved={ip:process.env.YUKASSA_WEBHOOK_IP_ALLOWLIST,secret:process.env.YUKASSA_WEBHOOK_SECRET};
 process.env.YUKASSA_WEBHOOK_IP_ALLOWLIST='';process.env.YUKASSA_WEBHOOK_SECRET='';
 const id='11111111-1111-4111-8111-111111111111',owner='22222222-2222-4222-8222-222222222222';
 const order={id,owner_id:owner,email:'owner@example.invalid',package:'audit_start',amount_rub:7900,niche_id:'niche',city:'Тюмень',status:'pending',job_id:null,yukassa_payment_id:'payment-1'};
 let inserts=0,fail=true;
 function query(table){let patch,insert;const predicates=[];let single=false;const q={
  select(){return q},eq(k,v){predicates.push(()=>order[k]===v);return q},is(k,v){return q.eq(k,v)},update(p){patch=p;return q},insert(p){insert=p;return q},single(){single=true;return q},maybeSingle(){single=true;return q},delete(){return q},
  then(resolve,reject){let data,error=null;if(table==='jobs'&&insert){if(fail){fail=false;error={message:'temporary insert failure'};data=null}else{inserts++;data={id:'job-1'}}}else{const ok=predicates.every(f=>f());if(ok&&patch)Object.assign(order,patch);data=single?(ok?structuredClone(order):null):(ok?[structuredClone(order)]:[])}return Promise.resolve({data,error}).then(resolve,reject)}
 };return q}
 const admin={from:query};
 try{
  const filename=path.resolve('apps/web/app/api/webhooks/yukassa/route.ts'),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));
  m.require=name=>name==='@supabase/supabase-js'?{createClient:()=>admin}:webRequire(name);
  m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,filename);
  const send=()=>m.exports.POST(new NextRequest('http://localhost/api/webhooks/yukassa',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event:'payment.succeeded',object:{id:'payment-1',status:'succeeded',amount:{value:'7900.00',currency:'RUB'},metadata:{type:'package',package:'audit_start',order_id:id,user_id:owner}}})}));
  assert.equal((await send()).status,500);assert.equal(order.status,'paid');assert.equal(order.job_id,null);
  assert.equal((await send()).status,200);assert.equal(order.job_id,'job-1');assert.equal(inserts,1);
  assert.equal((await send()).status,200);assert.equal(inserts,1);
 }finally{for(const [key,value]of [['YUKASSA_WEBHOOK_IP_ALLOWLIST',saved.ip],['YUKASSA_WEBHOOK_SECRET',saved.secret]]){if(value===undefined)delete process.env[key];else process.env[key]=value}}
});
