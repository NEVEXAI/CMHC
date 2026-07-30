
const DBKEY='qraos_complete_projects_v4';
const money=n=>Number(n||0).toLocaleString('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0});
const pct=n=>`${Number(n||0).toFixed(1)}%`;
const whole=n=>Math.round(Number(n||0)).toLocaleString('en-CA');
const uid=()=>crypto.randomUUID?crypto.randomUUID():'id-'+Date.now()+'-'+Math.random().toString(16).slice(2);
const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n||0)));
const paymentFactor=(annualRate,years)=>{const r=Math.max(0,Number(annualRate||0))/100/12,n=Math.max(0,Number(years||0))*12;if(!n)return 0;if(!r)return 1/n;return r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1)};
const loanBalance=(principal,annualRate,years,months)=>{const p=Math.max(0,Number(principal||0)),r=Math.max(0,Number(annualRate||0))/100/12,n=Math.max(1,Math.round(Number(years||0)*12)),m=Math.min(n,Math.max(0,Math.round(Number(months||0))));if(!p)return 0;if(!r)return Math.max(0,p*(1-m/n));const pay=p*paymentFactor(annualRate,years);return Math.max(0,p*Math.pow(1+r,m)-pay*(Math.pow(1+r,m)-1)/r)};
const npv=(rate,cfs)=>cfs.reduce((v,c,i)=>v+Number(c||0)/Math.pow(1+rate,i),0);
const irr=(cfs)=>{if(!cfs.some(x=>x<0)||!cfs.some(x=>x>0))return null;let lo=-.9999,hi=10;for(let i=0;i<220;i++){const mid=(lo+hi)/2,v=npv(mid,cfs);if(Math.abs(v)<1e-8)return mid;if(v>0)lo=mid;else hi=mid}return (lo+hi)/2};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let dirty=false,currentId=null,state={};

const navItems=[["dashboard", "1. Dashboard"], ["property", "2. Property & Site"], ["planning", "3. Planning & Approvals"], ["unitmix", "4. Unit Mix & Revenue"], ["budget", "5. Development Budget"], ["operations", "6. Operating Pro Forma"], ["cmhc", "7. CMHC ACLP"], ["financing", "8. Financing"], ["returns", "9. Returns & Land Value"], ["duediligence", "10. Due Diligence"], ["documents", "11. Documents"], ["risks", "12. Risk Register"], ["team", "13. Team & RACI"], ["timeline", "14. Project Plan"], ["ai", "15. AI Workflows"], ["report", "16. Investment Report"], ["guide", "17. Guide"]];
document.querySelector('#nav').innerHTML=navItems.map((x,i)=>`<button class="nav-btn ${i===0?'active':''}" data-view="${x[0]}">${x[1]}</button>`).join('');

const defaultDocs=[
['Application','Integrity Declaration','Required','Not Started','','Applicant','Newly signed for each application'],
['Application','Corporate documents / articles / bylaws','Required','Not Started','','Legal','Include ownership structure and related entities'],
['Application','Organization chart','Required','Not Started','','Applicant','Include registered/beneficial ownership where applicable'],
['Application','3 years financial statements','Required','Not Started','','Accounting','Proponent, guarantors and parent where applicable'],
['Application','Personal net worth statements','Conditional','Not Started','','Guarantors','If individual guarantors'],
['Application','Development experience resumes','Required','Not Started','','Developer/GC','Similar projects, budget, levels, units and completion year'],
['Application','Property management experience','Required','Not Started','','Property manager','5 years similar size/type or long-term third party contract'],
['Application','Full narrative appraisal','Required','Not Started','','AACI / E.A.','As-is, as-improved, economic life, market and absorption'],
['Application','Purchase agreement / title / tax assessment','Required','Not Started','','Legal','Confirm ownership and legal description'],
['Application','Approved zoning evidence','Required','Not Started','','Municipality','Written municipal documentation'],
['Application','Site plan application','Conditional','Not Started','','Architect/Planner','Where required'],
['Application','Phase I ESA','Required','Not Started','','Environmental','Lender reliance at underwriting'],
['Application','Phase II / remediation documents','Conditional','Not Started','','Environmental','If Phase I recommends'],
['Application','Geotechnical report','Required','Not Started','','Geotechnical','Feasibility under soil conditions'],
['Application','ACLP Project Assessment Workbook','Required','Not Started','','Applicant/Lender','Official CMHC workbook'],
['Application','Class B cost estimate','Required','Not Started','','Quantity Surveyor','Within required freshness'],
['Application','Funding sources / co-funders','Required','Not Started','','Finance','Include grants, waivers, forgivable loans and in-kind'],
['Underwriting','Pro-forma rent roll','Required','Not Started','','Appraiser/Applicant','Unit-level rents and affordability designation'],
['Underwriting','Energy efficiency attestation','Conditional','Not Started','','Energy professional','Signed by eligible professional'],
['Underwriting','Accessibility attestation','Conditional','Not Started','','Architect/Consultant','Signed by eligible professional'],
['Underwriting','Covenant on title / housing agreement','Conditional','Not Started','','Legal','Affordability and other commitments'],
['Underwriting','Draft funding and operating agreements','Conditional','Not Started','','Legal','All applicable agreements'],
['Loan Agreement','Final organizational chart and signing authority','Required','Not Started','','Legal','Authorized signatures'],
['Loan Agreement','Detailed building plans and specifications','Required','Not Started','','Design team','Architectural, structural, mechanical, electrical'],
['Loan Agreement','Executed agreements','Required','Not Started','','Legal','CMHC legal requirements'],
['Loan Agreement','Construction schedule','Required','Not Started','','GC/QS','Key milestones'],
['Loan Agreement','Property encumbrances and discharges','Required','Not Started','','Legal','Permitted encumbrances and subordination'],
['First Advance','Final drawdown schedule','Required','Not Started','','QS/Lender','Equity and co-funder timing'],
['First Advance','Building permit and municipal approvals','Required','Not Started','','Municipality','Zoning/site plan/building permits'],
['First Advance','Security registrations and guarantees','Required','Not Started','','Legal/Lender','As required'],
['First Advance','Project status / consultant certificates','Required','Not Started','','Consultants','CMHC loan agreement forms'],
['First Advance','Statutory declaration CCDC 9A or equivalent','Required','Not Started','','GC','Current'],
['First Advance','Separate project bank account','Required','Not Started','','Finance','Proof of dedicated account'],
['First Advance','Class A QS report','Required','Not Started','','Quantity Surveyor','Budget, cash flow, sources, fixed-price coverage'],
['First Advance','Labour/material and performance bonds','Conditional','Not Started','','GC/Bonding','Minimum 50% if applicable; CMHC dual obligee'],
['First Advance','Insurance consultant report','Required','Not Started','','CRM/CRIS consultant','Certificates and CMHC scope']
];

function defaultProject(){
 return {
  meta:{id:uid(),projectName:'New Development',address:'',municipality:'Montréal',province:'Québec',stage:'Lead',listingUrl:'',askingPrice:0,targetOffer:0,existingUnits:0,targetUnits:20,acquisitionNotes:''},
  site:{lotArea:0,frontage:0,depth:0,existingBuildingArea:0,topography:'Unknown',access:'Unknown',floodplain:'Unknown',contamination:'Unknown',easement:'Unknown',heritage:'Unknown',servicing:'Unknown',laterals:'Unknown',physicalConstraints:''},
  planning:{zoneCode:'',multifamily:'Unknown',legalUse:'',legalUnitCount:0,maxUnits:0,maxStoreys:3,maxHeight:0,coveragePct:60,far:0,frontSetback:0,rearSetback:0,sideSetbacks:0,parkingRatio:1,bikeRatio:1,approvalPath:'Unknown',subdivision:'Not required',municipalFacts:'',municipalAssumptions:'',
   approvals:[
    ['Zoning confirmation','Municipality','Not Started','','','Written confirmation of use, units, density and standards'],
    ['PIIA / site plan','Planner / Architect','Not Applicable','','',''],
    ['Minor variance','Planner','Not Applicable','','',''],
    ['PPCMOI / discretionary','Planner','Not Applicable','','',''],
    ['Subdivision','Surveyor / Municipality','Not Applicable','','',''],
    ['Demolition authorization','Municipality','Not Applicable','','',''],
    ['Building permit','Architect','Not Started','','',''],
    ['Civil / servicing approvals','Civil engineer','Not Started','','',''],
    ['Fire review','Architect / Engineer','Not Started','','','']
   ]},
  unitmix:{otherIncome:0,vacancyPct:3,badDebtPct:0,rentGrowthPct:2,preleasePct:0,absorptionRate:2,stabilizedOccupancy:97,marketStudyStatus:'Not Started',housingNeed:'',
   units:[
    ['Studio',0,450,1400,0,'Market'],
    ['1 Bedroom',10,650,1750,0,'Market'],
    ['2 Bedroom',8,850,2200,0,'Market'],
    ['3 Bedroom',2,1050,2700,0,'Market']
   ]},
  budget:{constructionContingencyPct:8,softContingencyPct:3,developerFeePct:5,nonRecoverableTax:0,fixedPriceCoveragePct:0,qsClass:'None',budgetDate:'',costEscalationPct:0,
   costs:[
    ['Land','Land acquisition',0,'Land'],['Hard','Demolition',0,'Hard'],['Hard','Site work / civil',0,'Hard'],['Hard','Structure and envelope',0,'Hard'],['Hard','Mechanical',0,'Hard'],['Hard','Electrical',0,'Hard'],['Hard','Interiors and finishes',0,'Hard'],['Hard','Elevator',0,'Hard'],['Hard','Landscaping / exterior',0,'Hard'],
    ['Soft','Architecture',0,'Soft'],['Soft','Engineering',0,'Soft'],['Soft','Planning / municipal',0,'Soft'],['Soft','Survey / legal',0,'Soft'],['Soft','Environmental / geotechnical',0,'Soft'],['Soft','Quantity surveyor',0,'Soft'],['Soft','Appraisal / market study',0,'Soft'],['Soft','Insurance / bonding',0,'Soft'],['Soft','Marketing / lease-up',0,'Soft'],['Financing','Interest and carrying',0,'Financing'],['Financing','Lender / legal fees',0,'Financing'],['Other','Municipal and utility charges',0,'Other']
   ]},
  operations:{managementPct:4,reservePerUnit:350,expenseGrowthPct:2,capRate:5,
   expenses:[['Municipal taxes',0],['Insurance',0],['Heat / gas',0],['Hydro / common area',0],['Water',0],['Repairs and maintenance',0],['Superintendent / wages',0],['Administration',0],['Snow / landscaping',0],['Security / fire monitoring',0],['Other',0]],
   commercial:{annualBaseRent:0,annualRecoveries:0,annualOtherIncome:0,vacancyPct:5,badDebtPct:1,stabilizedOccupancy:95,managementPct:4,reserveAnnual:0,preleasePct:0,absorptionMonths:12,expenses:[['Commercial property taxes',0],['Commercial insurance',0],['Commercial utilities',0],['Commercial repairs and maintenance',0],['Commercial administration',0],['Commercial leasing / TI reserve',0],['Other commercial expense',0]]}},
  cmhc:{projectType:'Standard rental',primaryResidential:'Yes',nonResidentialGfaPct:0,nonResidentialCostPct:0,permanentHousing:'Yes',borrowerCredit:'Unknown',constructionExperience:'Unknown',managementExperience:'Unknown',housingNeedConfirmed:'Unknown',
   affordabilityCriteria:'Criteria A',affordableUnitPct:20,affordabilityDepth:30,affordabilityYears:10,criteriaBApproved:'No',
   buildingCode:'Part 3 - NECB',energyTier:'Tier 1',accessibilityLevel:'Local code only',marketType:'Market Type 1',
   communityTransit:'No',alternateTransit:'No',childcare:'No',priorityGroup:'No',governmentSupportCount:0,landDonation:'No',partnerships:0,
   borrowerNetWorth:0,guaranteeCapacity:'Unknown',applicationFeeOverride:0},
  financing:{interestRate:4.5,qualificationRate:5.5,constructionInterestRate:5.5,amortYears:45,minDcrResidential:1.10,minDcrNonResidential:1.40,requestedLtc:90,requestedNonResidentialLtc:75,loanTermYears:10,otherFunding:0,grants:0,forgivableLoans:0,landEquity:0,ownerCash:0,nonResidentialLoan:0,includeCalculatedCarry:'Yes',drawProfile:'S-curve'},
  returns:{exitCapRate:5,saleCostsPct:2,holdYears:10,annualValueGrowthPct:2,requiredProfitPct:15,discountRate:10,constructionMonths:24,leaseupMonths:12,exitMethod:'Lower of capitalized NOI and value growth',sellingYearNoi:'Next year NOI'},
  due:{items:[
    ['Legal / title','Certificate of location / survey','High','Not Started','',''],
    ['Legal / title','Title search and encumbrances','Fatal','Not Started','',''],
    ['Municipal','Written zoning confirmation','Fatal','Not Started','',''],
    ['Municipal','Legal use and dwelling count','Fatal','Not Started','',''],
    ['Planning','Highest and best legal use','High','Not Started','',''],
    ['Environmental','Phase I ESA','High','Not Started','',''],
    ['Geotechnical','Soil feasibility','High','Not Started','',''],
    ['Engineering','Structural / building condition','High','Not Started','',''],
    ['Servicing','Water, sanitary, storm and fire flow','Fatal','Not Started','',''],
    ['Financial','Class B budget','High','Not Started','',''],
    ['Market','Appraisal and absorption','High','Not Started','',''],
    ['Financing','Lender / CMHC pre-screen','High','Not Started','',''],
    ['Insurance','Construction and completed-project insurability','High','Not Started','',''],
    ['Tenancy','Vacant possession / leases','High','Not Applicable','','']
   ]},
  documents:{items:JSON.parse(JSON.stringify(defaultDocs))},
  risks:{items:[
    ['Zoning / use not confirmed','Planning','High','High','Open','','Obtain written confirmation'],
    ['Construction cost overrun','Construction','Medium','High','Open','','Class B/A estimate, contingency and fixed-price coverage'],
    ['Servicing capacity','Technical','Medium','High','Open','','Written capacity confirmation and civil concept'],
    ['Rental assumptions','Market','Medium','High','Open','','Lender-reliance appraisal and absorption study'],
    ['CMHC qualification','Financing','Medium','High','Open','','Pre-screen with approved lender and maintain alternate financing']
  ]},
  team:{items:[
    ['Project sponsor / borrower','','Sponsor','Responsible','',''],['Real estate broker','','Acquisition','Consulted','',''],['Lawyer / notary','','Legal','Responsible','',''],['Architect','','Design','Responsible','',''],['Urban planner','','Planning','Responsible','',''],['Civil engineer','','Servicing','Responsible','',''],['Structural engineer','','Engineering','Responsible','',''],['Mechanical / electrical engineer','','Engineering','Responsible','',''],['Land surveyor','','Survey','Responsible','',''],['Environmental consultant','','Environmental','Responsible','',''],['Geotechnical engineer','','Geotechnical','Responsible','',''],['Quantity surveyor','','Cost','Responsible','',''],['AACI / E.A. appraiser','','Valuation','Responsible','',''],['General contractor','','Construction','Responsible','',''],['Property manager','','Operations','Responsible','',''],['CMHC-approved lender','','Financing','Responsible','',''],['Insurance consultant','','Insurance','Responsible','','']
  ]},
  timeline:{items:[
    ['Acquisition screening','Acquisition',0,7,'Not Started',''],['Municipal pre-screen','Planning',1,10,'Not Started',''],['Offer and conditions','Acquisition',7,21,'Not Started',''],['Due diligence','Due Diligence',14,35,'Not Started',''],['Concept / massing','Design',14,42,'Not Started',''],['CMHC/lender pre-screen','Financing',21,60,'Not Started',''],['Planning approvals','Approvals',45,180,'Not Started',''],['Detailed design','Design',120,240,'Not Started',''],['Building permit','Approvals',210,300,'Not Started',''],['CMHC underwriting','Financing',180,330,'Not Started',''],['Construction','Construction',330,1050,'Not Started',''],['Lease-up','Operations',900,1260,'Not Started',''],['Stabilization','Operations',1050,1415,'Not Started','']
  ]},
  ai:{dueDiligenceResponse:'',municipalResponse:'',architectResponse:'',lenderResponse:''},
  notes:{created:new Date().toISOString(),updated:new Date().toISOString()}
 }
}

function mergeDefaults(base,value){
 if(Array.isArray(base))return Array.isArray(value)?value:JSON.parse(JSON.stringify(base));
 if(base&&typeof base==='object'){const out={};for(const k of Object.keys(base))out[k]=mergeDefaults(base[k],value?.[k]);if(value&&typeof value==='object')for(const k of Object.keys(value))if(!(k in out))out[k]=value[k];return out}
 return value===undefined?base:value;
}
function normalizeProject(project){const fresh=defaultProject(),merged=mergeDefaults(fresh,project||{});if(project?.meta?.id)merged.meta.id=project.meta.id;if(project?.notes?.created)merged.notes.created=project.notes.created;return merged}

function projects(){try{return JSON.parse(localStorage.getItem(DBKEY)||'[]')}catch{return[]}}
function saveProjects(a){localStorage.setItem(DBKEY,JSON.stringify(a))}
function flatGet(path){return path.split('.').reduce((o,k)=>o?.[k],state)}
function flatSet(path,val){const p=path.split('.');let o=state;while(p.length>1){const k=p.shift();o[k]??={};o=o[k]}o[p[0]]=val}
function numericInput(v){return v===''?'':Number(v)}
function markDirty(){dirty=true;document.querySelector('#saveState').textContent='Unsaved changes'}
function persist(){
 state.notes.updated=new Date().toISOString();
 const arr=projects(); const ix=arr.findIndex(x=>x.meta.id===state.meta.id);
 if(ix>=0)arr[ix]=state;else arr.unshift(state); saveProjects(arr); currentId=state.meta.id; dirty=false;
 document.querySelector('#saveState').textContent='Saved'; renderProjectSelect(); recalc();
}
function load(id){
 const p=projects().find(x=>x.meta.id===id); if(!p)return; state=normalizeProject(JSON.parse(JSON.stringify(p)));currentId=id;dirty=false;document.querySelector('#saveState').textContent='Loaded';renderAll()
}
function createNew(){
 if(dirty&&!confirm('Discard unsaved changes and create a new project?'))return;
 state=defaultProject();currentId=state.meta.id;dirty=true;renderAll()
}
function renderProjectSelect(){
 const arr=projects(); const s=document.querySelector('#projectSelect');
 s.innerHTML=[...arr.map(p=>`<option value="${p.meta.id}" ${p.meta.id===state.meta.id?'selected':''}>${esc(p.meta.projectName||'Untitled')}</option>`),`<option value="">— Unsaved / New —</option>`].join('');
 if(!arr.some(p=>p.meta.id===state.meta.id))s.value='';
}
function field(label,path,type='text',opts=[]){
 const v=flatGet(path)??'';
 if(type==='select')return `<label>${label}<select data-path="${path}">${opts.map(o=>`<option ${String(v)===String(o)?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;
 if(type==='textarea')return `<label class="span-4">${label}<textarea data-path="${path}">${esc(v)}</textarea></label>`;
 return `<label>${label}<input type="${type}" data-path="${path}" value="${esc(v)}"></label>`;
}
function pageTitle(t,s){return `<div class="page-title"><h2>${t}</h2><span>${s}</span></div>`}
function card(title,body){return `<div class="card"><h3>${title}</h3>${body}</div>`}
function table(headers,rows,id,types){
 return `<div class="table-wrap"><table id="${id}"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map((r,ri)=>`<tr>${r.map((v,ci)=>{
  const tp=types[ci]||'text'; let control;
  if(tp.startsWith('select:')){const opts=tp.slice(7).split('|');control=`<select data-table="${id}" data-r="${ri}" data-c="${ci}">${opts.map(o=>`<option ${String(v)===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`}
  else if(tp==='number')control=`<input type="number" data-table="${id}" data-r="${ri}" data-c="${ci}" value="${esc(v)}">`;
  else if(tp==='date')control=`<input type="date" data-table="${id}" data-r="${ri}" data-c="${ci}" value="${esc(v)}">`;
  else control=`<input data-table="${id}" data-r="${ri}" data-c="${ci}" value="${esc(v)}">`;
  return `<td>${control}</td>`}).join('')}<td class="row-actions"><button class="icon-btn" data-delete-row="${id}" data-r="${ri}">✕</button></td></tr>`).join('')}</tbody></table></div>`
}
function kpi(label,value,sub=''){return `<div class="kpi"><div class="label">${label}</div><strong>${value}</strong>${sub?`<small>${sub}</small>`:''}</div>`}

function formulas(){
 const units=state.unitmix.units.reduce((s,r)=>s+Math.max(0,Number(r[1]||0)),0);
 const avgSize=units?state.unitmix.units.reduce((s,r)=>s+Math.max(0,Number(r[1]||0))*Math.max(0,Number(r[2]||0)),0)/units:0;
 const monthlyRent=state.unitmix.units.reduce((s,r)=>{const count=Math.max(0,Number(r[1]||0)),market=Math.max(0,Number(r[3]||0)),aff=Math.max(0,Number(r[4]||0)),d=String(r[5]||'Market').toLowerCase();return s+count*((d==='affordable a'||d==='affordable b')&&aff>0?aff:market)},0);
 const residentialGpr=monthlyRent*12+Math.max(0,Number(state.unitmix.otherIncome||0));
 const occupancyLoss=Math.max(clamp(state.unitmix.vacancyPct,0,100),100-clamp(state.unitmix.stabilizedOccupancy,0,100));
 const residentialLossPct=Math.min(100,occupancyLoss+clamp(state.unitmix.badDebtPct,0,100));
 const residentialVacancy= residentialGpr*residentialLossPct/100;
 const residentialEgi=Math.max(0,residentialGpr-residentialVacancy);
 const residentialExpenseBase=state.operations.expenses.reduce((s,r)=>s+Math.max(0,Number(r[1]||0)),0);
 const residentialManagement=residentialEgi*clamp(state.operations.managementPct,0,100)/100;
 const residentialReserve=units*Math.max(0,Number(state.operations.reservePerUnit||0));
 const residentialOpex=residentialExpenseBase+residentialManagement+residentialReserve;
 const residentialNoi=residentialEgi-residentialOpex;
 const c=state.operations.commercial||{};
 const commercialGpr=Math.max(0,Number(c.annualBaseRent||0))+Math.max(0,Number(c.annualRecoveries||0))+Math.max(0,Number(c.annualOtherIncome||0));
 const commercialOccupancyLoss=Math.max(clamp(c.vacancyPct,0,100),100-clamp(c.stabilizedOccupancy,0,100));
 const commercialLossPct=Math.min(100,commercialOccupancyLoss+clamp(c.badDebtPct,0,100));
 const commercialVacancy=commercialGpr*commercialLossPct/100;
 const commercialEgi=Math.max(0,commercialGpr-commercialVacancy);
 const commercialExpenseBase=(c.expenses||[]).reduce((s,r)=>s+Math.max(0,Number(r[1]||0)),0);
 const commercialManagement=commercialEgi*clamp(c.managementPct,0,100)/100;
 const commercialReserve=Math.max(0,Number(c.reserveAnnual||0));
 const commercialOpex=commercialExpenseBase+commercialManagement+commercialReserve;
 const commercialNoi=commercialEgi-commercialOpex;
 const grossRent=residentialGpr+commercialGpr,vacancy=residentialVacancy+commercialVacancy,egi=residentialEgi+commercialEgi,expenseBase=residentialExpenseBase+commercialExpenseBase,management=residentialManagement+commercialManagement,reserve=residentialReserve+commercialReserve,opex=residentialOpex+commercialOpex,noi=residentialNoi+commercialNoi;
 const hardBase=state.budget.costs.filter(r=>r[3]==='Hard').reduce((s,r)=>s+Math.max(0,Number(r[2]||0)),0),softBase=state.budget.costs.filter(r=>r[3]==='Soft').reduce((s,r)=>s+Math.max(0,Number(r[2]||0)),0),land=state.budget.costs.filter(r=>r[3]==='Land').reduce((s,r)=>s+Math.max(0,Number(r[2]||0)),0),financing=state.budget.costs.filter(r=>r[3]==='Financing').reduce((s,r)=>s+Math.max(0,Number(r[2]||0)),0),otherBase=state.budget.costs.filter(r=>r[3]==='Other').reduce((s,r)=>s+Math.max(0,Number(r[2]||0)),0);
 const escalationPct=Math.max(0,Number(state.budget.costEscalationPct||0)),escalationFactor=1+escalationPct/100,hard=hardBase*escalationFactor,soft=softBase*escalationFactor,other=otherBase*escalationFactor,escalation=(hardBase+softBase+otherBase)*escalationPct/100;
 const hardCont=hard*clamp(state.budget.constructionContingencyPct,0,100)/100,softCont=soft*clamp(state.budget.softContingencyPct,0,100)/100,developerFee=(hard+soft)*clamp(state.budget.developerFeePct,0,100)/100;
 const baseCost=hard+soft+land+financing+other+hardCont+softCont+developerFee+Math.max(0,Number(state.budget.nonRecoverableTax||0));
 const score=cmhcScore(),programMaxLtc=score.tier===1?100:score.tier===2?95:90,requestedLtcRaw=Number(state.financing.requestedLtc),requestedLtc=Number.isFinite(requestedLtcRaw)&&requestedLtcRaw>0?Math.min(requestedLtcRaw,100):programMaxLtc,maxLtc=Math.min(programMaxLtc,requestedLtc),requestedNonResidentialLtc=Math.min(75,Math.max(0,Number(state.financing.requestedNonResidentialLtc||75)));
 const nonResidentialCostPct=clamp(state.cmhc.nonResidentialCostPct,0,100)/100,qualFactor=paymentFactor(state.financing.qualificationRate||state.financing.interestRate,state.financing.amortYears),actualFactor=paymentFactor(state.financing.interestRate,state.financing.amortYears),resDcr=Math.max(.01,Number(state.financing.minDcrResidential||1.1)),nonResDcr=Math.max(.01,Number(state.financing.minDcrNonResidential||1.4));
 let calculatedCarry=0,totalCost=baseCost,loan=0,ltcLoan=0,dcrLoan=0,residentialLtcLoan=0,nonResidentialLtcLoan=0,residentialDcrLoan=0,nonResidentialDcrCapacity=0,nonResidentialDcrLoan=0;
 const constructionMonths=Math.max(1,Math.round(Number(state.returns.constructionMonths||1))),enteredLeaseupMonths=Math.max(0,Math.round(Number(state.returns.leaseupMonths||0))),includeCarry=state.financing.includeCalculatedCarry==='Yes';
 const residentialTargetOcc=clamp(state.unitmix.stabilizedOccupancy,0,100)/100,residentialPreleaseOcc=clamp(state.unitmix.preleasePct,0,100)/100,residentialAbsorption=Math.max(.01,Number(state.unitmix.absorptionRate||0));
 const calculatedResidentialLeaseupMonths=Math.max(0,Math.ceil(Math.max(0,residentialTargetOcc-residentialPreleaseOcc)*Math.max(0,units)/residentialAbsorption));
 const commercialTargetOcc=clamp(c.stabilizedOccupancy,0,100)/100,commercialPreleaseOcc=clamp(c.preleasePct,0,100)/100,commercialAbsorptionMonths=Math.max(0,Math.ceil(Number(c.absorptionMonths||0)));
 const calculatedCommercialLeaseupMonths=commercialGpr>0?Math.max(0,Math.ceil(commercialAbsorptionMonths*Math.max(0,commercialTargetOcc-commercialPreleaseOcc))):0;
 const effectiveLeaseupMonths=Math.max(enteredLeaseupMonths,calculatedResidentialLeaseupMonths,calculatedCommercialLeaseupMonths);
 for(let iter=0;iter<12;iter++){
  totalCost=baseCost+(includeCarry?calculatedCarry:0);
  const eligibleNonResCost=totalCost*nonResidentialCostPct,eligibleResCost=totalCost-eligibleNonResCost;
  residentialLtcLoan=eligibleResCost*maxLtc/100;nonResidentialLtcLoan=eligibleNonResCost*requestedNonResidentialLtc/100;ltcLoan=residentialLtcLoan+nonResidentialLtcLoan;
  residentialDcrLoan=qualFactor?Math.max(0,residentialNoi)/resDcr/(qualFactor*12):0;nonResidentialDcrCapacity=qualFactor?Math.max(0,commercialNoi)/nonResDcr/(qualFactor*12):0;
  const entered=Math.max(0,Number(state.financing.nonResidentialLoan||0));nonResidentialDcrLoan=entered>0?Math.min(nonResidentialDcrCapacity,entered):nonResidentialDcrCapacity;dcrLoan=residentialDcrLoan+nonResidentialDcrLoan;loan=Math.max(0,Math.min(ltcLoan,dcrLoan));
  if(!includeCarry){calculatedCarry=0;break}
  const monthlyRate=Math.max(0,Number(state.financing.constructionInterestRate||state.financing.interestRate||0))/100/12;let outstanding=0,interest=0;
  const weights=[];for(let m=1;m<=constructionMonths;m++){const x=(m-.5)/constructionMonths;weights.push(state.financing.drawProfile==='Front-loaded'?1.5-x:state.financing.drawProfile==='Back-loaded'?.5+x:Math.sin(Math.PI*x))}const wsum=weights.reduce((a,b)=>a+b,0);
  for(const w of weights){const draw=loan*w/wsum;interest+=(outstanding+draw/2)*monthlyRate;outstanding+=draw}
  for(let m=1;m<=effectiveLeaseupMonths;m++){const ro=Math.min(residentialTargetOcc,residentialPreleaseOcc+(residentialAbsorption*m/Math.max(1,units))),co=commercialAbsorptionMonths>0?Math.min(commercialTargetOcc,commercialPreleaseOcc+(commercialTargetOcc-commercialPreleaseOcc)*m/commercialAbsorptionMonths):commercialTargetOcc;const resRamp=residentialTargetOcc?Math.max(0,residentialNoi)/12*(ro/residentialTargetOcc):Math.max(0,residentialNoi)/12,comRamp=commercialTargetOcc?Math.max(0,commercialNoi)/12*(co/commercialTargetOcc):Math.max(0,commercialNoi)/12;interest+=Math.max(0,outstanding*monthlyRate-resRamp-comRamp)}
  if(Math.abs(interest-calculatedCarry)<1){calculatedCarry=interest;break}calculatedCarry=interest;
 }
 const value=Number(state.operations.capRate)>0?noi/(Number(state.operations.capRate)/100):0;
 const otherFunding=Math.max(0,Number(state.financing.otherFunding||0)),grants=Math.max(0,Number(state.financing.grants||0)),forgivableLoans=Math.max(0,Number(state.financing.forgivableLoans||0)),landEquity=Math.max(0,Number(state.financing.landEquity||0)),ownerCash=Math.max(0,Number(state.financing.ownerCash||0)),contributedSources=otherFunding+grants+forgivableLoans+landEquity+ownerCash,equity=Math.max(0,totalCost-loan-contributedSources),investedEquity=equity+ownerCash+landEquity;
 const qualifyingDebt=qualFactor?loan*qualFactor*12:0,actualDebt=actualFactor?loan*actualFactor*12:0,qualifyingDcr=qualifyingDebt?noi/qualifyingDebt:0,actualDcr=actualDebt?noi/actualDebt:0;
 const requiredProfitPct=Math.max(0,Number(state.returns.requiredProfitPct||0))/100,residual=value-(totalCost-land)-((totalCost-land)*requiredProfitPct);
 const holdYears=Math.max(0,Number(state.returns.holdYears||0)),rentGrowth=Math.max(-.99,Number(state.unitmix.rentGrowthPct||0)/100),expenseGrowth=Math.max(-.99,Number(state.operations.expenseGrowthPct||0)/100),exitCap=Math.max(.0001,Number(state.returns.exitCapRate||0)/100),saleCostPct=clamp(state.returns.saleCostsPct,0,100)/100,valueGrowth=Math.max(-.99,Number(state.returns.annualValueGrowthPct||0)/100),discountAnnual=Math.max(-.99,Number(state.returns.discountRate||0)/100);
 const annualNois=[];for(let y=1;y<=Math.max(1,Math.ceil(holdYears)+1);y++){const resEgiY=residentialEgi*Math.pow(1+rentGrowth,y),comEgiY=commercialEgi*Math.pow(1+rentGrowth,y),resBaseY=(residentialExpenseBase+residentialReserve)*Math.pow(1+expenseGrowth,y),comBaseY=(commercialExpenseBase+commercialReserve)*Math.pow(1+expenseGrowth,y),mgmtY=resEgiY*clamp(state.operations.managementPct,0,100)/100+comEgiY*clamp(c.managementPct,0,100)/100;annualNois.push(resEgiY+comEgiY-resBaseY-comBaseY-mgmtY)}
 const sellingNoi=state.returns.sellingYearNoi==='Current year NOI'?annualNois[Math.max(0,Math.ceil(holdYears)-1)]||noi:annualNois[Math.max(0,Math.ceil(holdYears))]||noi;
 const capExitValue=sellingNoi/exitCap,growthExitValue=value*Math.pow(1+valueGrowth,holdYears);let exitValue=capExitValue;if(state.returns.exitMethod==='Value growth')exitValue=growthExitValue;else if(state.returns.exitMethod==='Lower of capitalized NOI and value growth')exitValue=Math.min(capExitValue,growthExitValue);else if(state.returns.exitMethod==='Higher of capitalized NOI and value growth')exitValue=Math.max(capExitValue,growthExitValue);
 const saleCosts=exitValue*saleCostPct,holdMonths=Math.round(holdYears*12),termMonths=Math.max(0,Math.round(Number(state.financing.loanTermYears||0)*12)),termMaturityBalance=loanBalance(loan,state.financing.interestRate,state.financing.amortYears,Math.min(holdMonths,termMonths||holdMonths)),exitLoanBalance=loanBalance(loan,state.financing.interestRate,state.financing.amortYears,holdMonths),netSaleProceeds=exitValue-saleCosts-exitLoanBalance;
 const monthlyCashFlows=[],constructionWeights=[];for(let m=1;m<=constructionMonths;m++){const x=(m-.5)/constructionMonths;constructionWeights.push(state.financing.drawProfile==='Front-loaded'?1.5-x:state.financing.drawProfile==='Back-loaded'?.5+x:Math.sin(Math.PI*x))}const cw=constructionWeights.reduce((a,b)=>a+b,0);for(const w of constructionWeights)monthlyCashFlows.push(-investedEquity*w/cw);
 const actualMonthlyDebt=actualDebt/12;
 for(let m=1;m<=effectiveLeaseupMonths;m++){const ro=Math.min(residentialTargetOcc,residentialPreleaseOcc+residentialAbsorption*m/Math.max(1,units)),co=commercialAbsorptionMonths>0?Math.min(commercialTargetOcc,commercialPreleaseOcc+(commercialTargetOcc-commercialPreleaseOcc)*m/commercialAbsorptionMonths):commercialTargetOcc;const resRamp=residentialTargetOcc?residentialNoi/12*(ro/residentialTargetOcc):residentialNoi/12,comRamp=commercialTargetOcc?commercialNoi/12*(co/commercialTargetOcc):commercialNoi/12;monthlyCashFlows.push(resRamp+comRamp-actualMonthlyDebt)}
 for(let m=1;m<=holdMonths;m++){const y=Math.ceil(m/12),monthlyNoi=(annualNois[Math.min(y-1,annualNois.length-1)]||noi)/12;monthlyCashFlows.push(monthlyNoi-actualMonthlyDebt)}
 if(monthlyCashFlows.length)monthlyCashFlows[monthlyCashFlows.length-1]+=netSaleProceeds;else monthlyCashFlows.push(-investedEquity+netSaleProceeds);
 const monthlyDiscount=Math.pow(1+discountAnnual,1/12)-1,projectNpv=npv(monthlyDiscount,monthlyCashFlows),monthlyIrr=irr(monthlyCashFlows),equityIrr=monthlyIrr===null?null:Math.pow(1+monthlyIrr,12)-1,totalDistributions=monthlyCashFlows.filter(x=>x>0).reduce((a,b)=>a+b,0),equityMultiple=investedEquity?totalDistributions/investedEquity:0;
 const buildableWidth=Math.max(0,Number(state.site.frontage||0)-Number(state.planning.sideSetbacks||0)),buildableDepth=Math.max(0,Number(state.site.depth||0)-Number(state.planning.frontSetback||0)-Number(state.planning.rearSetback||0)),footprint=Math.max(0,Math.min(Number(state.site.lotArea||0)*Number(state.planning.coveragePct||0)/100,buildableWidth*buildableDepth)),farGfa=Number(state.planning.far||0)>0?Number(state.site.lotArea||0)*Number(state.planning.far):Infinity,gfa=Math.max(0,Math.min(footprint*Number(state.planning.maxStoreys||0),farGfa)),prelimUnits=avgSize?Math.floor(gfa*.78/avgSize):0;
 const warnings=[];if(requestedLtcRaw>programMaxLtc)warnings.push(`Requested residential LTC of ${requestedLtcRaw}% exceeds the Tier ${score.tier} program maximum of ${programMaxLtc}%; ${programMaxLtc}% is used.`);if(Number(state.financing.requestedNonResidentialLtc||0)>75)warnings.push('Requested non-residential LTC exceeds 75%; 75% is used.');if(Math.abs(Number(state.unitmix.vacancyPct||0)-(100-Number(state.unitmix.stabilizedOccupancy||100)))>.5)warnings.push('Residential vacancy and stabilized occupancy are inconsistent; the model uses the more conservative occupancy loss.');if(Number(state.cmhc.nonResidentialGfaPct||0)>30)warnings.push('Non-residential GFA exceeds 30%; confirm current CMHC eligibility.');if(Number(state.cmhc.nonResidentialCostPct||0)>30)warnings.push('Non-residential cost share exceeds 30%; confirm current CMHC eligibility and lending allocation.');if(effectiveLeaseupMonths>enteredLeaseupMonths)warnings.push(`Calculated absorption requires ${effectiveLeaseupMonths} lease-up months, exceeding the entered ${enteredLeaseupMonths} months; the longer calculated period is used.`);if(holdYears>Number(state.financing.loanTermYears||0))warnings.push('The hold period exceeds the entered loan term; the DCF assumes renewal on unchanged terms and does not include renewal fees.');if(contributedSources>Math.max(0,totalCost-loan))warnings.push('Entered funding and equity sources exceed the funding gap; remaining required equity is zero.');
 return {units,avgSize,monthlyRent,grossRent,vacancy,egi,expenseBase,management,reserve,opex,noi,residentialGpr,residentialEgi,residentialExpenseBase,residentialManagement,residentialReserve,residentialOpex,residentialNoi,commercialGpr,commercialEgi,commercialExpenseBase,commercialManagement,commercialReserve,commercialOpex,commercialNoi,hardBase,softBase,otherBase,hard,soft,land,financing,other,escalation,hardCont,softCont,developerFee,baseCost,calculatedCarry,totalCost,value,loan,equity,investedEquity,qualifyingDebt,actualDebt,debt:qualifyingDebt,dcr:qualifyingDcr,qualifyingDcr,actualDcr,residual,footprint,gfa,prelimUnits,maxLtc,programMaxLtc,requestedLtc,requestedNonResidentialLtc,ltcLoan,residentialLtcLoan,nonResidentialLtcLoan,dcrLoan,residentialDcrLoan,nonResidentialDcrLoan,nonResidentialDcrCapacity,ownerCash,contributedSources,score,warnings,annualNois,capExitValue,growthExitValue,exitValue,saleCosts,termMaturityBalance,exitLoanBalance,netSaleProceeds,projectNpv,equityIrr,equityMultiple,monthlyCashFlows,enteredLeaseupMonths,effectiveLeaseupMonths,calculatedResidentialLeaseupMonths,calculatedCommercialLeaseupMonths};
}
function affordabilityPoints(){
 const c=state.cmhc;
 if(c.affordabilityCriteria==='Criteria B')return Math.max(19,0);
 const y=Number(c.affordabilityYears||10)>=20?20:Number(c.affordabilityYears||10)>=15?15:10;
 const b=Number(c.affordableUnitPct||20)>=30?30:Number(c.affordableUnitPct||20)>=25?25:20;
 const d=Number(c.affordabilityDepth||30)<=15?15:Number(c.affordabilityDepth||30)<=20?20:Number(c.affordabilityDepth||30)<=25?25:30;
 const grids={
  10:{20:{30:0,25:8,20:18,15:30},25:{30:2,25:12,20:25,15:40},30:{30:4,25:16,20:31,15:49}},
  15:{20:{30:2,25:11,20:22,15:36},25:{30:4,25:16,20:30,15:47},30:{30:7,25:20,20:37,15:57}},
  20:{20:{30:4,25:14,20:27,15:42},25:{30:7,25:19,20:35,15:54},30:{30:9,25:24,20:43,15:65}}
 };
 return grids[y][b][d];
}
function cmhcScore(){
 const c=state.cmhc; const aff=affordabilityPoints();
 const market={'Market Type 1':0,'Market Type 2':9,'Market Type 3':18}[c.marketType]||0;
 const energy=c.energyTier==='Tier 4'||c.energyTier==='Tier 5'?35:c.energyTier==='Tier 3'?20:c.energyTier==='Tier 2'?10:0;
 const access=c.accessibilityLevel==='Enhanced 10 points'?10:c.accessibilityLevel==='Enhanced 5 points'?5:0;
 const collaboration=(Number(c.governmentSupportCount||0)>=3?6:Number(c.governmentSupportCount||0)>=1?3:0)+(c.landDonation==='Yes'?4:0)+Math.min(6,Number(c.partnerships||0)*3);
 const community=(c.communityTransit==='Yes'?5:0)+(c.alternateTransit==='Yes'?2:0)+(c.childcare==='Yes'?5:0)+(c.priorityGroup==='Yes'?8:0);
 const total=aff+market+energy+access+collaboration+community;
 return {aff,market,energy,access,collaboration,community,total,tier:total>=65?1:total>=47?2:3};
}
function readiness(){
 const f=formulas();
 const docs=state.documents.items, due=state.due.items, risks=state.risks.items;
 const done=a=>a.filter(r=>['Complete','Received','Approved','Verified','Closed'].includes(r[3]||r[4])).length;
 const score=(a,idx)=>a.length?Math.round(a.filter(r=>['Complete','Received','Approved','Verified','Closed','Not Applicable'].includes(r[idx])).length/a.length*100):0;
 const municipal=Math.round(([state.planning.multifamily!=='Unknown',state.planning.approvalPath!=='Unknown',state.site.servicing==='Written confirmation',state.planning.municipalFacts.length>20].filter(Boolean).length/4)*100);
 const financial=Math.round(([f.totalCost>0,f.noi>0,f.value>0,f.dcr>=1.1,state.budget.qsClass==='Class B'||state.budget.qsClass==='Class A'].filter(Boolean).length/5)*100);
 const cmhc=Math.round(([f.units>=5,state.cmhc.primaryResidential==='Yes',Number(state.cmhc.nonResidentialGfaPct)<=30,Number(state.cmhc.nonResidentialCostPct)<=30,state.cmhc.permanentHousing==='Yes',Number(state.cmhc.affordableUnitPct)>=20,Number(state.cmhc.affordabilityYears)>=10].filter(Boolean).length/7)*100);
 return {municipal,financial,cmhc,documents:score(docs,3),due:score(due,3),risk:Math.max(0,100-risks.filter(r=>r[4]==='Open'&&r[2]==='High'&&r[3]==='High').length*15)};
}
function eligibility(){
 const f=formulas(),c=state.cmhc; const issues=[];
 if(f.units<5)issues.push('Fewer than 5 self-contained units');
 if(c.primaryResidential!=='Yes')issues.push('Primary use is not confirmed residential');
 if(Number(c.nonResidentialGfaPct)>30)issues.push('Non-residential GFA exceeds 30%');
 if(Number(c.nonResidentialCostPct)>30)issues.push('Non-residential cost exceeds 30%');
 if(c.permanentHousing!=='Yes')issues.push('Housing is not confirmed permanent');
 if(Number(c.affordableUnitPct)<20&&c.affordabilityCriteria!=='Criteria B')issues.push('Affordability breadth below 20%');
 if(Number(c.affordabilityYears)<10)issues.push('Affordability duration below 10 years');
 if(f.loan<1000000)issues.push('Preliminary loan is below $1 million');
 return {eligible:issues.length===0,issues};
}
function fatalIssues(){
 const f=formulas(),out=[];
 if(state.planning.multifamily==='No')out.push('Multifamily use is not permitted.');
 if(state.site.access==='Fatal')out.push('Site access is marked fatal.');
 if(state.site.servicing==='Insufficient')out.push('Municipal servicing is insufficient.');
 if(state.site.floodplain==='Yes')out.push('Confirmed floodplain condition requires resolution.');
 if(state.site.contamination==='Confirmed')out.push('Confirmed contamination requires remediation and cost allocation.');
 if(state.planning.approvalPath==='Rezoning')out.push('Project depends on rezoning.');
 if(f.totalCost>0&&f.value<f.totalCost)out.push('Stabilized value is below total development cost.');
 state.due.items.filter(r=>r[2]==='Fatal'&&r[3]!=='Complete'&&r[3]!=='Verified').forEach(r=>out.push(`${r[0]}: ${r[1]} remains unresolved.`));
 return [...new Set(out)];
}
function decisions(){
 const f=formulas(),r=readiness(),fat=fatalIssues(),e=eligibility(); let status='REVIEW',cls='review';
 if(fat.length>=3||state.planning.multifamily==='No'){status='STOP / RESTRUCTURE';cls='stop'}
 else if(fat.length===0&&r.municipal>=75&&r.financial>=75&&f.dcr>=1.1&&e.eligible){status='PROCEED TO NEXT GATE';cls='proceed'}
 return {status,cls};
}
function bind(){
 document.querySelectorAll('[data-path]').forEach(el=>el.oninput=()=>{
  let v=el.type==='number'?numericInput(el.value):el.value;flatSet(el.dataset.path,v);markDirty();recalc()
 });
 document.querySelectorAll('[data-table]').forEach(el=>el.oninput=()=>{
  const map=tableMap[el.dataset.table]; if(!map)return; const v=el.type==='number'?numericInput(el.value):el.value;
  flatGet(map)[Number(el.dataset.r)][Number(el.dataset.c)]=v;markDirty();recalc()
 });
 document.querySelectorAll('[data-delete-row]').forEach(b=>b.onclick=()=>{
  const map=tableMap[b.dataset.deleteRow];flatGet(map).splice(Number(b.dataset.r),1);markDirty();renderAll()
 });
 document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addRow(b.dataset.add));
}
const tableMap={approvalTable:'planning.approvals',unitTable:'unitmix.units',costTable:'budget.costs',expenseTable:'operations.expenses',commercialExpenseTable:'operations.commercial.expenses',dueTable:'due.items',docTable:'documents.items',riskTable:'risks.items',teamTable:'team.items',timelineTable:'timeline.items'};
function addRow(type){
 const rows={
  approval:['New approval','','Not Started','','',''],unit:['New type',0,0,0,0,'Market'],cost:['Other','New cost',0,'Other'],expense:['New expense',0],commercialExpense:['New commercial expense',0],
  due:['Category','New item','Medium','Not Started','',''],doc:['Application','New document','Conditional','Not Started','','',''],
  risk:['New risk','Category','Medium','Medium','Open','',''],team:['New professional','','Role','Responsible','',''],timeline:['New task','Phase',0,30,'Not Started','']
 };
 const paths={approval:'planning.approvals',unit:'unitmix.units',cost:'budget.costs',expense:'operations.expenses',commercialExpense:'operations.commercial.expenses',due:'due.items',doc:'documents.items',risk:'risks.items',team:'team.items',timeline:'timeline.items'};
 flatGet(paths[type]).push(rows[type]);markDirty();renderAll()
}
function renderAll(){renderProjectSelect();renderMain();bind();recalc()}
function renderMain(){
 const f=formulas();
 document.querySelector('#main').innerHTML=[
 renderDashboard(),renderProperty(),renderPlanning(),renderUnitMix(),renderBudget(),renderOperations(),renderCMHC(),renderFinancing(),renderReturns(),renderDue(),renderDocuments(),renderRisks(),renderTeam(),renderTimeline(),renderAI(),renderReport(),renderGuide()
 ].join('');
 document.querySelectorAll('.view').forEach((v,i)=>v.classList.toggle('active',i===0));
 document.querySelectorAll('.nav-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
}
function renderDashboard(){return `<section id="dashboard" class="view active">
 <div class="hero"><div><h2 id="dashProjectName">${esc(state.meta.projectName)}</h2><p id="dashAddress">${esc(state.meta.address||'No address entered')}</p></div><div id="overallDecision"></div></div>
 <div class="kpi-grid" id="dashboardKpis"></div>
 <div class="two-col"><div class="card"><h3>Readiness by discipline</h3><div id="readinessBars"></div></div><div class="card"><h3>Investment committee decision</h3><div id="decisionSummary"></div></div></div>
 <div class="two-col"><div class="card"><h3>Fatal / critical issues</h3><div id="fatalIssues"></div></div><div class="card"><h3>Next 10 actions</h3><ol id="nextActions"></ol></div></div>
 <div class="card"><h3>Scenario comparison</h3><div id="scenarioTable"></div></div>
 </section>`}
function renderProperty(){return `<section id="property" class="view">${pageTitle('Property & Site Screen','Acquisition facts, physical constraints and preliminary fit')}
 ${card('Project identity',`<div class="form-grid">${field('Project name','meta.projectName')}${field('Address','meta.address')}${field('Municipality','meta.municipality')}${field('Province','meta.province','select',['Québec','Ontario','Other'])}${field('Stage','meta.stage','select',['Lead','Initial Screen','Broker Contact','Underwriting','Offer','Due Diligence','Closing','Design','Approvals','Construction','Lease-up','Stabilized','Rejected'])}${field('Listing URL','meta.listingUrl')}${field('Asking price','meta.askingPrice','number')}${field('Target offer','meta.targetOffer','number')}${field('Existing units','meta.existingUnits','number')}${field('Target units','meta.targetUnits','number')}${field('Acquisition notes','meta.acquisitionNotes','textarea')}</div>`)}
 ${card('Site dimensions and constraints',`<div class="form-grid">${field('Lot area (sq. ft.)','site.lotArea','number')}${field('Frontage (ft.)','site.frontage','number')}${field('Depth (ft.)','site.depth','number')}${field('Existing building area','site.existingBuildingArea','number')}${field('Topography','site.topography','select',['Unknown','Flat','Moderate slope','Steep'])}${field('Access','site.access','select',['Unknown','Adequate','Constrained','Fatal'])}${field('Floodplain','site.floodplain','select',['Unknown','No','Potential','Yes'])}${field('Contamination','site.contamination','select',['Unknown','No known issue','Phase I concern','Confirmed'])}${field('Major easement','site.easement','select',['Unknown','No','Potential','Yes'])}${field('Heritage / demolition control','site.heritage','select',['Unknown','No','Potential','Yes'])}${field('Servicing capacity','site.servicing','select',['Unknown','Preliminary','Written confirmation','Insufficient'])}${field('Utility laterals','site.laterals','select',['Unknown','Existing adequate','Upgrade required','New laterals required'])}${field('Physical constraints','site.physicalConstraints','textarea')}</div>`)}
 <div class="kpi-grid" id="siteKpis"></div></section>`}
function renderPlanning(){return `<section id="planning" class="view">${pageTitle('Planning, Zoning & Approval Tracker','Verified rules, assumptions and approvals')}
 ${card('Zoning envelope',`<div class="form-grid">${field('Zone code','planning.zoneCode')}${field('Multifamily permitted','planning.multifamily','select',['Unknown','Yes — as of right','Conditional','No'])}${field('Legal existing use','planning.legalUse')}${field('Legal dwelling count','planning.legalUnitCount','number')}${field('Max units','planning.maxUnits','number')}${field('Max storeys','planning.maxStoreys','number')}${field('Max height (m)','planning.maxHeight','number')}${field('Max coverage %','planning.coveragePct','number')}${field('FAR / FSI','planning.far','number')}${field('Front setback (ft.)','planning.frontSetback','number')}${field('Rear setback (ft.)','planning.rearSetback','number')}${field('Total side setbacks (ft.)','planning.sideSetbacks','number')}${field('Parking / unit','planning.parkingRatio','number')}${field('Bike parking / unit','planning.bikeRatio','number')}${field('Approval path','planning.approvalPath','select',['Unknown','As-of-right','PIIA / Site plan','Minor variance','PPCMOI / discretionary','Rezoning'])}${field('Subdivision','planning.subdivision','select',['Not required','Unknown','Possible','Confirmed','Not possible'])}${field('Verified municipal facts','planning.municipalFacts','textarea')}${field('Unverified assumptions','planning.municipalAssumptions','textarea')}</div>`)}
 <div class="card"><div class="section-head"><h3>Approval tracker</h3><button class="btn" data-add="approval">Add approval</button></div>${table(['Approval','Owner','Status','Submitted','Decision','Notes'],state.planning.approvals,'approvalTable',['text','text','select:Not Started|In Progress|Submitted|Approved|Rejected|Not Applicable','date','date','text'])}</div>
 <div class="kpi-grid" id="planningKpis"></div></section>`}
function renderUnitMix(){return `<section id="unitmix" class="view">${pageTitle('Unit Mix, Rent Roll & Housing Need','Unit-level revenue, affordability and market evidence')}
 <div class="card"><div class="section-head"><h3>Unit mix</h3><button class="btn" data-add="unit">Add unit type</button></div>${table(['Type','Count','Avg. size','Monthly rent','Affordable rent','Designation'],state.unitmix.units,'unitTable',['text','number','number','number','number','select:Market|Affordable A|Affordable B|Accessible|Universal Design'])}</div>
 ${card('Market and lease-up assumptions',`<div class="form-grid">${field('Annual other income','unitmix.otherIncome','number')}${field('Economic vacancy %','unitmix.vacancyPct','number')}${field('Bad debt / concessions %','unitmix.badDebtPct','number')}${field('Annual rent growth %','unitmix.rentGrowthPct','number')}${field('Pre-leasing at occupancy %','unitmix.preleasePct','number')}${field('Absorption units / month','unitmix.absorptionRate','number')}${field('Stabilized occupancy %','unitmix.stabilizedOccupancy','number')}${field('Market study status','unitmix.marketStudyStatus','select',['Not Started','Broker opinion','Draft appraisal','Final lender-reliance appraisal'])}${field('Housing need / market evidence','unitmix.housingNeed','textarea')}</div>`)}
 <div class="kpi-grid" id="unitKpis"></div></section>`}
function renderBudget(){return `<section id="budget" class="view">${pageTitle('Development Budget','Detailed uses, contingency and QS readiness')}
 <div class="card"><div class="section-head"><h3>Cost categories</h3><button class="btn" data-add="cost">Add cost</button></div>${table(['Group','Description','Amount','Classification'],state.budget.costs,'costTable',['select:Land|Hard|Soft|Financing|Other','text','number','select:Land|Hard|Soft|Financing|Other'])}</div>
 ${card('Budget controls',`<div class="form-grid">${field('Construction contingency %','budget.constructionContingencyPct','number')}${field('Soft-cost contingency %','budget.softContingencyPct','number')}${field('Developer fee %','budget.developerFeePct','number')}${field('Non-recoverable tax','budget.nonRecoverableTax','number')}${field('Fixed-price coverage %','budget.fixedPriceCoveragePct','number')}${field('QS estimate class','budget.qsClass','select',['None','Class D','Class C','Class B','Class A'])}${field('Budget date','budget.budgetDate','date')}${field('Cost escalation %','budget.costEscalationPct','number')}</div>`)}
 <div class="kpi-grid" id="budgetKpis"></div></section>`}
function renderOperations(){return `<section id="operations" class="view">${pageTitle('Operating Pro Forma','Separate stabilized residential and commercial income, expenses and NOI')}
 <div class="two-col"><div class="card"><div class="section-head"><h3>Residential annual operating expenses</h3><button class="btn" data-add="expense">Add expense</button></div>${table(['Expense','Annual amount'],state.operations.expenses,'expenseTable',['text','number'])}</div>
 <div class="card"><div class="section-head"><h3>Commercial annual operating expenses</h3><button class="btn" data-add="commercialExpense">Add expense</button></div>${table(['Expense','Annual amount'],state.operations.commercial.expenses,'commercialExpenseTable',['text','number'])}</div></div>
 ${card('Residential operating controls',`<div class="form-grid">${field('Management fee % EGI','operations.managementPct','number')}${field('Replacement reserve / unit','operations.reservePerUnit','number')}${field('Expense growth %','operations.expenseGrowthPct','number')}${field('Stabilized cap rate %','operations.capRate','number')}</div>`)}
 ${card('Commercial revenue and controls',`<div class="form-grid">${field('Annual base rent','operations.commercial.annualBaseRent','number')}${field('Annual recoveries','operations.commercial.annualRecoveries','number')}${field('Annual other income','operations.commercial.annualOtherIncome','number')}${field('Vacancy %','operations.commercial.vacancyPct','number')}${field('Bad debt %','operations.commercial.badDebtPct','number')}${field('Stabilized occupancy %','operations.commercial.stabilizedOccupancy','number')}${field('Management fee % EGI','operations.commercial.managementPct','number')}${field('Annual replacement / TI reserve','operations.commercial.reserveAnnual','number')}${field('Pre-leasing at opening %','operations.commercial.preleasePct','number')}${field('Absorption months','operations.commercial.absorptionMonths','number')}</div>`)}
 <div class="kpi-grid" id="operationsKpis"></div></section>`}
function renderCMHC(){return `<section id="cmhc" class="view">${pageTitle('CMHC ACLP Eligibility & Scorecard','Preliminary screen aligned to the supplied CMHC materials')}
 <div class="warning">Planning aid only. Confirm all current criteria, points, lending terms, market type, documentation and professional attestations with CMHC and an approved lender.</div>
 <div class="two-col">
 ${card('Base eligibility',`<div class="form-grid">${field('Project type','cmhc.projectType','select',['Standard rental','Conversion to rental','Seniors housing','Student housing'])}${field('Primary residential use','cmhc.primaryResidential','select',['Yes','No'])}${field('Non-residential GFA %','cmhc.nonResidentialGfaPct','number')}${field('Non-residential cost %','cmhc.nonResidentialCostPct','number')}${field('Permanent housing','cmhc.permanentHousing','select',['Yes','No'])}${field('Housing need confirmed','cmhc.housingNeedConfirmed','select',['Unknown','Yes','No'])}${field('Borrower credit / repayment','cmhc.borrowerCredit','select',['Unknown','Meets','Alternative mitigation required','Does not meet'])}${field('Construction experience','cmhc.constructionExperience','select',['Unknown','Borrower has similar completed project','Experienced fixed-price GC','Insufficient'])}${field('Management experience','cmhc.managementExperience','select',['Unknown','Borrower has 5+ years','5-year third-party contract','Insufficient'])}${field('Borrower net worth','cmhc.borrowerNetWorth','number')}${field('Guarantee capacity','cmhc.guaranteeCapacity','select',['Unknown','100% construction and rent-up','Alternative mitigation required','Insufficient'])}</div>`)}
 ${card('Affordability commitment',`<div class="form-grid">${field('Criteria','cmhc.affordabilityCriteria','select',['Criteria A','Criteria B'])}${field('Affordable units %','cmhc.affordableUnitPct','number')}${field('Rent depth (% median income)','cmhc.affordabilityDepth','number')}${field('Duration years','cmhc.affordabilityYears','number')}${field('Criteria B approved support','cmhc.criteriaBApproved','select',['No','Draft','Approved'])}</div>`)}
 </div>
 <div class="two-col">
 ${card('Energy, accessibility and market',`<div class="form-grid">${field('Building code','cmhc.buildingCode','select',['Part 3 - NECB','Part 9 - NBC'])}${field('Energy tier','cmhc.energyTier','select',['Tier 1','Tier 2','Tier 3','Tier 4','Tier 5'])}${field('Accessibility level','cmhc.accessibilityLevel','select',['Local code only','Enhanced 5 points','Enhanced 10 points'])}${field('Market type','cmhc.marketType','select',['Market Type 1','Market Type 2','Market Type 3'])}</div>`)}
 ${card('Other social outcomes',`<div class="form-grid">${field('Within 1 km public transit','cmhc.communityTransit','select',['No','Yes'])}${field('Alternative transit','cmhc.alternateTransit','select',['No','Yes'])}${field('Within 1.5 km childcare','cmhc.childcare','select',['No','Yes'])}${field('Seniors or ≥35% family units','cmhc.priorityGroup','select',['No','Yes'])}${field('Government supports count','cmhc.governmentSupportCount','number')}${field('Land donation / nominal lease','cmhc.landDonation','select',['No','Yes'])}${field('Partnership count','cmhc.partnerships','number')}</div>`)}
 </div>
 <div class="kpi-grid" id="cmhcKpis"></div>
 <div class="two-col"><div class="card"><h3>Point breakdown</h3><div id="scoreBreakdown"></div></div><div class="card"><h3>Eligibility findings</h3><div id="eligibilityFindings"></div></div></div>
 </section>`}
function renderFinancing(){return `<section id="financing" class="view">${pageTitle('Financing & Capital Stack','Blended residential/non-residential LTC, qualifying debt service, actual debt service and capital stack')}
 ${card('Loan assumptions',`<div class="form-grid">${field('Actual interest rate %','financing.interestRate','number')}${field('Qualification rate %','financing.qualificationRate','number')}${field('Construction interest rate %','financing.constructionInterestRate','number')}${field('Amortization years','financing.amortYears','number')}${field('Minimum residential DCR','financing.minDcrResidential','number')}${field('Minimum non-residential DCR','financing.minDcrNonResidential','number')}${field('Requested residential LTC %','financing.requestedLtc','number')}${field('Requested non-residential LTC %','financing.requestedNonResidentialLtc','number')}${field('Loan term years','financing.loanTermYears','number')}${field('Optional non-residential loan cap','financing.nonResidentialLoan','number')}${field('Include calculated construction carry','financing.includeCalculatedCarry','select',['Yes','No'])}${field('Construction draw profile','financing.drawProfile','select',['S-curve','Front-loaded','Back-loaded'])}</div>`)}
 ${card('Other sources',`<div class="form-grid">${field('Other financing','financing.otherFunding','number')}${field('Grants','financing.grants','number')}${field('Forgivable loans','financing.forgivableLoans','number')}${field('Land-value equity','financing.landEquity','number')}${field('Owner cash equity','financing.ownerCash','number')}</div>`)}
 <div class="kpi-grid" id="financeKpis"></div></section>`}
function renderReturns(){return `<section id="returns" class="view">${pageTitle('Returns, DCF, Residual Land Value & Exit','Monthly development timing, lease-up, stabilized operations, sale and equity returns')}
 ${card('Return assumptions',`<div class="form-grid">${field('Exit cap rate %','returns.exitCapRate','number')}${field('Sale costs %','returns.saleCostsPct','number')}${field('Hold years after stabilization','returns.holdYears','number')}${field('Annual value growth %','returns.annualValueGrowthPct','number')}${field('Required profit % cost excl. land','returns.requiredProfitPct','number')}${field('Discount rate %','returns.discountRate','number')}${field('Construction months','returns.constructionMonths','number')}${field('Lease-up months','returns.leaseupMonths','number')}${field('Exit valuation method','returns.exitMethod','select',['Capitalized NOI','Value growth','Lower of capitalized NOI and value growth','Higher of capitalized NOI and value growth'])}${field('Exit NOI basis','returns.sellingYearNoi','select',['Next year NOI','Current year NOI'])}</div>`)}
 <div class="kpi-grid" id="returnKpis"></div><div class="card"><h3>Interpretation</h3><div id="returnInterpretation"></div></div><div class="card"><h3>Annual NOI projection</h3><div id="annualNoiTable"></div></div></section>`}
function renderDue(){return `<section id="duediligence" class="view">${pageTitle('Due Diligence Command Center','Track fatal, high and lower-priority acquisition conditions')}
 <div class="card"><div class="section-head"><h3>Due diligence checklist</h3><button class="btn" data-add="due">Add item</button></div>${table(['Category','Item','Priority','Status','Owner','Evidence / notes'],state.due.items,'dueTable',['text','text','select:Fatal|High|Medium|Low','select:Not Started|In Progress|Complete|Verified|Not Applicable','text','text'])}</div>
 <div class="kpi-grid" id="dueKpis"></div></section>`}
function renderDocuments(){return `<section id="documents" class="view">${pageTitle('CMHC & Development Document Readiness','Application, underwriting, loan agreement and first advance')}
 <div class="card"><div class="section-head"><h3>Required document tracker</h3><button class="btn" data-add="doc">Add document</button></div>${table(['Stage','Document','Requirement','Status','Received / expiry','Owner','Notes'],state.documents.items,'docTable',['select:Application|Underwriting|Loan Agreement|First Advance|Other','text','select:Required|Conditional|Recommended','select:Not Started|Requested|In Progress|Received|Complete|Expired|Not Applicable','text','text','text'])}</div>
 <div class="kpi-grid" id="docKpis"></div></section>`}
function renderRisks(){return `<section id="risks" class="view">${pageTitle('Risk Register','Probability, impact, ownership and mitigation')}
 <div class="card"><div class="section-head"><h3>Project risks</h3><button class="btn" data-add="risk">Add risk</button></div>${table(['Risk','Category','Probability','Impact','Status','Owner','Mitigation'],state.risks.items,'riskTable',['text','text','select:Low|Medium|High','select:Low|Medium|High','select:Open|Mitigating|Accepted|Closed','text','text'])}</div>
 <div class="kpi-grid" id="riskKpis"></div></section>`}
function renderTeam(){return `<section id="team" class="view">${pageTitle('Team & Responsibility Matrix','Consultants, roles, contacts and engagement status')}
 <div class="card"><div class="section-head"><h3>Project team</h3><button class="btn" data-add="team">Add team member</button></div>${table(['Discipline','Name / firm','Role','RACI','Email / phone','Status'],state.team.items,'teamTable',['text','text','text','select:Responsible|Accountable|Consulted|Informed','text','select:Not Engaged|Quoting|Engaged|Complete'])}</div></section>`}
function renderTimeline(){return `<section id="timeline" class="view">${pageTitle('Project Plan & Milestones','Acquisition through stabilization')}
 <div class="card"><div class="section-head"><h3>Milestone schedule</h3><button class="btn" data-add="timeline">Add task</button></div>${table(['Task','Phase','Start day','End day','Status','Owner'],state.timeline.items,'timelineTable',['text','text','number','number','select:Not Started|In Progress|Complete|Delayed|Not Applicable','text'])}</div>
 <div class="card"><h3>Timeline visualization</h3><div id="timelineBars"></div></div></section>`}
function renderAI(){return `<section id="ai" class="view">${pageTitle('AI Workflows','Generate structured prompts for ChatGPT without an API')}
 <div class="tabs">${['Due Diligence','Municipality','Architect','Lender / CMHC'].map((t,i)=>`<button class="tab-btn ${i===0?'active':''}" data-ai-tab="${i}">${t}</button>`).join('')}</div>
 <div class="tab-panel active" data-ai-panel="0">${aiPanel('Generate Due Diligence Prompt','duePrompt','ai.dueDiligenceResponse')}</div>
 <div class="tab-panel" data-ai-panel="1">${aiPanel('Generate Municipal Prompt','municipalPrompt','ai.municipalResponse')}</div>
 <div class="tab-panel" data-ai-panel="2">${aiPanel('Generate Architect Prompt','architectPrompt','ai.architectResponse')}</div>
 <div class="tab-panel" data-ai-panel="3">${aiPanel('Generate Lender / CMHC Prompt','lenderPrompt','ai.lenderResponse')}</div>
 </section>`}
function aiPanel(btn,id,path){return `<div class="card"><button class="btn primary" data-prompt="${id}">${btn}</button><label style="display:block;margin-top:10px;font-size:12px;font-weight:800">Copy into ChatGPT</label><textarea id="${id}" class="output" style="width:100%;min-height:260px"></textarea><label style="display:block;margin-top:10px;font-size:12px;font-weight:800">Paste response back into project</label><textarea data-path="${path}" style="width:100%;min-height:180px;border:1px solid #ccd8d4;border-radius:8px;padding:9px">${esc(flatGet(path)||'')}</textarea></div>`}
function renderReport(){return `<section id="report" class="view">${pageTitle('Investment Committee Report','Printable acquisition and development assessment')}
 <div class="card no-print"><button class="btn primary" id="buildReportBtn">Refresh report</button> <button class="btn" onclick="window.print()">Print / Save PDF</button></div>
 <div id="reportBody"></div></section>`}
function renderGuide(){return `<section id="guide" class="view">${pageTitle('Master Guide','How to use QRAOS from first lead to CMHC submission')}
 <div class="card"><h3>Recommended sequence</h3>
 ${[
 ['1. Create the property','Enter the project identity, acquisition price, address and physical site facts. Save immediately.'],
 ['2. Confirm the planning envelope','Record only verified municipal rules as facts. Keep assumptions separate. Track every approval and obtain written evidence.'],
 ['3. Build the unit mix','Enter each unit type, count, size, market rent and any affordable, accessible or universal-design designation.'],
 ['4. Complete the budget','Enter detailed land, hard, soft, financing and other costs. Add contingencies and update the QS estimate class.'],
 ['5. Build stabilized operations','Enter annual operating expenses, vacancy, management and reserve assumptions. Review NOI and value.'],
 ['6. Complete CMHC ACLP','Run base eligibility, affordability, energy, accessibility, market and social-outcome inputs. Review the preliminary tier and lending flexibility.'],
 ['7. Structure financing','Enter qualification rate, amortization, DCR and other funding. The model sizes the preliminary loan to the lower of LTC and DCR capacity.'],
 ['8. Complete due diligence','Resolve all fatal items before waiving conditions. Attach evidence references in the notes.'],
 ['9. Track documents','Use the four CMHC stages: Application, Underwriting, Loan Agreement and First Advance.'],
 ['10. Review risks, team and timeline','Assign each risk and deliverable to a professional. Update progress throughout the project.'],
 ['11. Generate AI prompts','Use the structured prompts to obtain detailed reviews from ChatGPT, then paste useful responses back into the project.'],
 ['12. Print the report','Open Investment Report, refresh it, then print or save as PDF for brokers, investors, lenders and consultants.']
 ].map(x=>`<div class="guide-step"><b>${x[0]}</b><div>${x[1]}</div></div>`).join('')}
 </div>
 <div class="card"><h3>Official and supporting documents</h3><div class="doc-grid">
  ${[
   ['CMHC ACLP Highlight Sheet','./docs/CMHC_ACLP_Highlight_Sheet_Standard_Rental.pdf','Eligibility, points and lending flexibilities'],
   ['Required Documentation Checklist','./docs/CMHC_ACLP_Required_Documentation_Checklist.pdf','Four-stage CMHC document requirements'],
   ['Official Project Assessment Workbook','./docs/CMHC_ACLP_Project_Assessment_Workbook.xlsx','Original supplied CMHC spreadsheet'],
   ['Accessibility Attestation','./docs/CMHC_ACLP_Accessibility_Attestation.pdf','Professional accessibility certification'],
   ['Energy Attestation','./docs/CMHC_ACLP_Energy_Efficiency_Attestation.pdf','Energy and GHG modelling certification'],
   ['Integrity Declaration','./docs/CMHC_Integrity_Declaration.pdf','Applicant integrity declaration'],
   ['Source Development Workbook','./docs/QRAOS_Source_Development_System.xlsx','Expanded source system workbook'],
   ['Previous Master Guide','./docs/QRAOS_Previous_Master_Guide.pdf','Earlier QRAOS operating and developer guide']
  ].map(d=>`<a class="doc-link" href="${d[1]}" target="_blank"><b>${d[0]}</b><span>${d[2]}</span></a>`).join('')}
 </div></div>
 <div class="warning">Data is stored in this browser only. Export a JSON backup after every material update. Do not store confidential third-party data on a public or shared device.</div>
 </section>`}
function recalc(){
 const f=formulas(),r=readiness(),d=decisions(),fat=fatalIssues(),e=eligibility(),s=f.score;
 const decisionEl=document.querySelector('#overallDecision');if(decisionEl){decisionEl.className=`decision ${d.cls}`;decisionEl.textContent=d.status}
 const dash=document.querySelector('#dashboardKpis');if(dash)dash.innerHTML=[
  kpi('Preliminary yield',f.prelimUnits,'zoning envelope'),kpi('Selected units',f.units),kpi('Total cost',money(f.totalCost)),kpi('Stabilized NOI',money(f.noi)),kpi('Stabilized value',money(f.value)),kpi('CMHC score',`${s.total} pts`,`Tier ${s.tier}`)
 ].join('');
 const rb=document.querySelector('#readinessBars');if(rb)rb.innerHTML=Object.entries(r).map(([k,v])=>`<div class="progress-row"><span>${k[0].toUpperCase()+k.slice(1)}</span><div class="progress"><i style="width:${v}%"></i></div><b>${v}%</b></div>`).join('');
 const ds=document.querySelector('#decisionSummary');if(ds)ds.innerHTML=`<p><b>${d.status}</b></p><p>Qualification DCR: <b>${f.qualifyingDcr.toFixed(2)}</b>; actual-rate DCR: <b>${f.actualDcr.toFixed(2)}</b>. Stabilized value less total cost: <b>${money(f.value-f.totalCost)}</b>. CMHC preliminary tier: <b>Tier ${s.tier}</b>. Effective LTC used: <b>${f.maxLtc}%</b> (program maximum ${f.programMaxLtc}%; requested ${f.requestedLtc}%).</p>${f.warnings.length?`<div class="warning"><b>Input warnings</b><ul>${f.warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}`;
 const fi=document.querySelector('#fatalIssues');if(fi)fi.innerHTML=fat.length?`<ul class="fatal-list">${fat.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<span class="badge good">No fatal issue recorded</span>';
 const actions=[];if(state.planning.multifamily==='Unknown')actions.push('Obtain written municipal confirmation of permitted use and maximum dwelling count.');if(state.site.servicing!=='Written confirmation')actions.push('Obtain written water, sanitary, storm and fire-flow capacity confirmation.');if(state.budget.qsClass!=='Class B'&&state.budget.qsClass!=='Class A')actions.push('Commission a qualified QS Class B estimate.');if(state.unitmix.marketStudyStatus!=='Final lender-reliance appraisal')actions.push('Commission a lender-reliance appraisal with rent, value and absorption analysis.');if(state.cmhc.borrowerCredit==='Unknown')actions.push('Prepare borrower and guarantor financial/credit package.');if(state.cmhc.constructionExperience==='Unknown')actions.push('Confirm development experience or engage an experienced fixed-price general contractor.');if(state.cmhc.managementExperience==='Unknown')actions.push('Confirm 5-year management experience or contract an experienced third-party manager.');if(!e.eligible)actions.push(...e.issues.map(x=>'Resolve CMHC screen: '+x));fat.slice(0,3).forEach(x=>actions.push('Resolve: '+x));while(actions.length<10)actions.push('Update document tracker and assign missing deliverables to the project team.');
 const na=document.querySelector('#nextActions');if(na)na.innerHTML=actions.slice(0,10).map(x=>`<li>${esc(x)}</li>`).join('');
 const st=document.querySelector('#scenarioTable');if(st){const counts=[6,10,12,16,20,24,30];st.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Units</th><th>Avg rent</th><th>Annual rent</th><th>Indicative GFA</th><th>Fit vs zoning</th></tr></thead><tbody>${counts.map(n=>{const avg=f.units?f.monthlyRent/f.units:0;const gfa=n*(f.avgSize||750)/.78;return `<tr><td>${n}</td><td>${money(avg)}</td><td>${money(n*avg*12)}</td><td>${whole(gfa)}</td><td><span class="badge ${gfa<=f.gfa?'good':'bad'}">${gfa<=f.gfa?'Preliminary fit':'Exceeds envelope'}</span></td></tr>`}).join('')}</tbody></table></div>`}
 const set=(id,html)=>{const x=document.querySelector(id);if(x)x.innerHTML=html};
 set('#siteKpis',[kpi('Footprint',whole(f.footprint)+' sf'),kpi('Maximum GFA',whole(f.gfa)+' sf'),kpi('Preliminary units',f.prelimUnits),kpi('Target units',state.meta.targetUnits),kpi('Parking spaces',whole(f.units*Number(state.planning.parkingRatio||0))),kpi('Bike spaces',whole(f.units*Number(state.planning.bikeRatio||0)))].join(''));
 set('#planningKpis',[kpi('Approval path',state.planning.approvalPath),kpi('Multifamily',state.planning.multifamily),kpi('Max units',state.planning.maxUnits||'Unknown'),kpi('Max storeys',state.planning.maxStoreys),kpi('Coverage',pct(state.planning.coveragePct)),kpi('FAR',state.planning.far||'Not set')].join(''));
 set('#unitKpis',[kpi('Total units',f.units),kpi('Avg unit size',whole(f.avgSize)+' sf'),kpi('Monthly rent',money(f.monthlyRent)),kpi('Gross annual income',money(f.grossRent)),kpi('Vacancy / bad debt',money(f.vacancy)),kpi('Effective gross income',money(f.egi))].join(''));
 set('#budgetKpis',[kpi('Land',money(f.land)),kpi('Hard costs',money(f.hard)),kpi('Soft costs',money(f.soft)),kpi('Contingencies',money(f.hardCont+f.softCont)),kpi('Developer fee',money(f.developerFee)),kpi('Total project cost',money(f.totalCost))].join(''));
 set('#operationsKpis',[kpi('Residential EGI',money(f.residentialEgi)),kpi('Residential NOI',money(f.residentialNoi)),kpi('Commercial EGI',money(f.commercialEgi)),kpi('Commercial NOI',money(f.commercialNoi)),kpi('Total OPEX',money(f.opex)),kpi('Total NOI',money(f.noi))].join(''));
 set('#cmhcKpis',[kpi('Eligibility',e.eligible?'Preliminary pass':'Issues found'),kpi('Affordability',s.aff+' pts'),kpi('Market adjustment',s.market+' pts'),kpi('Energy',s.energy+' pts'),kpi('Total score',s.total+' pts'),kpi('Lending tier','Tier '+s.tier,`Up to ${f.maxLtc}% LTC`)].join(''));
 set('#scoreBreakdown',[['Affordability',s.aff],['Market adjustment',s.market],['Energy',s.energy],['Accessibility',s.access],['Collaboration',s.collaboration],['Community / priority',s.community]].map(x=>`<div class="score-box"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join(''));
 set('#eligibilityFindings',e.eligible?'<span class="badge good">Preliminary base eligibility satisfied</span>':`<ul class="fatal-list">${e.issues.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`);
 set('#financeKpis',[kpi('Residential LTC',pct(f.maxLtc),`Program max ${pct(f.programMaxLtc)}`),kpi('Commercial LTC',pct(f.requestedNonResidentialLtc),'Capped at 75%'),kpi('Blended LTC capacity',money(f.ltcLoan)),kpi('DCR loan capacity',money(f.dcrLoan)),kpi('Preliminary loan',money(f.loan)),kpi('Calculated carry',money(f.calculatedCarry)),kpi('Qualifying debt service',money(f.qualifyingDebt)),kpi('Actual debt service',money(f.actualDebt)),kpi('Balance at loan term',money(f.termMaturityBalance)),kpi('Qualifying DCR',f.qualifyingDcr.toFixed(2)),kpi('Actual DCR',f.actualDcr.toFixed(2)),kpi('Remaining funding gap',money(f.equity)),kpi('Invested equity',money(f.investedEquity))].join(''));
 set('#returnKpis',[kpi('Stabilized value',money(f.value)),kpi('Exit value',money(f.exitValue)),kpi('Sale costs',money(f.saleCosts)),kpi('Loan balance at exit',money(f.exitLoanBalance)),kpi('Net sale proceeds',money(f.netSaleProceeds)),kpi('Equity NPV',money(f.projectNpv)),kpi('Equity IRR',f.equityIrr===null?'N/A':pct(f.equityIrr*100)),kpi('Equity multiple',f.equityMultiple.toFixed(2)+'x'),kpi('Residual land value',money(f.residual)),kpi('Profit on cost',f.totalCost?pct((f.value-f.totalCost)/f.totalCost*100):'0%')].join(''));
 set('#returnInterpretation',`<p>The model uses ${state.returns.constructionMonths} construction months, ${f.effectiveLeaseupMonths} effective lease-up months and a ${state.returns.holdYears}-year stabilized hold. Exit value is <b>${money(f.exitValue)}</b> using <b>${esc(state.returns.exitMethod)}</b>; net sale proceeds after ${state.returns.saleCostsPct}% selling costs and loan repayment are <b>${money(f.netSaleProceeds)}</b>. Equity NPV at ${state.returns.discountRate}% is <b>${money(f.projectNpv)}</b> and estimated equity IRR is <b>${f.equityIrr===null?'N/A':pct(f.equityIrr*100)}</b>. Taxes, depreciation, tax credits, lender fees, refinancing and partnership waterfalls remain outside this preliminary model.</p>`);set('#annualNoiTable',`<div class="table-wrap"><table><thead><tr><th>Year</th><th>Projected NOI</th><th>Actual debt service</th><th>Cash flow after debt</th></tr></thead><tbody>${f.annualNois.slice(0,Math.max(1,Math.ceil(Number(state.returns.holdYears||0)))).map((n,i)=>`<tr><td>${i+1}</td><td>${money(n)}</td><td>${money(f.actualDebt)}</td><td>${money(n-f.actualDebt)}</td></tr>`).join('')}</tbody></table></div>`);
 const dueDone=state.due.items.filter(r=>['Complete','Verified','Not Applicable'].includes(r[3])).length;set('#dueKpis',[kpi('Total items',state.due.items.length),kpi('Complete / verified',dueDone),kpi('Fatal open',state.due.items.filter(r=>r[2]==='Fatal'&&!['Complete','Verified','Not Applicable'].includes(r[3])).length),kpi('High open',state.due.items.filter(r=>r[2]==='High'&&!['Complete','Verified','Not Applicable'].includes(r[3])).length),kpi('Readiness',pct(state.due.items.length?dueDone/state.due.items.length*100:0)),kpi('Condition period','Track dates in notes')].join(''));
 const docDone=state.documents.items.filter(r=>['Received','Complete','Not Applicable'].includes(r[3])).length;set('#docKpis',[kpi('Documents',state.documents.items.length),kpi('Ready',docDone),kpi('Application missing',state.documents.items.filter(r=>r[0]==='Application'&&r[2]==='Required'&&!['Received','Complete','Not Applicable'].includes(r[3])).length),kpi('Underwriting missing',state.documents.items.filter(r=>r[0]==='Underwriting'&&r[2]==='Required'&&!['Received','Complete','Not Applicable'].includes(r[3])).length),kpi('First advance missing',state.documents.items.filter(r=>r[0]==='First Advance'&&r[2]==='Required'&&!['Received','Complete','Not Applicable'].includes(r[3])).length),kpi('Readiness',pct(state.documents.items.length?docDone/state.documents.items.length*100:0))].join(''));
 set('#riskKpis',[kpi('Open risks',state.risks.items.filter(r=>r[4]==='Open').length),kpi('High-high open',state.risks.items.filter(r=>r[2]==='High'&&r[3]==='High'&&r[4]!=='Closed').length),kpi('Mitigating',state.risks.items.filter(r=>r[4]==='Mitigating').length),kpi('Closed',state.risks.items.filter(r=>r[4]==='Closed').length),kpi('Risk readiness',pct(r.risk)),kpi('Owner gaps',state.risks.items.filter(r=>!r[5]).length)].join(''));
 const tb=document.querySelector('#timelineBars');if(tb){const max=Math.max(...state.timeline.items.map(r=>Number(r[3]||0)),1);tb.innerHTML=state.timeline.items.map(r=>`<div class="progress-row"><span>${esc(r[0])}</span><div class="progress"><i style="margin-left:${Number(r[2]||0)/max*100}%;width:${Math.max(2,(Number(r[3]||0)-Number(r[2]||0))/max*100)}%"></i></div><b>${r[4]}</b></div>`).join('')}
 buildReport();
}
function buildReport(){
 const f=formulas(),r=readiness(),d=decisions(),s=f.score,e=eligibility(),fat=fatalIssues();
 const el=document.querySelector('#reportBody');if(!el)return;
 el.innerHTML=`<div class="card"><h2>${esc(state.meta.projectName)}</h2><p>${esc(state.meta.address)} — ${esc(state.meta.municipality)}, ${esc(state.meta.province)}</p><div class="decision ${d.cls}" style="display:inline-block">${d.status}</div></div>
 <div class="card"><h3>Executive metrics</h3><div class="kpi-grid">${kpi('Units',f.units)}${kpi('Total cost',money(f.totalCost))}${kpi('NOI',money(f.noi))}${kpi('Value',money(f.value))}${kpi('Loan',money(f.loan))}${kpi('Funding gap',money(f.equity))}${kpi('NPV',money(f.projectNpv))}${kpi('IRR',f.equityIrr===null?'N/A':pct(f.equityIrr*100))}</div></div>
 <div class="two-col"><div class="card"><h3>Planning</h3><p>Zone: <b>${esc(state.planning.zoneCode||'Unverified')}</b><br>Multifamily: <b>${esc(state.planning.multifamily)}</b><br>Approval path: <b>${esc(state.planning.approvalPath)}</b><br>Preliminary GFA: <b>${whole(f.gfa)} sf</b><br>Preliminary yield: <b>${f.prelimUnits}</b></p></div>
 <div class="card"><h3>CMHC ACLP</h3><p>Eligibility: <b>${e.eligible?'Preliminary pass':'Issues found'}</b><br>Score: <b>${s.total}</b><br>Tier: <b>${s.tier}</b><br>Maximum residential LTC used: <b>${f.maxLtc}%</b><br>Non-residential LTC used: <b>${f.requestedNonResidentialLtc}%</b><br>Affordability points: <b>${s.aff}</b></p></div></div>
 <div class="card"><h3>Critical issues</h3>${fat.length?`<ul>${fat.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>No fatal issue recorded.</p>'}</div>
 <div class="card"><h3>Readiness</h3>${Object.entries(r).map(([k,v])=>`<p>${k}: <b>${v}%</b></p>`).join('')}</div>
 <div class="card"><h3>Important disclaimer</h3><p>This report is a preliminary internal assessment. It is not legal, planning, architectural, engineering, environmental, tax, appraisal, construction-cost, insurance, lender or CMHC approval. All assumptions and calculations require verification by qualified professionals and the current official program documents.</p></div>`;
}
function promptText(type){
 const f=formulas();
 const payload={project:state,calculated:f,readiness:readiness(),eligibility:eligibility(),fatalIssues:fatalIssues()};
 const intro={
  duePrompt:'Act as a conservative Canadian real estate development due-diligence leader. Review this project line by line. Separate verified facts, assumptions, missing evidence and professional confirmations. Identify fatal issues, conditions precedent, risks, missing documents, consultant scopes and the next 15 actions.',
  municipalPrompt:'Act as a senior municipal planner in Quebec. Based only on the project data, produce a written municipal verification request covering use, legal dwelling count, density, height, storeys, coverage, FAR, setbacks, parking, PIIA, PPCMOI, minor variance, rezoning, demolition, heritage, subdivision, servicing, fire access, permits, fees and timelines. Do not assume approval.',
  architectPrompt:'Act as a senior multifamily architect. Produce a feasibility brief including buildable envelope, unit yield, unit mix, circulation, stairs, elevator, accessibility, universal design, parking, waste, bicycles, snow, fire access, mechanical, servicing, energy strategy, major code questions, consultant scopes and fatal design constraints.',
  lenderPrompt:'Act as a conservative CMHC ACLP approved-lender underwriting team. Review base eligibility, affordability, energy, accessibility, market adjustment, social outcomes, DCR, LTC, borrower capacity, net worth, guarantees, experience, management, appraisal, QS, environmental, geotechnical, documentation and first-advance readiness. Identify all assumptions and missing evidence.'
 }[type];
 return `${intro}\n\nPROJECT DATA AND CALCULATIONS:\n${JSON.stringify(payload,null,2)}\n\nReturn an executive recommendation, fatal issues, high/medium/low risks, missing evidence, exact professional confirmations, document checklist, sensitivity issues and next actions.`;
}
function setupStaticEvents(){
 document.querySelector('#saveBtn').onclick=persist;
 document.querySelector('#newBtn').onclick=createNew;
 document.querySelector('#projectSelect').onchange=e=>{if(e.target.value)load(e.target.value)};
 document.querySelector('#duplicateBtn').onclick=()=>{state=JSON.parse(JSON.stringify(state));state.meta.id=uid();state.meta.projectName+=' — Copy';currentId=state.meta.id;markDirty();renderAll()};
 document.querySelector('#deleteBtn').onclick=()=>{if(!confirm('Delete this saved project?'))return;saveProjects(projects().filter(x=>x.meta.id!==state.meta.id));createNew()};
 document.querySelector('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),project:state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(state.meta.projectName||'QRAOS_Project').replace(/[^\w-]+/g,'_')+'.json';a.click();URL.revokeObjectURL(a.href)};
 document.querySelector('#importFile').onchange=e=>{const file=e.target.files[0];if(!file)return;const rd=new FileReader();rd.onload=()=>{try{const x=JSON.parse(rd.result);state=normalizeProject(x.project||x);if(!state.meta?.id)state.meta.id=uid();currentId=state.meta.id;markDirty();renderAll()}catch{alert('Invalid QRAOS JSON file.')}};rd.readAsText(file)};
 document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav-btn,.view').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelector('#'+b.dataset.view)?.classList.add('active')});
}
function setupDynamicEvents(){
 document.querySelectorAll('[data-ai-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab-btn,.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelector(`[data-ai-panel="${b.dataset.aiTab}"]`).classList.add('active')});
 document.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>document.querySelector('#'+b.dataset.prompt).value=promptText(b.dataset.prompt));
 const br=document.querySelector('#buildReportBtn');if(br)br.onclick=buildReport;
}
const origRenderAll=renderAll;renderAll=function(){origRenderAll();setupDynamicEvents()}
setupStaticEvents();
const existing=projects();state=existing[0]?normalizeProject(existing[0]):defaultProject();currentId=state.meta.id;renderAll();
