import {validateExpression} from "./kernel/expressions.js";
import {packPortable,unpackPortable,validatePortable} from "./portable-modules.js";
import {benchmarkAI} from "./kernel/ai-benchmark.js";
import {validateDeck,appendDeckToSetup,validateDeckGroup,appendDeckGroup} from "./kernel/decks.js";
import {validateCampaign} from "./kernel/campaign.js";
import {demoModule} from "./kernel/demo-module.js";
import {validateModuleV2} from "./kernel/module-v2.js";
import {createMatch} from "./kernel/runtime.js";
import {readLibrary,saveLibraryModule,deleteLibraryModule,stagePlaytest,readPlaytest} from "./module-library.js";
let savedId=null;
const $=id=>document.getElementById(id);
let module=demoModule();
if(new URLSearchParams(location.search).has("resume")){try{module=readPlaytest()??module;const id=new URLSearchParams(location.search).get("saved");if(id&&readLibrary().some(x=>x.id===id))savedId=id}catch{}}
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
function status(text){$("editor-status").textContent=text}
function sync(){ $("source").value=JSON.stringify(module,null,2); }

// Simple graphical table editor. References use current module IDs.
const fields={
 players:[["id","Player ID","text"]],
 definitions:[["id","Card ID","text"]],
 zones:[["id","Zone ID","text"],["owner","Owner","owner"],["visibility","Visibility",["public","owner","hidden"]],["capacity","Capacity","number"]],
 setup:[["definition","Card","definitions"],["owner","Owner","players"],["zone","Zone","zones"],["face","Face",["up","down"]]],
 resources:[["id","Resource ID","text"],["scope","Scope",["player","shared"]],["initial","Initial","number"],["max","Maximum","number"],["refreshMode","Refresh",["none","add","set"]],["refresh","Amount","number"]]
};
const defaults={players:"new-player",definitions:"new-card",zones:{id:"new-zone",owner:null,visibility:"public",capacity:10},setup:{definition:"",owner:"",zone:"",face:"up"},resources:{id:"new-resource",scope:"player",initial:0,max:10,refreshMode:"none",refresh:0}};
function options(kind){
 if(Array.isArray(kind))return kind;
 if(kind==="owner")return [null,...(module.players??[])];
 if(kind==="players"||kind==="definitions")return module[kind]??[];
 if(kind==="zones")return (module.zones??[]).map(z=>z.id);
 if(kind==="resourceIds")return (module.resources??[]).map(r=>r.id);
 if(kind==="effectIds")return Object.keys(module.effects??{});
 return null;
}
function fieldControl(label,value,kind,change){
 const opts=options(kind),input=node(opts?"select":"input");
 input.setAttribute("aria-label",label);
 if(opts){
  const values=[...opts];if(!values.includes(value))values.unshift(value??"");
  for(const v of values){const o=node("option",v===null?"Shared":String(v));o.value=v===null?"":String(v);input.append(o)}
  input.value=value??"";
 }else{input.type=["number","signed"].includes(kind)?"number":"text";if(kind==="number"){input.min="0";input.step="1"}input.value=value??""}
 input.onchange=()=>change(["number","signed"].includes(kind)?Number(input.value):kind==="owner"&&input.value===""?null:input.value);
 return input;
}
function tableEditor(key,section){
 const data=module[key];if(!Array.isArray(data)){section.append(node("p","Use advanced JSON to repair this section."));return}
 const wrap=node("div");wrap.className="v2-table-wrap";const table=node("table");table.className="v2-table";
 const head=node("tr");for(const [,label] of fields[key])head.append(node("th",label));head.append(node("th",""));table.append(head);
 const scalar=key==="players"||key==="definitions";
 for(const [i,row] of data.entries()){
  const tr=node("tr");
  for(const [id,label,kind] of fields[key]){
   const td=node("td");td.append(fieldControl(label+" "+(i+1),scalar?row:row?.[id],kind,v=>{
    if(scalar)data[i]=v;else if(row&&typeof row==="object")row[id]=v;
    sync();status("Edited "+key+"; validate before exporting.");
   }));tr.append(td);
  }
  const td=node("td"),remove=node("button","Remove");remove.type="button";remove.onclick=()=>{data.splice(i,1);render(key)};td.append(remove);tr.append(td);table.append(tr);
 }
 wrap.append(table);section.append(wrap);
 const add=node("button","Add row");add.type="button";add.onclick=()=>{
  const row=structuredClone(defaults[key]);
  if(key==="setup"){row.definition=module.definitions?.[0]??"";row.owner=module.players?.[0]??"";row.zone=module.zones?.[0]?.id??""}
  data.push(row);render(key);
 };section.append(add);
}


function actionButton(label,fn){const b=node("button",label);b.type="button";b.onclick=fn;return b}
function field(parent,label,value,kind,change){
 const l=node("label",label+" ");l.className="v2-field";l.append(fieldControl(label,value,kind,v=>{change(v);sync()}));parent.append(l);
}
function panel(parent,title){const p=node("fieldset");p.append(node("legend",title));parent.append(p);return p}
function listEditor(parent,items,title,make,draw,section){
 const p=panel(parent,title);
 items.forEach((item,i)=>{const row=panel(p,title+" "+(i+1));draw(row,item,i);row.append(actionButton("Remove "+title.toLowerCase(),()=>{items.splice(i,1);render(section)}))});
 p.append(actionButton("Add "+title.toLowerCase(),()=>{items.push(make());render(section)}));
}
function first(kind){return options(kind)?.[0]??""}
function advancedEditor(key,section){
 if(key==="effects"){
  if(!module.effects||typeof module.effects!=="object"||Array.isArray(module.effects)){section.append(node("p","Repair effects using advanced JSON."));return}
  for(const [id,e] of Object.entries(module.effects)){
   const p=panel(section,id);if(!e||typeof e!=="object")continue;
   field(p,"Effect ID",id,"text",v=>{if(v!==id&&/^[A-Za-z0-9_-]{1,80}$/.test(v)&&!Object.hasOwn(Object.prototype,v)&&!Object.hasOwn(module.effects,v)){module.effects[v]=e;delete module.effects[id];render(key)}else status("Effect ID unchanged or invalid.")});
   field(p,"Manual activation",e.available===true?"yes":"no",["yes","no"],v=>e.available=v==="yes");
   field(p,"Actor",e.actors?.length===1?e.actors[0]:"any",["any",...(module.players??[])],v=>{if(v==="any")delete e.actors;else e.actors=[v]});
   if(module.phases)field(p,"Allowed phases (blank = all)",(e.phases??[]).join(","),"text",v=>{if(v.trim())e.phases=v.split(",").map(x=>x.trim()).filter(Boolean);else delete e.phases});
   field(p,"Ability source definition (blank = global)",e.sourceDefinition??"",["",...module.definitions],v=>{if(v){e.sourceDefinition=v;e.sourceZones??=[first("zones")]}else{delete e.sourceDefinition;delete e.sourceZones}render(key)});
   if(e.sourceDefinition)field(p,"Ability source zones",(e.sourceZones??[]).join(","),"text",v=>e.sourceZones=v.split(",").map(x=>x.trim()).filter(Boolean));
   field(p,"Usage limit",e.limit?.scope??"none",["none","turn","match"],v=>{if(v==="none")delete e.limit;else e.limit={scope:v,count:e.limit?.count??1};render(key)});
   if(e.limit)field(p,"Maximum uses",e.limit.count,"number",v=>e.limit.count=v);
   function cardCosts(parent,plan){plan.cardCosts??=[];listEditor(parent,plan.cardCosts,"Card payment",()=>({kind:"sacrifice",from:first("zones"),to:options("zones")[1]??"",count:1}),(r,c)=>{field(r,"Payment kind",c.kind,["discard","sacrifice"],v=>c.kind=v);field(r,"Payment source",c.from,"zones",v=>c.from=v);field(r,"Payment destination",c.to,"zones",v=>c.to=v);field(r,"Payment quantity",c.count,"number",v=>c.count=v);field(r,"Required material",c.definition??"",["",...module.definitions],v=>{if(v)c.definition=v;else delete c.definition})},key)}
   p.append(actionButton(e.dynamicPayment?"Remove dynamic payment":"Configure dynamic payment",()=>{if(e.dynamicPayment)delete e.dynamicPayment;else e.dynamicPayment={modes:["default"],hybrid:[],targets:[],modifiers:[]};render(key)}));
   if(e.dynamicPayment){
    const d=e.dynamicPayment;
    field(p,"Activation modes",(d.modes??["default"]).join(","),"text",v=>d.modes=v.split(",").map(x=>x.trim()).filter(Boolean));
    field(p,"Variable cost resource",d.variable?.resource??"",["",...options("resourceIds")],v=>{if(v)d.variable={resource:v,min:d.variable?.min??0,max:d.variable?.max??5};else delete d.variable;render(key)});
    if(d.variable){field(p,"Minimum variable cost",d.variable.min,"number",v=>d.variable.min=v);field(p,"Maximum variable cost",d.variable.max,"number",v=>d.variable.max=v)}
    d.hybrid??=[];listEditor(p,d.hybrid,"Hybrid cost",()=>({resources:options("resourceIds").slice(0,2),amount:1}),(r,h)=>{field(r,"Hybrid resources",h.resources.join(","),"text",v=>h.resources=v.split(",").map(x=>x.trim()).filter(Boolean));field(r,"Hybrid amount",h.amount,"number",v=>h.amount=v)},key);
    d.targets??=[];listEditor(p,d.targets,"Pre-commit target",()=>({name:"target"+(d.targets.length+1),selector:{controller:"opponent",face:"up"}}),(r,t)=>{field(r,"Target name",t.name,"text",v=>t.name=v);field(r,"Target controller",t.selector.controller??"any",["self","opponent","any"],v=>t.selector.controller=v);field(r,"Target zones",(t.selector.zones??[]).join(","),"text",v=>{if(v.trim())t.selector.zones=v.split(",").map(x=>x.trim()).filter(Boolean);else delete t.selector.zones});field(r,"Target definition",t.selector.definition??"",["",...module.definitions],v=>{if(v)t.selector.definition=v;else delete t.selector.definition})},key);
    d.modifiers??=[];listEditor(p,d.modifiers,"Cost modifier",()=>({definition:first("definitions"),zones:[first("zones")],resource:first("resourceIds"),delta:-1}),(r,m)=>{field(r,"Modifier source",m.definition,"definitions",v=>m.definition=v);field(r,"Modifier zones",m.zones.join(","),"text",v=>m.zones=v.split(",").map(x=>x.trim()).filter(Boolean));field(r,"Modified resource",m.resource,"resourceIds",v=>m.resource=v);field(r,"Cost adjustment",m.delta,"signed",v=>m.delta=v)},key);
   }
   field(p,"Allowed reaction windows",(e.windows??[]).join(","),"text",v=>{if(v.trim())e.windows=v.split(",").map(x=>x.trim()).filter(Boolean);else delete e.windows});
   cardCosts(p,e);e.alternatives??=[];
   listEditor(p,e.alternatives,"Alternative payment",()=>({id:"alternative"+(e.alternatives.length+1),costs:[],cardCosts:[]}),(r,a)=>{field(r,"Payment plan ID",a.id,"text",v=>a.id=v);a.costs??=[];listEditor(r,a.costs,"Alternative resource cost",()=>({resource:first("resourceIds"),amount:1,kind:"spend"}),(q,c)=>{field(q,"Payment resource",c.resource,"resourceIds",v=>c.resource=v);field(q,"Payment amount",c.amount,"number",v=>c.amount=v);field(q,"Payment mode",c.kind,["spend","threshold"],v=>c.kind=v)},key);cardCosts(r,a)},key);
   e.costs??=[];e.program??=[];
   listEditor(p,e.costs,"Cost",()=>({resource:first("resourceIds"),amount:1,kind:"spend"}),(r,c)=>{
    field(r,"Cost resource",c.resource,"resourceIds",v=>c.resource=v);field(r,"Cost amount",c.amount,"number",v=>c.amount=v);field(r,"Cost kind",c.kind,["spend","threshold"],v=>c.kind=v);
   },key);
   listEditor(p,e.program,"Operation",()=>({type:"resource",resource:first("resourceIds"),delta:1}),(r,op,i)=>{
    field(r,"Operation type",op.type,["resource","move","choose","target","draw","skipUnless","skipUnlessResource","skipUnlessChoice","token","counter","status","transform","flip","control","orient","search","randomHidden","reveal","reorder","lifeDamage","optional","scheduleTurn","skipUnlessExpr","eachCounter","resourceExpr","awardScore"],v=>{e.program[i]=v==="resource"?{type:v,resource:first("resourceIds"),delta:1}:v==="move"?{type:v,id:"c1",from:first("zones"),to:first("zones")}:["search","randomHidden"].includes(v)?{type:v,name:"found",zone:first("zones"),top:100}:v==="reveal"?{type:v,choice:"found",audience:"all"}:v==="reorder"?{type:v,choice:"found",zone:first("zones"),position:"bottom"}:v==="lifeDamage"?{type:v,player:"self",zone:first("zones"),destination:options("zones")[1]??"",count:1,emptyLoss:true}:v==="skipUnlessExpr"?{type:v,expression:true,skip:1}:v==="eachCounter"?{type:v,selector:{controller:"self"},counter:"power",expression:1}:v==="resourceExpr"?{type:v,resource:first("resourceIds"),expression:1}:v==="awardScore"?{type:v,player:"self",amount:1}:v==="scheduleTurn"?{type:v,kind:"extra",player:"self",count:1}:v==="optional"?{type:v,name:"optional",skip:1}:v==="token"?{type:v,definition:first("definitions"),zone:first("zones"),count:1,face:"up"}:v==="counter"?{type:v,id:"c1",counter:"power",delta:1}:v==="status"?{type:v,id:"c1",status:"stunned",operation:"add"}:v==="transform"?{type:v,id:"c1",definition:first("definitions")}:v==="flip"?{type:v,id:"c1",face:"toggle"}:v==="control"?{type:v,id:"c1",player:"self"}:v==="orient"?{type:v,id:"c1",orientation:"resting"}:v==="skipUnlessResource"?{type:v,resource:first("resourceIds"),comparison:"atLeast",amount:1,skip:1}:v==="skipUnlessChoice"?{type:v,choice:"target",value:"c1",skip:1}:v==="skipUnless"?{type:v,selector:{controller:"self"},minimum:1,skip:1}:v==="target"?{type:v,name:"target",selector:{controller:"opponent",face:"up"}}:v==="draw"?{type:v,from:first("zones"),to:options("zones")[1]??"",count:1}:{type:v,name:"target",options:["c1"]};render(key)});
    if(op.type==="resource"){field(r,"Operation resource",op.resource,"resourceIds",v=>op.resource=v);field(r,"Resource delta",op.delta,"signed",v=>op.delta=v)}
    if(op.type==="resource")field(r,"Resource overflow",op.overflow??"reject",["reject","clamp"],v=>op.overflow=v);
    if(op.type==="skipUnlessResource"){field(r,"Condition resource",op.resource,"resourceIds",v=>op.resource=v);field(r,"Comparison",op.comparison,["atLeast","atMost","equal"],v=>op.comparison=v);field(r,"Threshold",op.amount,"number",v=>op.amount=v);field(r,"Skip next operations",op.skip,"number",v=>op.skip=v)}
    if(op.type==="skipUnlessChoice"){field(r,"Prior choice name",op.choice,"text",v=>op.choice=v);field(r,"Required choice value",op.value,"text",v=>op.value=v);field(r,"Skip next operations",op.skip,"number",v=>op.skip=v)}
    if(op.type==="target"||op.type==="skipUnless"){const q=op.selector;if(op.type==="target")field(r,"Target name",op.name,"text",v=>op.name=v);else{field(r,"Minimum matching cards",op.minimum,"number",v=>op.minimum=v);field(r,"Skip next operations",op.skip,"number",v=>op.skip=v)}field(r,"Target zones (blank = visible zones)",(q.zones??[]).join(","),"text",v=>{if(v.trim())q.zones=v.split(",").map(x=>x.trim()).filter(Boolean);else delete q.zones});for(const k of ["owner","controller"])field(r,"Target "+k,q[k]??"any",["any","self","opponent"],v=>q[k]=v);field(r,"Target definition",q.definition??"",["",...(module.definitions??[])],v=>{if(v)q.definition=v;else delete q.definition});field(r,"Target face",q.face??"any",["any","up","down"],v=>{if(v==="any")delete q.face;else q.face=v});field(r,"Target orientation",q.orientation??"any",["any","ready","resting","tapped"],v=>{if(v==="any")delete q.orientation;else q.orientation=v});field(r,"Target keyword",q.keyword??"","text",v=>{if(v)q.keyword=v;else delete q.keyword});field(r,"Target limit",q.limit??100,"number",v=>q.limit=v)}
    if(["search","randomHidden"].includes(op.type)){field(r,"Selection name",op.name,"text",v=>op.name=v);field(r,"Search zone",op.zone,"zones",v=>op.zone=v);field(r,"Top cards to inspect",op.top??100,"number",v=>op.top=v);field(r,"Search definition",op.definition??"",["",...module.definitions],v=>{if(v)op.definition=v;else delete op.definition})}
    if(["skipUnlessExpr","eachCounter","resourceExpr"].includes(op.type))expressionField(r,"Operation expression",op.expression,v=>op.expression=v);
    if(op.type==="skipUnlessExpr")field(r,"Skip instructions",op.skip,"number",v=>op.skip=v);
    if(op.type==="eachCounter"){field(r,"Iteration counter",op.counter,"text",v=>op.counter=v);field(r,"Iteration controller",op.selector.controller??"any",["self","opponent","any"],v=>op.selector.controller=v);field(r,"Iteration zones",(op.selector.zones??[]).join(","),"text",v=>{if(v)op.selector.zones=v.split(",").map(x=>x.trim());else delete op.selector.zones})}
    if(op.type==="awardScore"){field(r,"Score recipient",op.player,["self",...module.players],v=>op.player=v);field(r,"Score amount",op.amount,"number",v=>op.amount=v)}
    if(op.type==="resourceExpr")field(r,"Expression resource",op.resource,"resourceIds",v=>op.resource=v);
    if(op.type==="scheduleTurn"){field(r,"Turn operation",op.kind,["extra","skip"],v=>op.kind=v);field(r,"Turn player",op.player,["self",...module.players],v=>op.player=v);field(r,"Turn count",op.count,"number",v=>op.count=v)}
    if(op.type==="optional"){field(r,"Optional choice name",op.name,"text",v=>op.name=v);field(r,"Skip on decline",op.skip,"number",v=>op.skip=v)}
    if(["reveal","reorder"].includes(op.type))field(r,"Selected card reference",op.choice,"text",v=>op.choice=v);
    if(op.type==="reveal")field(r,"Reveal audience",op.audience,["self","all"],v=>op.audience=v);
    if(op.type==="reorder"){field(r,"Reorder zone",op.zone,"zones",v=>op.zone=v);field(r,"Reorder position",op.position,["top","bottom"],v=>op.position=v)}
    if(op.type==="lifeDamage"){field(r,"Damaged player",op.player,["self",...module.players],v=>op.player=v);field(r,"Life or prize zone",op.zone,"zones",v=>op.zone=v);field(r,"Life destination",op.destination,"zones",v=>op.destination=v);field(r,"Life cards taken",op.count,"number",v=>op.count=v);field(r,"Lose on empty life",op.emptyLoss!==false?"yes":"no",["yes","no"],v=>op.emptyLoss=v==="yes")}
    if(op.type==="token"){field(r,"Token definition",op.definition,"definitions",v=>op.definition=v);field(r,"Token destination",op.zone,"zones",v=>op.zone=v);field(r,"Token quantity",op.count,"number",v=>op.count=v);field(r,"Token face",op.face??"up",["up","down"],v=>op.face=v)}
    if(["counter","status","transform","flip","control","orient"].includes(op.type)){field(r,"Card instance",op.id??"","text",v=>{delete op.choice;op.id=v});field(r,"Choice reference",op.choice??"","text",v=>{if(v){delete op.id;op.choice=v}})}
    if(op.type==="counter"){field(r,"Counter name",op.counter,"text",v=>op.counter=v);field(r,"Counter delta",op.delta,"signed",v=>op.delta=v)}
    if(op.type==="status"){field(r,"Status name",op.status,"text",v=>op.status=v);field(r,"Status operation",op.operation,["add","remove"],v=>op.operation=v);field(r,"Status duration (0 = permanent)",op.duration??0,"number",v=>op.duration=v)}
    if(op.type==="transform")field(r,"New definition",op.definition,"definitions",v=>op.definition=v);
    if(op.type==="flip")field(r,"New face",op.face,["up","down","toggle"],v=>op.face=v);
    if(op.type==="control")field(r,"New controller",op.player,["self",...module.players],v=>op.player=v);
    if(op.type==="orient")field(r,"New orientation",op.orientation,["ready","resting","tapped"],v=>op.orientation=v);
    if(op.type==="draw"){field(r,"Draw source",op.from,"zones",v=>op.from=v);field(r,"Draw destination",op.to,"zones",v=>op.to=v);field(r,"Draw count",op.count,"number",v=>op.count=v)}
    if(op.type==="move"){field(r,"Move source",op.from,"zones",v=>op.from=v);field(r,"Move destination",op.to,"zones",v=>op.to=v);field(r,"Card instance",op.id??"","text",v=>{delete op.choice;op.id=v});field(r,"Choice reference",op.choice??"","text",v=>{if(v){delete op.id;op.choice=v}})}
    if(op.type==="choose"){field(r,"Choice name",op.name,"text",v=>op.name=v);field(r,"Options (comma separated)",(op.options??[]).join(","),"text",v=>op.options=v.split(",").map(x=>x.trim()).filter(Boolean))}
    if(i>0)r.append(actionButton("Move operation up",()=>{[e.program[i-1],e.program[i]]=[e.program[i],e.program[i-1]];render(key)}));
   },key);
   p.append(actionButton("Remove effect",()=>{delete module.effects[id];render(key)}));
  }
  section.append(actionButton("Add effect",()=>{let i=1;while(Object.hasOwn(module.effects,"effect"+i))i++;module.effects["effect"+i]={available:true,costs:[],program:[]};render(key)}));
 }else if(key==="triggers"){
  module.triggers??=[];if(!Array.isArray(module.triggers))return;
  listEditor(section,module.triggers,"Trigger",()=>({id:"trigger"+(module.triggers.length+1),event:"cardMoved",actor:first("players"),effect:first("effectIds")}), (p,t)=>{
   field(p,"Trigger ID",t.id,"text",v=>t.id=v);field(p,"Event",t.event,"text",v=>t.event=v);field(p,"Actor",t.actor,"players",v=>t.actor=v);field(p,"Effect",t.effect,"effectIds",v=>t.effect=v);field(p,"Event bindings (name:field)",Object.entries(t.bindings??{}).map(([k,v])=>k+":"+v).join(","),"text",v=>t.bindings=Object.fromEntries(v.split(",").filter(x=>x.includes(":")).map(x=>x.split(":").map(y=>y.trim()))));
   const entries=Object.entries(t.where??{});for(const [k,v] of entries){const row=panel(p,"Predicate "+k);field(row,"Predicate value",String(v),"text",x=>{t.where[k]=typeof v==="number"?Number(x):typeof v==="boolean"?x==="true":x});row.append(actionButton("Remove predicate",()=>{delete t.where[k];render(key)}))}
   p.append(actionButton("Add predicate",()=>{t.where??={};let k="id";if(Object.hasOwn(t.where,k))k="to";if(!Object.hasOwn(t.where,k))t.where[k]="";render(key)}));
  },key);
 }else if(key==="combat"){
  if(module.combat&&!module.combat.group){const c=module.combat;for(const k of ["attackerDefinitions","defenderDefinitions"])field(section,k+" (comma separated; blank = any)",(c[k]??[]).join(","),"text",v=>{if(v.trim())c[k]=v.split(",").map(x=>x.trim()).filter(Boolean);else delete c[k]});for(const d of module.definitions)for(const resource of module.definitions)field(section,"Attached cost "+d+" / "+resource,c.attachedCosts?.[d]?.[resource]??0,"number",v=>{c.attachedCosts??={};c.attachedCosts[d]??={};if(v>0)c.attachedCosts[d][resource]=v;else delete c.attachedCosts[d][resource]})}
  if(module.combat)field(section,"Target orientation",module.combat.targetOrientation??"any",["any","ready","resting"],v=>{if(v==="any")delete module.combat.targetOrientation;else module.combat.targetOrientation=v});
  if(!module.combat){section.append(actionButton("Enable combat",()=>{module.combat={zones:[first("zones")],stats:{},defeatZones:{}};render(key)}));return}
  const c=module.combat;c.stats??={};c.defeatZones??={};
  field(section,"Combat zones (comma separated)",(c.zones??[]).join(","),"text",v=>c.zones=v.split(",").map(x=>x.trim()).filter(Boolean));
  field(section,"Damage cleanup",c.damageCleanup??"persistent",["persistent","turn"],v=>c.damageCleanup=v);
  field(section,"Retaliation",c.retaliate===false?"no":"yes",["yes","no"],v=>c.retaliate=v==="yes");
  field(section,"Combat mode",c.group?"group":"single",["single","group"],v=>{if(v==="group")c.group={maxAttackers:10,assignment:"lethal",readyBlockers:true};else delete c.group;render(key)});
  if(c.group){const g=c.group;field(section,"Maximum attackers",g.maxAttackers,"number",v=>g.maxAttackers=v);field(section,"Damage assignment",g.assignment,["lethal","even","manual"],v=>g.assignment=v);field(section,"Ready blockers required",g.readyBlockers!==false?"yes":"no",["yes","no"],v=>g.readyBlockers=v==="yes");field(section,"Guard status (optional)",g.guardStatus??"","text",v=>{if(v)g.guardStatus=v;else delete g.guardStatus});field(section,"Direct attack resource",g.lifeResource??"",["",...(module.resources??[]).filter(r=>r.scope==="player").map(r=>r.id)],v=>{if(v)g.lifeResource=v;else delete g.lifeResource});
   field(section,"Battle comparison",g.comparison??"damage",["damage","power"],v=>g.comparison=v);field(section,"Overflow damage",g.overflow?"yes":"no",["yes","no"],v=>g.overflow=v==="yes");field(section,"Interception targets",g.intercept??"all",["all","direct"],v=>g.intercept=v);field(section,"Damage type",g.damageType??"combat","text",v=>g.damageType=v);
   g.reactions??=[];listEditor(section,g.reactions,"Combat reaction",()=>({id:"reaction"+(g.reactions.length+1),definition:first("definitions"),zones:[first("zones")],destination:options("zones")[1]??"",amount:1}),(p,r)=>{field(p,"Reaction ID",r.id,"text",v=>r.id=v);field(p,"Reaction card",r.definition,"definitions",v=>r.definition=v);field(p,"Reaction source zones",r.zones.join(","),"text",v=>r.zones=v.split(",").map(x=>x.trim()).filter(Boolean));field(p,"Reaction discard destination",r.destination,"zones",v=>r.destination=v);field(p,"Attack reduction",r.amount,"number",v=>r.amount=v)},key);
   g.lifeCards??={};for(const player of module.players){
    const zones=module.zones.filter(z=>z.owner===player).map(z=>z.id);
    field(section,"Life card zone "+player,g.lifeCards[player]?.zone??"",["",...zones],v=>{if(v)g.lifeCards[player]={zone:v,destination:zones.find(z=>z!==v)??"",emptyLoss:true,perAttack:true};else delete g.lifeCards[player];render(key)});
    if(g.lifeCards[player]){const p=g.lifeCards[player];field(section,"Life destination "+player,p.destination,zones,v=>p.destination=v);field(section,"Life damage per "+player,p.perAttack?"attack":"damage",["attack","damage"],v=>p.perAttack=v==="attack");field(section,"Lose on empty life "+player,p.emptyLoss!==false?"yes":"no",["yes","no"],v=>p.emptyLoss=v==="yes")}
   }
  }
  for(const d of module.definitions??[]){const p=panel(section,d),st=c.stats[d]??{attack:0,health:1};field(p,"Attack "+d,st.attack,"number",v=>{c.stats[d]??={...st};c.stats[d].attack=v});field(p,"Health "+d,st.health,"number",v=>{c.stats[d]??={...st};c.stats[d].health=v})}
  for(const p of module.players??[])field(section,"Defeat zone "+p,c.defeatZones[p],"zones",v=>c.defeatZones[p]=v);
  section.append(actionButton("Disable combat",()=>{delete module.combat;render(key)}));
 }else if(key==="victory"){
  module.victory??=[];if(!Array.isArray(module.victory))return;
  listEditor(section,module.victory,"Condition",()=>({type:"emptyZone",player:first("players"),zone:first("zones")}), (p,r,i)=>{
   field(p,"Condition type",r.type,["emptyZone","resourceAtMost"],v=>{module.victory[i]=v==="emptyZone"?{type:v,player:r.player,zone:first("zones")}:{type:v,player:r.player,resource:first("resourceIds"),amount:0};render(key)});
   field(p,"Losing player",r.player,"players",v=>r.player=v);
   if(r.type==="emptyZone")field(p,"Empty zone",r.zone,"zones",v=>r.zone=v);
   if(r.type==="resourceAtMost"){field(p,"Resource",r.resource,"resourceIds",v=>r.resource=v);field(p,"Maximum remaining",r.amount,"number",v=>r.amount=v)}
  },key);
 }
}


function cardDesigner(section){
 module.cardPresentation??={};
 for(const id of module.definitions??[]){
  const p=panel(section,id),data=module.cardPresentation[id]??={};
  field(p,"Display name "+id,data.name??id,"text",v=>data.name=v);
  field(p,"Card type "+id,data.type??"","text",v=>data.type=v);
  field(p,"Deck tags "+id,(data.tags??[]).join(","),"text",v=>data.tags=v.split(",").map(x=>x.trim()).filter(Boolean));field(p,"Deck points "+id,data.deckPoints??0,"number",v=>data.deckPoints=v);
  field(p,"Card frame "+id,data.frame??"verdant",["verdant","steel","crimson","gold","arcane","neutral"],v=>data.frame=v);
  const text=node("textarea");text.setAttribute("aria-label","Rules text "+id);text.value=data.text??"";text.rows=3;text.style.width="100%";text.oninput=()=>{data.text=text.value;sync()};p.append(text);
  const art=node("input");art.type="file";art.accept="image/png,image/jpeg,image/webp";art.setAttribute("aria-label","Artwork "+id);
  const preview=node("img");preview.alt="Card artwork "+id;preview.style.cssText="display:block;max-width:180px;max-height:240px;object-fit:contain";
  const fallback=node("div");fallback.className="monogram-art";fallback.style.cssText="width:180px;height:130px";const refreshArt=()=>{fallback.replaceChildren();const symbol=node("span",/resource|energy|nutrient|rune|momentum/i.test(data.type??"")?"◈":/spell|event|action/i.test(data.type??"")?"✦":"♜");symbol.className="monogram-symbol";const letters=node("strong",Array.from((data.name??id).replace(/[^\p{L}\p{N}]/gu,"")).slice(0,3).join("").toUpperCase());letters.className="monogram-letters";fallback.append(symbol,letters);fallback.style.display=preview.hidden?"grid":"none";fallback.hidden=!preview.hidden};if(/^data:image\/(png|jpeg|webp);base64,/.test(data.art??""))preview.src=data.art;else preview.hidden=true;refreshArt();p.addEventListener("input",refreshArt);
  art.onchange=async()=>{try{const file=art.files[0];if(!file)return;if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>400000)throw Error("Choose a PNG, JPEG or WebP under 400 KB.");const reader=new FileReader();reader.onload=()=>{data.art=String(reader.result);preview.src=data.art;preview.hidden=false;refreshArt();sync()};reader.onerror=()=>status("Artwork read failed");reader.readAsDataURL(file)}catch(e){status(e.message)}};
  p.append(art,preview,fallback,actionButton("Remove artwork",()=>{delete data.art;preview.removeAttribute("src");preview.hidden=true;refreshArt();sync()}));
  const stats=module.combat?.stats?.[id];
  if(stats){field(p,"Card attack "+id,stats.attack,"number",v=>stats.attack=v);field(p,"Card health "+id,stats.health,"number",v=>stats.health=v)}
 }
}


function advancedPolicies(key,section){
 const csv=v=>v.split(",").map(x=>x.trim()).filter(Boolean);
 const bool=(p,label,value,fn)=>field(p,label,value?"yes":"no",["yes","no"],v=>fn(v==="yes"));
 const disable=()=>section.append(actionButton("Disable "+key,()=>{delete module[key];render(key)}));
 if(key==="attachment"){
  if(!module.attachment){section.append(actionButton("Enable attachment",()=>{module.attachment={zones:[first("zones")],definitions:[],max:1,onHostMove:"detach"};render(key)}));return}
  const a=module.attachment;
 field(section,"Eligible host definitions (blank = any)",(a.hostDefinitions??[]).join(","),"text",v=>{if(v.trim())a.hostDefinitions=v.split(",").map(x=>x.trim()).filter(Boolean);else delete a.hostDefinitions});
  field(section,"Attachment zones",(a.zones??[]).join(","),"text",v=>a.zones=csv(v));
  field(section,"Equipment definitions",(a.definitions??[]).join(","),"text",v=>a.definitions=csv(v));
  field(section,"Maximum attachments",a.max??1,"number",v=>a.max=v);
  field(section,"Host movement",a.onHostMove??"detach",["detach","follow","reject"],v=>a.onHostMove=v);disable();
 }else if(key==="timing"){
  field(section,"Trigger ordering",module.triggerOrder??"fixed",["fixed","player","owner"],v=>module.triggerOrder=v);
  module.timing??={};field(section,"Resolution order",module.timing.order??"lifo",["lifo","fifo"],v=>module.timing.order=v);
  bool(section,"Refresh shared resources",module.refreshShared,v=>module.refreshShared=v);
 }else if(key==="chain"){
  if(!module.chain){section.append(actionButton("Enable chain",()=>{module.chain={maxLinks:10,minimumResponseSpeed:0,escalate:false,speedByEffect:Object.fromEntries(Object.keys(module.effects??{}).map(id=>[id,0]))};render(key)}));return}
  const c=module.chain;c.speedByEffect??={};
  field(section,"Maximum chain links",c.maxLinks??100,"number",v=>c.maxLinks=v);
  field(section,"Minimum response speed",c.minimumResponseSpeed??0,"number",v=>c.minimumResponseSpeed=v);
  bool(section,"Escalating response speed",c.escalate,v=>c.escalate=v);
  for(const id of Object.keys(module.effects??{}))field(section,"Speed "+id,c.speedByEffect[id]??0,"number",v=>c.speedByEffect[id]=v);disable();
 }else{
  if(!module.combat){section.append(node("p","Enable combat first."));return}
  const c=module.combat;c[key]??=[];
  const modifier=key==="modifiers";
  listEditor(section,c[key],modifier?"Modifier":"Replacement",()=>({id:key+(c[key].length+1),...(modifier?{stat:"attack",op:"add",value:1}:{op:"prevent"})}),(p,r)=>{
   field(p,"Rule ID",r.id,"text",v=>r.id=v);
   field(p,"Target instance (blank = all)",r.target??"","text",v=>{if(v)r.target=v;else delete r.target});
   if(modifier){
    field(p,"Statistic",r.stat,["attack","health"],v=>r.stat=v);
    field(p,"Modifier operation",r.op,["set","add","multiply"],v=>r.op=v);
    field(p,"Modifier value",r.value,"signed",v=>r.value=v);field(p,"Modifier layer",r.layer??({set:0,add:1,multiply:2}[r.op]),"number",v=>r.layer=v);expressionField(p,"Modifier condition",r.when??true,v=>r.when=v);
    field(p,"Source instance (optional)",r.source??"","text",v=>{if(v){r.source=v;r.sourceZones??=[]}else{delete r.source;delete r.sourceZones}});
    field(p,"Source zones",(r.sourceZones??[]).join(","),"text",v=>r.sourceZones=csv(v));
    field(p,"Expires before turn (blank = never)",r.expires??"","text",v=>{if(v==="")delete r.expires;else r.expires=Number(v)});
   }else{
    field(p,"Replacement operation",r.op,["prevent","reduce","redirect"],v=>{r.op=v;if(v==="reduce")r.amount??=1;if(v==="redirect")r.to??="c1";render(key)});
    if(r.op==="reduce")field(p,"Damage reduction",r.amount,"number",v=>r.amount=v);
    if(r.op==="redirect")field(p,"Redirect to instance",r.to,"text",v=>r.to=v);
   }
  },key);
 }
}


function deckEditor(section){
 section.append(actionButton("Open visual deck workshop",()=>{try{stagePlaytest(module);location.href="deck-workshop.html"+(savedId?"?saved="+encodeURIComponent(savedId):"")}catch(e){status(e.message)}}));
 module.deckRules??={min:1,max:40,copies:4};module.decks??=[];
 const rules=module.deckRules;
 field(section,"Minimum deck size",rules.min,"number",v=>rules.min=v);
 field(section,"Maximum deck size",rules.max,"number",v=>rules.max=v);
 field(section,"Maximum copies",rules.copies,"number",v=>rules.copies=v);
 field(section,"Banned definitions",(rules.banned??[]).join(","),"text",v=>rules.banned=v.split(",").map(x=>x.trim()).filter(Boolean));
 field(section,"Allowed deck tags",(rules.allowedTags??[]).join(","),"text",v=>rules.allowedTags=v.split(",").map(x=>x.trim()).filter(Boolean));
 field(section,"Deck point budget (blank = none)",rules.maxPoints??"","text",v=>{if(v==="")delete rules.maxPoints;else rules.maxPoints=Number(v)});
 for(const id of module.definitions){field(section,"Copy limit "+id,rules.copyLimits?.[id]??"","text",v=>{rules.copyLimits??={};if(v==="")delete rules.copyLimits[id];else rules.copyLimits[id]=Number(v)});field(section,"Required copies "+id,rules.required?.[id]??0,"number",v=>{rules.required??={};if(v)rules.required[id]=v;else delete rules.required[id]})}
 rules.quotas??=[];listEditor(section,rules.quotas,"Deck quota",()=>({kind:"type",value:"Unit",min:0,max:40}),(p,q)=>{field(p,"Quota kind",q.kind,["type","tag"],v=>q.kind=v);field(p,"Quota value",q.value,"text",v=>q.value=v);field(p,"Quota minimum",q.min,"number",v=>q.min=v);field(p,"Quota maximum",q.max,"number",v=>q.max=v)},"decks");
 section.append(node("p","Decks can be saved with the module. Append a deck to starting setup explicitly; this preserves existing card instance IDs and order."));
 listEditor(section,module.decks,"Deck",()=>({name:"New deck",player:first("players"),zone:module.zones.find(z=>z.owner===first("players"))?.id??"",cards:[]}),(p,d)=>{
  field(p,"Deck name",d.name,"text",v=>d.name=v);
  if(module.deckRoles?.length)field(p,"Deck role",d.role??"",["",...module.deckRoles.map(r=>r.id)],v=>{d.role=v;render("decks")});
  field(p,"Deck player",d.player,"players",v=>{d.player=v;d.zone=module.zones.find(z=>z.owner===v)?.id??"";render("decks")});
  field(p,"Deck destination",d.zone,module.zones.filter(z=>z.owner===d.player).map(z=>z.id),v=>d.zone=v);
  d.cards??=[];
  listEditor(p,d.cards,"Deck card",()=>({definition:module.definitions.find(id=>!d.cards.some(c=>c.definition===id))??first("definitions"),count:1}),(r,c)=>{
   field(r,"Deck card definition",c.definition,"definitions",v=>c.definition=v);field(r,"Copies",c.count,"number",v=>c.count=v);
  },"decks");
  const result=node("p");result.setAttribute("role","status");p.append(result);
  p.append(actionButton("Validate deck",()=>{const errors=validateDeck(module,d);result.textContent=errors.length?errors.join(" · "):"Deck is legal."}));
  if(module.deckRoles?.length){p.append(actionButton("Validate linked deck group",()=>{const errors=validateDeckGroup(module,module.decks,d.player);result.textContent=errors.length?errors.join(" · "):"Deck group is legal."}),actionButton("Append linked deck group",()=>{try{const next=appendDeckGroup(module,module.decks,d.player);createMatch(next);module=next;render("decks");status("Deck group appended.")}catch(e){status(e.message)}}))}
  p.append(actionButton("Append deck to starting setup",()=>{try{const next=appendDeckToSetup(module,d);createMatch(next);module=next;render("decks");status("Deck appended to starting setup.")}catch(e){status(e.message)}}));
 },"decks");
}


function drawPolicyEditor(section){
 module.resourceDrawPolicies??=[];listEditor(section,module.resourceDrawPolicies,"Resource replenishment",()=>({player:module.players[0],deck:first("zones"),pool:options("zones")[1],perTurn:1}),(p,r)=>{field(p,"Resource player",r.player,module.players,v=>r.player=v);field(p,"Resource deck",r.deck,"zones",v=>r.deck=v);field(p,"Resource pool",r.pool,"zones",v=>r.pool=v);field(p,"Cards per turn",r.perTurn,"number",v=>r.perTurn=v)},"drawPolicies");
 module.drawPolicies??=[];
 listEditor(section,module.drawPolicies,"Draw policy",()=>{
  const player=module.players.find(p=>!module.drawPolicies.some(d=>d.player===p))??first("players");
  return {player,deck:module.zones.find(z=>z.owner===player&&z.visibility==="hidden")?.id??"",hand:module.zones.find(z=>z.owner===player&&z.visibility==="owner")?.id??"",opening:0,perTurn:1,shuffle:true,mulligans:0,mulliganPenalty:0};
 },(p,d)=>{
  field(p,"Draw player",d.player,"players",v=>{d.player=v;d.deck=module.zones.find(z=>z.owner===v&&z.visibility==="hidden")?.id??"";d.hand=module.zones.find(z=>z.owner===v&&z.visibility==="owner")?.id??"";render("drawPolicies")});
  field(p,"Draw pile",d.deck,module.zones.filter(z=>z.owner===d.player&&z.visibility==="hidden").map(z=>z.id),v=>d.deck=v);
  field(p,"Opening hand destination",d.hand,module.zones.filter(z=>z.owner===d.player&&z.visibility==="owner").map(z=>z.id),v=>d.hand=v);
  field(p,"Opening hand size",d.opening??0,"number",v=>d.opening=v);
  field(p,"Draw per turn",d.perTurn??0,"number",v=>d.perTurn=v);
  field(p,"Shuffle at start",d.shuffle?"yes":"no",["yes","no"],v=>d.shuffle=v==="yes");
  field(p,"Allowed mulligans",d.mulligans??0,"number",v=>d.mulligans=v);
  field(p,"Deck exhaustion",d.exhaustion??"ignore",["ignore","lose"],v=>d.exhaustion=v);
  field(p,"Cards lost per mulligan",d.mulliganPenalty??0,"number",v=>d.mulliganPenalty=v);
 },"drawPolicies");
}
function layoutEditor(section){
 module.tabletop??={};field(section,"Tabletop theme",module.tabletop.theme??"forest",["forest","midnight","stone","ember"],v=>module.tabletop.theme=v);field(section,"Card back design",module.tabletop.back??"diamond",["diamond","rune","spiral"],v=>module.tabletop.back=v);
 if(!module.battlefield){section.append(actionButton("Configure battlefield",()=>{module.battlefield={columns:2,zones:module.zones.map(z=>({zone:z.id,label:z.id,display:"cards",span:1}))};render("battlefield")}));return}
 const b=module.battlefield;b.zones??=[];
 field(section,"Battlefield columns",String(b.columns??1),["1","2","3"],v=>b.columns=Number(v));
 section.append(node("p","Zones appear in this order. Unlisted zones remain visible after configured zones. Hidden cards stay hidden."));
 listEditor(section,b.zones,"Zone layout",()=>({zone:module.zones.find(z=>!b.zones.some(r=>r.zone===z.id))?.id??first("zones"),label:"",display:"cards",span:1}),(p,r,i)=>{
  field(p,"Layout zone",r.zone,"zones",v=>r.zone=v);
  field(p,"Zone label",r.label??"","text",v=>r.label=v);
  field(p,"Zone display",r.display??"cards",["cards","count"],v=>r.display=v);
  field(p,"Zone width",String(r.span??1),["1","2","3"],v=>r.span=Number(v));
  if(i>0)p.append(actionButton("Move zone up",()=>{[b.zones[i-1],b.zones[i]]=[b.zones[i],b.zones[i-1]];render("battlefield")}));
 },"battlefield");
 section.append(actionButton("Reset battlefield layout",()=>{delete module.battlefield;render("battlefield")}));
}


function phaseEditor(section){
 if(!module.phases){section.append(actionButton("Configure turn phases",()=>{module.phases=[{id:"main",actions:["activate","attack","attach"]}];render("phases")}));return}
 listEditor(section,module.phases,"Phase",()=>{let i=1;while(module.phases.some(p=>p.id==="phase"+i))i++;return {id:"phase"+i,actions:["activate"]}},(p,r,i)=>{
  field(p,"Phase ID",r.id,"text",v=>r.id=v);field(p,"Named window",r.window??"main","text",v=>r.window=v);field(p,"Automatic phase advance",r.autoAdvance?"yes":"no",["yes","no"],v=>r.autoAdvance=v==="yes");
  for(const action of ["activate","attack","attach","move"])field(p,"Allow "+action,r.actions.includes(action)?"yes":"no",["yes","no"],v=>{r.actions=r.actions.filter(a=>a!==action);if(v==="yes")r.actions.push(action)});
  if(i>0)p.append(actionButton("Move phase up",()=>{[module.phases[i-1],module.phases[i]]=[module.phases[i],module.phases[i-1]];render("phases")}));
 },"phases");
 section.append(actionButton("Use single action window",()=>{delete module.phases;for(const e of Object.values(module.effects??{}))delete e.phases;render("phases")}));
}


function campaignEditor(section){
 if(!module.campaign){section.append(actionButton("Create campaign",()=>{module.campaign={id:"campaign-"+crypto.randomUUID(),player:first("players"),encounters:[]};render("campaign")}));return}
 const c=module.campaign;
 field(section,"Campaign ID",c.id,"text",v=>c.id=v);
 field(section,"Human seat",c.player,"players",v=>c.player=v);
 field(section,"Reward deck zone",c.rewardZone??"",["",...module.zones.filter(z=>z.owner===c.player&&z.visibility==="hidden").map(z=>z.id)],v=>{if(v)c.rewardZone=v;else delete c.rewardZone});
 section.append(node("p","Encounters inherit the current module. Capture scenario rules from the editor, or edit encounter overrides directly. Winning unlocks the next encounter."));
 listEditor(section,c.encounters,"Encounter",()=>({id:"encounter-"+crypto.randomUUID(),name:"New encounter",intro:"",overrides:{}}),(p,e,i)=>{
  field(p,"Encounter ID",e.id,"text",v=>e.id=v);
  field(p,"Encounter name",e.name,"text",v=>e.name=v);
  field(p,"Encounter introduction",e.intro??"","text",v=>e.intro=v);
  p.append(actionButton(e.routes===undefined?"Configure branching routes":"Use next encounter in order",()=>{if(e.routes===undefined)e.routes=[];else delete e.routes;render("campaign")}));
  if(e.routes!==undefined)listEditor(p,e.routes,"Route",()=>({to:c.encounters[i+1]?.id??"",label:"Continue"}),(r,route)=>{field(r,"Route destination",route.to,c.encounters.slice(i+1).map(x=>x.id),v=>route.to=v);field(r,"Route label",route.label,"text",v=>route.label=v)},"campaign");
  e.rewards??=[];listEditor(p,e.rewards,"Reward",()=>({definition:first("definitions"),count:1}),(r,reward)=>{field(r,"Reward card",reward.definition,"definitions",v=>reward.definition=v);field(r,"Reward copies",reward.count,"number",v=>reward.count=v)},"campaign");
  const area=node("textarea");area.rows=6;area.style.width="100%";area.setAttribute("aria-label","Encounter rule overrides "+(i+1));area.value=JSON.stringify(e.overrides??{},null,2);p.append(area);
  p.append(actionButton("Apply encounter overrides",()=>{try{const value=JSON.parse(area.value);if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Expected object");e.overrides=value;sync();status("Encounter overrides updated.")}catch(err){status(err.message)}}));
  p.append(actionButton("Capture current scenario",()=>{e.overrides=Object.fromEntries(["setup","resources","effects","triggers","victory","drawPolicies","combat","attachment","phases","timing","chain"].filter(k=>Object.hasOwn(module,k)).map(k=>[k,structuredClone(module[k])]));render("campaign")}));
  if(i>0)p.append(actionButton("Move encounter up",()=>{[c.encounters[i-1],c.encounters[i]]=[c.encounters[i],c.encounters[i-1]];render("campaign")}));
 },"campaign");
 section.append(actionButton("Validate campaign",()=>{const errors=validateCampaign(module);status(errors.length?errors.join(" · "):"Campaign passed validation.")}));
 section.append(actionButton("Play campaign",()=>{try{const errors=validateCampaign(module);if(errors.length)throw Error(errors.join(" · "));stagePlaytest(module);location.href="duel.html?campaign=1"}catch(err){status(err.message)}}));
 section.append(actionButton("Remove campaign",()=>{if(confirm("Remove campaign from draft?")){delete module.campaign;render("campaign")}}));
}

function aiEditor(section){
 module.ai??={};const a=module.ai;
 field(section,"AI difficulty",a.difficulty??"normal",["easy","normal","hard"],v=>a.difficulty=v);
 field(section,"AI personality",a.personality??"balanced",["balanced","aggressive","defensive","economic"],v=>a.personality=v);
 section.append(node("p","Optional evaluation weights from 0 to 5. Blank uses the personality default."));
 const report=node("pre");report.style.whiteSpace="pre-wrap";section.append(actionButton("Run 3 AI simulations",()=>{try{const r=benchmarkAI(module,{games:3,maxActions:120,maxTurns:20});report.textContent=JSON.stringify({wins:r.wins,reasons:r.reasons,meanActions:r.meanActions,meanTurns:r.meanTurns,actions:r.actions},null,2)}catch(e){report.textContent=e.message}}),report);
 for(const k of ["board","life","resource","hand","pressure"])field(section,"AI weight "+k,a.weights?.[k]??"","text",v=>{a.weights??={};if(v.trim()==="")delete a.weights[k];else a.weights[k]=Number(v)});
}
function keywordEditor(section){
 module.keywordRules??={keywords:{},definitions:{},passives:[]};const k=module.keywordRules;k.keywords??={};k.definitions??={};k.passives??=[];
 const restrictions=["cannotAttack","cannotBlock","cannotBeAttacked","cannotActivate","untargetable","damageImmune"];
 section.append(actionButton("Add keyword",()=>{let i=1;while(Object.hasOwn(k.keywords,"keyword"+i))i++;k.keywords["keyword"+i]={restrictions:[]};render("keywordRules")}));
 for(const [id,r] of Object.entries(k.keywords)){
  const p=panel(section,id);field(p,"Keyword ID",id,"text",v=>{if(!/^[A-Za-z0-9_-]{1,80}$/.test(v)||Object.hasOwn(k.keywords,v)||Object.hasOwn(Object.prototype,v))return;k.keywords[v]=r;delete k.keywords[id];for(const d of Object.keys(k.definitions))k.definitions[d]=k.definitions[d].map(x=>x===id?v:x);for(const a of k.passives)if(a.targetKeyword===id)a.targetKeyword=v;render("keywordRules")});
  for(const rule of restrictions)field(p,rule,r.restrictions.includes(rule)?"yes":"no",["yes","no"],v=>{r.restrictions=r.restrictions.filter(x=>x!==rule);if(v==="yes")r.restrictions.push(rule)});
  p.append(actionButton("Remove keyword",()=>{delete k.keywords[id];for(const d of Object.keys(k.definitions))k.definitions[d]=k.definitions[d].filter(x=>x!==id);render("keywordRules")}));
 }
 for(const d of module.definitions)field(section,"Keywords "+d,(k.definitions[d]??[]).join(","),"text",v=>k.definitions[d]=v.split(",").map(x=>x.trim()).filter(Boolean));
 listEditor(section,k.passives,"Passive",()=>({sourceDefinition:first("definitions"),sourceZones:[first("zones")],targetZones:[first("zones")],relation:"friendly",stat:"attack",op:"add",value:1}),(p,a)=>{
  field(p,"Aura source",a.sourceDefinition,"definitions",v=>a.sourceDefinition=v);
  for(const [key,label] of [["sourceZones","Aura source zones"],["targetZones","Aura target zones"]])field(p,label,a[key].join(","),"text",v=>a[key]=v.split(",").map(x=>x.trim()).filter(Boolean));
  field(p,"Aura relation",a.relation,["self","friendly","enemy","all"],v=>a.relation=v);field(p,"Aura statistic",a.stat,["attack","health"],v=>a.stat=v);field(p,"Aura operation",a.op,["set","add","multiply"],v=>a.op=v);field(p,"Aura value",a.value,"signed",v=>a.value=v);
  field(p,"Aura target definition",a.targetDefinition??"",["",...module.definitions],v=>{if(v)a.targetDefinition=v;else delete a.targetDefinition});
  field(p,"Aura target keyword",a.targetKeyword??"",["",...Object.keys(k.keywords)],v=>{if(v)a.targetKeyword=v;else delete a.targetKeyword});
  field(p,"Required source status",a.requiresStatus??"","text",v=>{if(v)a.requiresStatus=v;else delete a.requiresStatus});
  field(p,"Minimum turn",a.minimumTurn??0,"number",v=>a.minimumTurn=v);
  field(p,"Required source counter",a.minimumCounter?.name??"","text",v=>{if(v)a.minimumCounter={name:v,amount:a.minimumCounter?.amount??1};else delete a.minimumCounter;render("keywordRules")});
  if(a.minimumCounter)field(p,"Minimum counter amount",a.minimumCounter.amount,"number",v=>a.minimumCounter.amount=v);
 },"keywordRules");
}
function compositeEditor(section){
 module.stackRules??=[];
 listEditor(section,module.stackRules,"Stack rule",()=>({id:"stack"+(module.stackRules.length+1),hostDefinition:first("definitions"),materialDefinition:options("definitions")[1]??first("definitions"),hostZones:[first("zones")],materialZones:[first("zones")],inherit:true,preserve:["damage","counters","statuses","orientation","controller","attachments"]}),(p,r)=>{
  field(p,"Stack rule ID",r.id,"text",v=>r.id=v);field(p,"Host definition",r.hostDefinition,"definitions",v=>r.hostDefinition=v);field(p,"Material definition",r.materialDefinition,"definitions",v=>r.materialDefinition=v);
  field(p,"Result definition (blank = material)",r.resultDefinition??"",["",...module.definitions],v=>{if(v)r.resultDefinition=v;else delete r.resultDefinition});
  for(const [k,label] of [["hostZones","Host zones"],["materialZones","Material zones"]])field(p,label,r[k].join(","),"text",v=>r[k]=v.split(",").map(x=>x.trim()).filter(Boolean));
  field(p,"Inherit previous abilities",r.inherit?"yes":"no",["yes","no"],v=>r.inherit=v==="yes");
  for(const k of ["damage","counters","statuses","orientation","controller","attachments"])field(p,"Preserve "+k,(r.preserve??[]).includes(k)?"yes":"no",["yes","no"],v=>{r.preserve=(r.preserve??[]).filter(x=>x!==k);if(v==="yes")r.preserve.push(k)});
 },"stackRules");
}
function deckRoleEditor(section){
 module.deckRoles??=[];module.linkedDeckRules??={};
 field(section,"Combined copy limit (blank = none)",module.linkedDeckRules.combinedCopies??"","text",v=>{if(v==="")delete module.linkedDeckRules.combinedCopies;else module.linkedDeckRules.combinedCopies=Number(v)});
 listEditor(section,module.deckRoles,"Deck role",()=>({id:"role"+(module.deckRoles.length+1),zones:[first("zones")],required:true,rules:{min:1,max:40,copies:4}}),(p,r)=>{
  field(p,"Role ID",r.id,"text",v=>r.id=v);field(p,"Role destinations",r.zones.join(","),"text",v=>r.zones=v.split(",").map(x=>x.trim()).filter(Boolean));
  for(const [k,label] of [["required","Required role"],["providesTags","Provides linked tags"],["requiresProvidedTags","Requires linked tags"]])field(p,label,r[k]?"yes":"no",["yes","no"],v=>r[k]=v==="yes");
  r.rules??={};for(const k of ["min","max","copies"])field(p,"Role "+k,r.rules[k]??"","text",v=>{if(v==="")delete r.rules[k];else r.rules[k]=Number(v)});
 },"deckRoles");
}
function schedulerEditor(section){
 module.scheduler??={};const p=module.scheduler;
 field(section,"Turn scheduling mode",p.mode??"round",["round","alternate"],v=>p.mode=v);
 field(section,"Initiative claims",p.initiative?"yes":"no",["yes","no"],v=>p.initiative=v==="yes");
 field(section,"Response window name",p.responseWindow??"response","text",v=>p.responseWindow=v);
 field(section,"Shared turn gauge",p.gauge?.resource??"",["",...(module.resources??[]).filter(r=>r.scope==="shared").map(r=>r.id)],v=>{if(v)p.gauge={resource:v,threshold:1,reset:0};else delete p.gauge;render("scheduler")});
 if(p.gauge){field(section,"Gauge transfer threshold",p.gauge.threshold,"number",v=>p.gauge.threshold=v);field(section,"Gauge reset value",p.gauge.reset??0,"number",v=>p.gauge.reset=v)}
}
function expressionField(p,label,value,change){
 const l=node("label",label+" "),a=node("textarea");a.setAttribute("aria-label",label);a.rows=3;a.value=JSON.stringify(value??true);a.onchange=()=>{try{const v=JSON.parse(a.value);validateExpression(v);change(v);sync();status("Expression updated.")}catch(e){status(e.message)}};l.append(a);p.append(l);
}
function declarativeEditor(section){
 module.attributes??={};module.permissionRules??=[];module.eventReplacements??=[];module.stabilization??={lethal:false,moves:[]};
 for(const id of module.definitions){module.attributes[id]??={};const a=module.attributes[id],p=node("fieldset");p.append(node("legend","Attributes "+id));const rows=Object.entries(a).map(([name,value])=>({name,value}));const save=()=>{module.attributes[id]=Object.fromEntries(rows.map(r=>[r.name,r.value]));sync()};for(const r of rows){field(p,"Attribute name",r.name,"text",v=>{r.name=v;save()});field(p,"Attribute type",typeof r.value,["string","number","boolean"],v=>{r.value=v==="number"?0:v==="boolean"?false:"";save();render("declarative")});field(p,"Attribute value",String(r.value),"text",v=>{r.value=typeof r.value==="number"?Number(v):typeof r.value==="boolean"?v==="true":v;save()})}p.append(actionButton("Add attribute",()=>{a["attribute"+(rows.length+1)]=0;render("declarative")}));section.append(p)}
 listEditor(section,module.permissionRules,"Permission rule",()=>({rule:"cannotAttack",when:false}),(p,r)=>{field(p,"Restricted action",r.rule,["cannotAttack","cannotBlock","cannotBeAttacked","cannotActivate","untargetable","damageImmune"],v=>r.rule=v);expressionField(p,"Permission condition",r.when,v=>r.when=v)},"declarative");
 listEditor(section,module.eventReplacements,"Draw replacement",()=>({id:"draw"+(module.eventReplacements.length+1),event:"draw",op:"prevent",order:0}),(p,r)=>{field(p,"Replacement ID",r.id,"text",v=>r.id=v);field(p,"Replacement order",r.order??0,"number",v=>r.order=v);field(p,"Draw replacement operation",r.op,["prevent","reduce","redirect"],v=>{r.op=v;if(v==="reduce")r.amount=1;if(v==="redirect")r.to=first("zones");render("declarative")});if(r.op==="reduce")field(p,"Reduction",r.amount,"number",v=>r.amount=v);if(r.op==="redirect")field(p,"Redirect destination",r.to,"zones",v=>r.to=v);expressionField(p,"Replacement condition",r.when??true,v=>r.when=v)},"declarative");
 const st=module.stabilization;field(section,"Automatic lethal checks",st.lethal?"yes":"no",["yes","no"],v=>st.lethal=v==="yes");st.moves??=[];
 listEditor(section,st.moves,"State move",()=>({from:first("zones"),to:options("zones")[1],when:false}),(p,r)=>{field(p,"State source",r.from,"zones",v=>r.from=v);field(p,"State destination",r.to,"zones",v=>r.to=v);expressionField(p,"State condition",r.when,v=>r.when=v)},"declarative");
}
function spatialEditor(section){
 if(!module.spatial){section.append(actionButton("Enable spatial battlefield",()=>{module.spatial={grid:true,slots:[],edges:[],maxSteps:1,attackRange:1};render("spatial") }));return}
 const p=module.spatial;
 field(section,"Grid adjacency",p.grid?"yes":"no",["yes","no"],v=>{p.grid=v==="yes";render("spatial")});
 for(const [k,label] of [["maxSteps","Maximum movement steps"],["attackRange","Attack range"],["blockRange","Block range"],["costPerStep","Movement cost per step"]])field(section,label,p[k]??1,"number",v=>p[k]=v);
 field(section,"Movement resource",p.resource??"",["",...options("resourceIds")],v=>{if(v)p.resource=v;else delete p.resource});
 field(section,"Rest after movement",p.restOnMove?"yes":"no",["yes","no"],v=>p.restOnMove=v==="yes");
 const grid=node("div");grid.style.cssText="display:grid;grid-template-columns:repeat(5,minmax(75px,1fr));gap:5px;overflow:auto";
 const available=module.zones.filter(z=>z.visibility==="public"&&!p.slots.some(s=>s.zone===z.id));
 const palette=node("select");palette.setAttribute("aria-label","Zone to place");for(const z of available){const o=node("option",z.id);o.value=z.id;palette.append(o)}section.append(node("p","Select a public zone, then click a free cell to place it. Click an occupied cell to remove it from the spatial layout."),palette);
 const width=Math.max(5,...p.slots.map(s=>s.x+1)),height=Math.max(5,...p.slots.map(s=>s.y+1));grid.style.gridTemplateColumns="repeat("+width+",minmax(75px,1fr))";
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const slot=p.slots.find(s=>s.x===x&&s.y===y),b=actionButton(slot?slot.zone:"＋",()=>{if(slot){p.slots=p.slots.filter(s=>s!==slot);p.edges=p.edges.filter(e=>!e.includes(slot.zone))}else if(palette.value)p.slots.push({zone:palette.value,x,y});render("spatial")});b.setAttribute("aria-label","Cell "+x+","+y+(slot?" "+slot.zone:" empty"));b.style.minHeight="56px";if(slot)b.style.fontWeight="bold";grid.append(b)}section.append(grid);
 for(const slot of p.slots){const panel=node("fieldset");panel.append(node("legend",slot.zone));field(panel,"Slot label",slot.label??"","text",v=>slot.label=v);for(const k of ["x","y"])field(panel,"Slot "+k,slot[k],"number",v=>{slot[k]=v;render("spatial")});for(const k of ["blocked","exclusive","ownerOnly"])field(panel,k,slot[k]?"yes":"no",["yes","no"],v=>slot[k]=v==="yes");section.append(panel)}
 listEditor(section,p.edges,"Graph edge",()=>[p.slots[0]?.zone??"",p.slots[1]?.zone??""],(r,e)=>{field(r,"Edge start",e[0],p.slots.map(s=>s.zone),v=>e[0]=v);field(r,"Edge end",e[1],p.slots.map(s=>s.zone),v=>e[1]=v)},"spatial");
 section.append(actionButton("Disable spatial battlefield",()=>{delete module.spatial;render("spatial")}));
}
function objectiveEditor(section){
 if(!module.objectives){section.append(actionButton("Enable objectives",()=>{module.objectives={locations:[],tie:"draw"};render("objectives")}));return}
 const p=module.objectives;
 field(section,"Winning score (blank = none)",p.winScore??"","text",v=>{if(v==="")delete p.winScore;else p.winScore=Number(v)});
 field(section,"Score tie resolution",p.tie??"draw",["draw","highest"],v=>p.tie=v);
 p.locations??=[];listEditor(section,p.locations,"Location objective",()=>({zone:module.spatial?.slots[0]?.zone??"",capturePoints:1,holdPoints:1,persistent:true}),(r,o)=>{field(r,"Objective zone",o.zone,(module.spatial?.slots??[]).map(x=>x.zone),v=>o.zone=v);field(r,"Capture points",o.capturePoints??0,"number",v=>o.capturePoints=v);field(r,"Hold points",o.holdPoints??0,"number",v=>o.holdPoints=v);field(r,"Persistent capture",o.persistent?"yes":"no",["yes","no"],v=>o.persistent=v==="yes")},"objectives");
}
function multiplayerEditor(section){
 if(!module.multiplayer){section.append(actionButton("Enable multiplayer policies",()=>{module.multiplayer={};render("multiplayer")}));return}const p=module.multiplayer;
 field(section,"Turn order",(p.order??module.players).join(","),"text",v=>p.order=v.split(",").map(x=>x.trim()).filter(Boolean));
 for(const player of module.players)field(section,"Team "+player,p.teams?.[player]??player,"text",v=>{p.teams??=Object.fromEntries(module.players.map(x=>[x,x]));p.teams[player]=v});
}
function filterSections(){const query=$("section-search").value.trim().toLowerCase();let count=0;for(const section of $("editor-fields").querySelectorAll(":scope > details")){section.hidden=!!query&&!section.querySelector("summary").textContent.toLowerCase().includes(query);if(!section.hidden)count++}$("section-count").textContent=count+" sections shown"}
$("section-search").addEventListener("input",filterSections);$("clear-search").onclick=()=>{$("section-search").value="";filterSections();$("section-search").focus()};
function render(openKey){
 const root=$("editor-fields");root.replaceChildren();
 const label=node("label","Module name ");const input=node("input");input.value=module.name??"";input.addEventListener("input",()=>{module.name=input.value;sync()});label.append(input);root.append(label);
 for(const [key,title] of [["players","Players"],["definitions","Card definitions"],["cardPresentation","Card designer"],["keywordRules","Keywords and passives"],["declarative","Declarative rules"],["zones","Zones"],["setup","Starting cards"],["decks","Deck construction"],["deckRoles","Linked deck roles"],["stackRules","Composite cards"],["drawPolicies","Draw and mulligan policies"],["tokenPolicy","Token lifecycle"],["battlefield","Battlefield layout"],["spatial","Spatial battlefield designer"],["objectives","Objective scoring"],["multiplayer","Multiplayer policies"],["campaign","Campaign builder"],["ai","Opponent AI"],["resources","Resources"],["generators","Card resource generators"],["effects","Effects"],["triggers","Triggers"],["actionPolicy","Turn action limits"],["combat","Combat"],["attachment","Attachments"],["timing","Timing"],["scheduler","Turn scheduler"],["phases","Turn phases"],["chain","Chains"],["modifiers","Continuous modifiers"],["replacements","Damage replacements"],["victory","Victory conditions"]]){
  const section=node("details");section.open=key===openKey;section.append(node("summary",title));if(key==="actionPolicy"){const p=module.actionPolicy??={limits:{}};p.limits??={};for(const t of ["activate","attack","attach","stack","generate","declareCombat","moveSpatial"])field(section,t+" limit (blank = unlimited)",p.limits[t]??"","text",v=>{if(v==="")delete p.limits[t];else p.limits[t]=Number(v)});field(section,"Attack ends turn",p.attackEndsTurn?"yes":"no",["no","yes"],v=>p.attackEndsTurn=v==="yes");root.append(section);continue}if(key==="declarative"){declarativeEditor(section);root.append(section);continue}if(key==="objectives"){objectiveEditor(section);root.append(section);continue}if(key==="multiplayer"){multiplayerEditor(section);root.append(section);continue}if(key==="spatial"){spatialEditor(section);root.append(section);continue}if(key==="scheduler"){schedulerEditor(section);root.append(section);continue}if(key==="stackRules"){compositeEditor(section);root.append(section);continue}if(key==="deckRoles"){deckRoleEditor(section);root.append(section);continue}if(key==="generators"){module.generators??=[];listEditor(section,module.generators,"Generator",()=>({id:"generator"+(module.generators.length+1),definition:first("definitions"),zones:[first("zones")],resource:first("resourceIds"),amount:1}),(p,g)=>{field(p,"Generator ID",g.id,"text",v=>g.id=v);field(p,"Generator definition",g.definition,"definitions",v=>g.definition=v);field(p,"Generator zones",g.zones.join(","),"text",v=>g.zones=v.split(",").map(x=>x.trim()).filter(Boolean));field(p,"Generated resource",g.resource,"resourceIds",v=>g.resource=v);field(p,"Generated amount",g.amount,"number",v=>g.amount=v)},key);root.append(section);continue}if(key==="tokenPolicy"){field(section,"Remove tokens in zones (comma separated)",(module.tokenPolicy?.zones??[]).join(","),"text",v=>{module.tokenPolicy={zones:v.split(",").map(x=>x.trim()).filter(Boolean)}});root.append(section);continue}if(key==="ai"){aiEditor(section);root.append(section);continue}if(key==="keywordRules"){keywordEditor(section);root.append(section);continue}if(key==="campaign"){campaignEditor(section);root.append(section);continue}if(key==="phases"){phaseEditor(section);root.append(section);continue}if(key==="drawPolicies"){drawPolicyEditor(section);root.append(section);continue}if(key==="battlefield"){layoutEditor(section);root.append(section);continue}if(key==="decks"){deckEditor(section);root.append(section);continue}if(["attachment","timing","chain","modifiers","replacements"].includes(key)){advancedPolicies(key,section);root.append(section);continue}if(key==="cardPresentation"){cardDesigner(section);root.append(section);continue}if(fields[key]){tableEditor(key,section);root.append(section);continue}if(["effects","triggers","combat","victory"].includes(key)){advancedEditor(key,section);root.append(section);continue}const area=node("textarea");area.rows=8;area.style.width="100%";area.setAttribute("aria-label",title);area.value=JSON.stringify(module[key]??null,null,2);
  const apply=node("button","Apply "+title.toLowerCase());apply.type="button";apply.onclick=()=>{try{const v=JSON.parse(area.value);if(v===null)delete module[key];else module[key]=v;sync();status(title+" updated; validate before exporting.")}catch(e){status("Invalid JSON: "+e.message)}};section.append(area,apply);root.append(section);
 }sync();filterSections();
}
function valid(){const errors=validateModuleV2(module);if(errors.length){status(errors.join(" · "));return false}try{createMatch(module);status("Module passed structural and setup validation.");return true}catch(e){status("Setup error: "+e.message);return false}}
function load(text){try{const value=JSON.parse(text);if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Expected module object");module=value;savedId=null;render();valid()}catch(e){status("Import error: "+e.message)}}
$("reset").onclick=()=>{module=demoModule();savedId=null;render();status("Example loaded.")};
$("validate").onclick=valid;
$("apply").onclick=()=>load($("source").value);
$("import").onchange=async e=>{const file=e.target.files[0];if(file){if(file.size>1000000){status("Module exceeds 1 MB.");return}load(await file.text())}};
$("importZip").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>32*1024*1024)throw Error("ZIP exceeds size limit");const imported=await unpackPortable(await file.arrayBuffer());module=imported;savedId=null;render();status("ZIP imported and validated.")}catch(err){status("Import error: "+err.message)}finally{e.target.value=""}};
$("exportZip").onclick=async()=>{if(!valid())return;try{const blob=await packPortable(module,globalThis.JSZip,{type:"blob"}),url=URL.createObjectURL(blob),a=node("a");a.href=url;a.download="tcg-module-v2.zip";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status("ZIP exported.")}catch(err){status(err.message)}};
$("export").onclick=()=>{if(!valid())return;const url=URL.createObjectURL(new Blob([JSON.stringify(module,null,2)],{type:"application/json"}));const a=node("a");a.href=url;a.download="tcg-module-v2.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};

function libraryRefresh(){
 const select=$("library");select.replaceChildren();
 for(const item of readLibrary()){const o=node("option",item.module.name??"Untitled");o.value=item.id;select.append(o)}
 if(savedId)select.value=savedId;
}
function libraryAction(fn){try{fn()}catch(e){status("Library error: "+e.message)}}
$("loadSaved").onclick=()=>libraryAction(()=>{const item=readLibrary().find(x=>x.id===$("library").value);if(!item)throw Error("Choose a saved module");if(!confirm("Replace current draft with saved module?"))return;module=item.module;savedId=item.id;render();valid()});
$("saveSaved").onclick=()=>libraryAction(()=>{if(!valid())return;savedId=saveLibraryModule(module,savedId);libraryRefresh();status("Module saved locally.")});
$("duplicateSaved").onclick=()=>libraryAction(()=>{if(!valid())return;savedId=saveLibraryModule(module);libraryRefresh();status("Module saved as copy.")});
$("deleteSaved").onclick=()=>libraryAction(()=>{const id=$("library").value;if(!id||!confirm("Delete this saved module?"))return;deleteLibraryModule(id);if(savedId===id)savedId=null;libraryRefresh();status("Saved module deleted; current draft retained.")});
$("playCustom").onclick=()=>libraryAction(()=>{if(!valid())return;stagePlaytest(module);location.href="duel.html?custom=1"});
libraryAction(libraryRefresh);

render();
