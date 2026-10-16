import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url), ts=require('typescript');
const source=readFileSync('packages/shared/src/delivery/index.ts','utf8');
const tests=readFileSync('packages/shared/tests/delivery.test.cjs','utf8');
const mutations=[
 ['coverage threshold','covered < 8','covered < 7'],
 ['platform threshold','answeredPlatforms.size < 2','answeredPlatforms.size < 1'],
 ['duplicate questions','questions.has(canonicalQuestion)','false'],
 ['duplicate source ids','ids.has(id)','false'],
 ['invalid timestamp','!Number.isFinite(Date.parse(s))','false'],
 ['ten slots','r.gaps.length !== 10','r.gaps.length < 9'],
 ['SLA boundary','now - paid >= 60','now - paid > 60'],
 ['refund failed mode','return mode === "failed" || slaBreached','return slaBreached'],
 ['full vs degraded','return full ? "full" : "degraded"','return "full"'],
];
function execute(code){
 const dir=mkdtempSync(join(tmpdir(),'g019-mutation-'));
 try{mkdirSync(join(dir,'dist/delivery'),{recursive:true});mkdirSync(join(dir,'tests'));
  const compiled=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  writeFileSync(join(dir,'dist/delivery/index.js'),compiled);writeFileSync(join(dir,'tests/delivery.test.cjs'),tests);
  const result=spawnSync(process.execPath,['--test',join(dir,'tests/delivery.test.cjs')],{encoding:'utf8'});
  if(result.error||result.signal)throw result.error??new Error(result.signal);return result;
 }finally{rmSync(dir,{recursive:true,force:true})}
}
const positive=execute(source);if(positive.status!==0)throw new Error(positive.stdout+positive.stderr);
for(const [name,from,to] of mutations){if(!source.includes(from))throw new Error(`Mutation anchor missing: ${name}`);const r=execute(source.replace(from,to));if(r.status===0)throw new Error(`Survived mutation: ${name}`);console.log(`KILLED: ${name}`)}
console.log(`PASS: ${mutations.length} delivery behavior mutations killed`);
