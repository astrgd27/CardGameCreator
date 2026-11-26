import {validateDeck,appendDeckToSetup} from "./kernel/decks.js";
import {validateCampaign} from "./kernel/campaign.js";
import {demoModule} from "./kernel/demo-module.js";
import {validateModuleV2} from "./kernel/module-v2.js";
import {createMatch} from "./kernel/runtime.js";
import {readLibrary,saveLibraryModule,deleteLibraryModule,stagePlaytest,readPlaytest} from "./module-library.js";
let savedId=null;
const $=id=>document.getElementById(id);
let module=demoModule();
if(new URLSearchParams(location.search).has("resume")){try{module=readPlaytest()??module}catch{}}
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
   e.costs??=[];e.program??=[];
   listEditor(p,e.costs,"Cost",()=>({resource:first("resourceIds"),amount:1,kind:"spend"}),(r,c)=>{
    field(r,"Cost resource",c.resource,"resourceIds",v=>c.resource=v);field(r,"Cost amount",c.amount,"number",v=>c.amount=v);field(r,"Cost kind",c.kind,["spend","threshold"],v=>c.kind=v);
   },key);
   listEditor(p,e.program,"Operation",()=>({type:"resource",resource:first("resourceIds"),delta:1}),(r,op,i)=>{
    field(r,"Operation type",op.type,["resource","move","choose","target","draw","skipUnless","skipUnlessResource","skipUnlessChoice"],v=>{e.program[i]=v==="resource"?{type:v,resource:first("resourceIds"),delta:1}:v==="move"?{type:v,id:"c1",from:first("zones"),to:first("zones")}:v==="skipUnlessResource"?{type:v,resource:first("resourceIds"),comparison:"atLeast",amount:1,skip:1}:v==="skipUnlessChoice"?{type:v,choice:"target",value:"c1",skip:1}:v==="skipUnless"?{type:v,selector:{controller:"self"},minimum:1,skip:1}:v==="target"?{type:v,name:"target",selector:{controller:"opponent",face:"up"}}:v==="draw"?{type:v,from:first("zones"),to:options("zones")[1]??"",count:1}:{type:v,name:"target",options:["c1"]};render(key)});
    if(op.type==="resource"){field(r,"Operation resource",op.resource,"resourceIds",v=>op.resource=v);field(r,"Resource delta",op.delta,"signed",v=>op.delta=v)}
    if(op.type==="resource")field(r,"Resource overflow",op.overflow??"reject",["reject","clamp"],v=>op.overflow=v);
    if(op.type==="skipUnlessResource"){field(r,"Condition resource",op.resource,"resourceIds",v=>op.resource=v);field(r,"Comparison",op.comparison,["atLeast","atMost","equal"],v=>op.comparison=v);field(r,"Threshold",op.amount,"number",v=>op.amount=v);field(r,"Skip next operations",op.skip,"number",v=>op.skip=v)}
    if(op.type==="skipUnlessChoice"){field(r,"Prior choice name",op.choice,"text",v=>op.choice=v);field(r,"Required choice value",op.value,"text",v=>op.value=v);field(r,"Skip next operations",op.skip,"number",v=>op.skip=v)}
    if(op.type==="target"||op.type==="skipUnless"){const q=op.selector;if(op.type==="target")field(r,"Target name",op.name,"text",v=>op.name=v);else{field(r,"Minimum matching cards",op.minimum,"number",v=>op.minimum=v);field(r,"Skip next operations",op.skip,"number",v=>op.skip=v)}field(r,"Target zones (blank = visible zones)",(q.zones??[]).join(","),"text",v=>{if(v.trim())q.zones=v.split(",").map(x=>x.trim()).filter(Boolean);else delete q.zones});for(const k of ["owner","controller"])field(r,"Target "+k,q[k]??"any",["any","self","opponent"],v=>q[k]=v);field(r,"Target definition",q.definition??"",["",...(module.definitions??[])],v=>{if(v)q.definition=v;else delete q.definition});field(r,"Target face",q.face??"any",["any","up","down"],v=>{if(v==="any")delete q.face;else q.face=v});field(r,"Target orientation",q.orientation??"any",["any","ready","resting","tapped"],v=>{if(v==="any")delete q.orientation;else q.orientation=v});field(r,"Target limit",q.limit??100,"number",v=>q.limit=v)}
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
   field(p,"Trigger ID",t.id,"text",v=>t.id=v);field(p,"Event",t.event,"text",v=>t.event=v);field(p,"Actor",t.actor,"players",v=>t.actor=v);field(p,"Effect",t.effect,"effectIds",v=>t.effect=v);
   const entries=Object.entries(t.where??{});for(const [k,v] of entries){const row=panel(p,"Predicate "+k);field(row,"Predicate value",String(v),"text",x=>{t.where[k]=typeof v==="number"?Number(x):typeof v==="boolean"?x==="true":x});row.append(actionButton("Remove predicate",()=>{delete t.where[k];render(key)}))}
   p.append(actionButton("Add predicate",()=>{t.where??={};let k="id";if(Object.hasOwn(t.where,k))k="to";if(!Object.hasOwn(t.where,k))t.where[k]="";render(key)}));
  },key);
 }else if(key==="combat"){
  if(!module.combat){section.append(actionButton("Enable combat",()=>{module.combat={zones:[first("zones")],stats:{},defeatZones:{}};render(key)}));return}
  const c=module.combat;c.stats??={};c.defeatZones??={};
  field(section,"Combat zones (comma separated)",(c.zones??[]).join(","),"text",v=>c.zones=v.split(",").map(x=>x.trim()).filter(Boolean));
  field(section,"Retaliation",c.retaliate===false?"no":"yes",["yes","no"],v=>c.retaliate=v==="yes");
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
  const text=node("textarea");text.setAttribute("aria-label","Rules text "+id);text.value=data.text??"";text.rows=3;text.style.width="100%";text.oninput=()=>{data.text=text.value;sync()};p.append(text);
  const art=node("input");art.type="file";art.accept="image/png,image/jpeg,image/webp";art.setAttribute("aria-label","Artwork "+id);
  const preview=node("img");preview.alt="Card artwork "+id;preview.style.cssText="display:block;max-width:180px;max-height:240px;object-fit:contain";
  if(/^data:image\/(png|jpeg|webp);base64,/.test(data.art??""))preview.src=data.art;else preview.hidden=true;
  art.onchange=async()=>{try{const file=art.files[0];if(!file)return;if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>400000)throw Error("Choose a PNG, JPEG or WebP under 400 KB.");const reader=new FileReader();reader.onload=()=>{data.art=String(reader.result);preview.src=data.art;preview.hidden=false;sync()};reader.onerror=()=>status("Artwork read failed");reader.readAsDataURL(file)}catch(e){status(e.message)}};
  p.append(art,preview,actionButton("Remove artwork",()=>{delete data.art;preview.removeAttribute("src");preview.hidden=true;sync()}));
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
  field(section,"Attachment zones",(a.zones??[]).join(","),"text",v=>a.zones=csv(v));
  field(section,"Equipment definitions",(a.definitions??[]).join(","),"text",v=>a.definitions=csv(v));
  field(section,"Maximum attachments",a.max??1,"number",v=>a.max=v);
  field(section,"Host movement",a.onHostMove??"detach",["detach","follow","reject"],v=>a.onHostMove=v);disable();
 }else if(key==="timing"){
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
    field(p,"Modifier value",r.value,"signed",v=>r.value=v);
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
 section.append(actionButton("Open visual deck workshop",()=>{try{stagePlaytest(module);location.href="deck-workshop.html"}catch(e){status(e.message)}}));
 module.deckRules??={min:1,max:40,copies:4};module.decks??=[];
 const rules=module.deckRules;
 field(section,"Minimum deck size",rules.min,"number",v=>rules.min=v);
 field(section,"Maximum deck size",rules.max,"number",v=>rules.max=v);
 field(section,"Maximum copies",rules.copies,"number",v=>rules.copies=v);
 section.append(node("p","Decks can be saved with the module. Append a deck to starting setup explicitly; this preserves existing card instance IDs and order."));
 listEditor(section,module.decks,"Deck",()=>({name:"New deck",player:first("players"),zone:module.zones.find(z=>z.owner===first("players"))?.id??"",cards:[]}),(p,d)=>{
  field(p,"Deck name",d.name,"text",v=>d.name=v);
  field(p,"Deck player",d.player,"players",v=>{d.player=v;d.zone=module.zones.find(z=>z.owner===v)?.id??"";render("decks")});
  field(p,"Deck destination",d.zone,module.zones.filter(z=>z.owner===d.player).map(z=>z.id),v=>d.zone=v);
  d.cards??=[];
  listEditor(p,d.cards,"Deck card",()=>({definition:module.definitions.find(id=>!d.cards.some(c=>c.definition===id))??first("definitions"),count:1}),(r,c)=>{
   field(r,"Deck card definition",c.definition,"definitions",v=>c.definition=v);field(r,"Copies",c.count,"number",v=>c.count=v);
  },"decks");
  const result=node("p");result.setAttribute("role","status");p.append(result);
  p.append(actionButton("Validate deck",()=>{const errors=validateDeck(module,d);result.textContent=errors.length?errors.join(" · "):"Deck is legal."}));
  p.append(actionButton("Append deck to starting setup",()=>{try{const next=appendDeckToSetup(module,d);createMatch(next);module=next;render("decks");status("Deck appended to starting setup.")}catch(e){status(e.message)}}));
 },"decks");
}


function drawPolicyEditor(section){
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
  field(p,"Cards lost per mulligan",d.mulliganPenalty??0,"number",v=>d.mulliganPenalty=v);
 },"drawPolicies");
}
function layoutEditor(section){
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
  field(p,"Phase ID",r.id,"text",v=>r.id=v);
  for(const action of ["activate","attack","attach"])field(p,"Allow "+action,r.actions.includes(action)?"yes":"no",["yes","no"],v=>{r.actions=r.actions.filter(a=>a!==action);if(v==="yes")r.actions.push(action)});
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

function render(openKey){
 const root=$("editor-fields");root.replaceChildren();
 const label=node("label","Module name ");const input=node("input");input.value=module.name??"";input.addEventListener("input",()=>{module.name=input.value;sync()});label.append(input);root.append(label);
 for(const [key,title] of [["players","Players"],["definitions","Card definitions"],["cardPresentation","Card designer"],["zones","Zones"],["setup","Starting cards"],["decks","Deck construction"],["drawPolicies","Draw and mulligan policies"],["battlefield","Battlefield layout"],["campaign","Campaign builder"],["resources","Resources"],["effects","Effects"],["triggers","Triggers"],["combat","Combat"],["attachment","Attachments"],["timing","Timing"],["phases","Turn phases"],["chain","Chains"],["modifiers","Continuous modifiers"],["replacements","Damage replacements"],["victory","Victory conditions"]]){
  const section=node("details");section.open=key===openKey;section.append(node("summary",title));if(key==="campaign"){campaignEditor(section);root.append(section);continue}if(key==="phases"){phaseEditor(section);root.append(section);continue}if(key==="drawPolicies"){drawPolicyEditor(section);root.append(section);continue}if(key==="battlefield"){layoutEditor(section);root.append(section);continue}if(key==="decks"){deckEditor(section);root.append(section);continue}if(["attachment","timing","chain","modifiers","replacements"].includes(key)){advancedPolicies(key,section);root.append(section);continue}if(key==="cardPresentation"){cardDesigner(section);root.append(section);continue}if(fields[key]){tableEditor(key,section);root.append(section);continue}if(["effects","triggers","combat","victory"].includes(key)){advancedEditor(key,section);root.append(section);continue}const area=node("textarea");area.rows=8;area.style.width="100%";area.setAttribute("aria-label",title);area.value=JSON.stringify(module[key]??null,null,2);
  const apply=node("button","Apply "+title.toLowerCase());apply.type="button";apply.onclick=()=>{try{const v=JSON.parse(area.value);if(v===null)delete module[key];else module[key]=v;sync();status(title+" updated; validate before exporting.")}catch(e){status("Invalid JSON: "+e.message)}};section.append(area,apply);root.append(section);
 }sync();
}
function valid(){const errors=validateModuleV2(module);if(errors.length){status(errors.join(" · "));return false}try{createMatch(module);status("Module passed structural and setup validation.");return true}catch(e){status("Setup error: "+e.message);return false}}
function load(text){try{const value=JSON.parse(text);if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Expected module object");module=value;savedId=null;render();valid()}catch(e){status("Import error: "+e.message)}}
$("reset").onclick=()=>{module=demoModule();savedId=null;render();status("Example loaded.")};
$("validate").onclick=valid;
$("apply").onclick=()=>load($("source").value);
$("import").onchange=async e=>{const file=e.target.files[0];if(file){if(file.size>1000000){status("Module exceeds 1 MB.");return}load(await file.text())}};
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
