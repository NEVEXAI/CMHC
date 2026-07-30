const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../assets/app.js'),'utf8');
const truncated=src.slice(0,src.indexOf('function setupStaticEvents(){'));
const node=()=>({innerHTML:'',textContent:'',className:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return node()},querySelectorAll(){return[]}});
const ctx={console,crypto:{randomUUID:()=>`audit-${Math.random()}`},document:{querySelector:()=>node(),querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}},confirm:()=>true,alert(){},Blob:function(){},URL:{createObjectURL(){return''},revokeObjectURL(){}},FileReader:function(){}};
vm.createContext(ctx);vm.runInContext(truncated+'\n;globalThis.__q={defaultProject,renderMain,renderDashboard,renderProperty,renderPlanning,renderUnitMix,renderBudget,renderOperations,renderCMHC,renderFinancing,renderReturns,renderDue,renderDocuments,renderRisks,renderTeam,renderTimeline,renderAI,renderReport,renderGuide,setState:x=>{state=x}};',ctx);
const st=ctx.__q.defaultProject();ctx.__q.setState(st);
function get(o,p){return p.split('.').reduce((x,k)=>x?.[k],o)}
const fieldPaths=[...src.matchAll(/field\([^,]+,'([^']+)'/g)].map(m=>m[1]);
const missing=[...new Set(fieldPaths)].filter(p=>get(st,p)===undefined);
assert.deepStrictEqual(missing,[],`Missing default paths: ${missing.join(', ')}`);
for(const fn of ['renderDashboard','renderProperty','renderPlanning','renderUnitMix','renderBudget','renderOperations','renderCMHC','renderFinancing','renderReturns','renderDue','renderDocuments','renderRisks','renderTeam','renderTimeline','renderAI','renderReport','renderGuide']){const out=ctx.__q[fn]();assert.equal(typeof out,'string',fn);assert.ok(out.length>20,fn)}
console.log(`PASS ${new Set(fieldPaths).size} unique input paths exist in default schema`);
console.log('PASS all 17 view renderers return valid markup strings');
