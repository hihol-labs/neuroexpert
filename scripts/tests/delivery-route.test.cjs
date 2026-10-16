const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const routeFile=path.resolve('apps/web/app/api/audit/route.ts');
const webRequire=Module.createRequire(path.resolve('apps/web/package.json'));
function route(){
 const compiled=ts.transpileModule(fs.readFileSync(routeFile,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const m=new Module(routeFile,module);
 m.filename=routeFile;m.paths=Module._nodeModulePaths(path.dirname(routeFile));
 m.require=id=>id==='@/lib/supabase/admin'?{createAdminClient(){throw new Error('Unexpected database access')}}:webRequire(id);
 m._compile(compiled,routeFile);return m.exports.POST;
}
const {NextRequest}=webRequire('next/server');
async function call(handler,body,token){return handler(new NextRequest('http://localhost/api/audit',{method:'POST',headers:{'content-type':'application/json',...(token?{'x-audit-internal':token}:{})},body:JSON.stringify(body)}))}
test('paid requires configured matching internal token before DB/provider calls',async()=>{
 const old=process.env.AUDIT_INTERNAL_TOKEN;
 try{
  delete process.env.AUDIT_INTERNAL_TOKEN;assert.equal((await call(route(),{type:'paid'},'anything')).status,401);
  process.env.AUDIT_INTERNAL_TOKEN='test-internal-token';
  for(const token of [undefined,'wrong','test-internal-tokeX'])assert.equal((await call(route(),{type:'paid'},token)).status,401);
  assert.equal((await call(route(),{type:'paid'},'test-internal-token')).status,400);
 }finally{if(old===undefined)delete process.env.AUDIT_INTERNAL_TOKEN;else process.env.AUDIT_INTERNAL_TOKEN=old}
});
test('unknown audit types and invalid JSON shapes cannot unlock paid route',async()=>{
 for(const body of [null,[],{type:'premium'},{type:null},{type:2}])assert.equal((await call(route(),body)).status,400);
});
