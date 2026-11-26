import {demoModule} from "./kernel/demo-module.js";
import {validateModuleV2} from "./kernel/module-v2.js";
import {createMatch} from "./kernel/runtime.js";
import {readLibrary,saveLibraryModule,deleteLibraryModule,stagePlaytest} from "./module-library.js";
let savedId=null;
const $=id=>document.getElementById(id);
let module=demoModule();
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
   e.costs??=[];e.program??=[];
   listEditor(p,e.costs,"Cost",()=>({resource:first("resourceIds"),amount:1,kind:"spend"}),(r,c)=>{
    field(r,"Cost resource",c.resource,"resourceIds",v=>c.resource=v);field(r,"Cost amount",c.amount,"number",v=>c.amount=v);field(r,"Cost kind",c.kind,["spend","threshold"],v=>c.kind=v);
   },key);
   listEditor(p,e.program,"Operation",()=>({type:"resource",resource:first("resourceIds"),delta:1}),(r,op,i)=>{
    field(r,"Operation type",op.type,["resource","move","choose"],v=>{e.program[i]=v==="resource"?{type:v,resource:first("resourceIds"),delta:1}:v==="move"?{type:v,id:"c1",from:first("zones"),to:first("zones")}:{type:v,name:"target",options:["c1"]};render(key)});
    if(op.type==="resource"){field(r,"Operation resource",op.resource,"resourceIds",v=>op.resource=v);field(r,"Resource delta",op.delta,"signed",v=>op.delta=v)}
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

function render(openKey){
 const root=$("editor-fields");root.replaceChildren();
 const label=node("label","Module name ");const input=node("input");input.value=module.name??"";input.addEventListener("input",()=>{module.name=input.value;sync()});label.append(input);root.append(label);
 for(const [key,title] of [["players","Players"],["definitions","Card definitions"],["zones","Zones"],["setup","Starting cards"],["resources","Resources"],["effects","Effects"],["triggers","Triggers"],["combat","Combat"],["attachment","Attachments"],["timing","Timing"],["chain","Chains"],["victory","Victory conditions"]]){
  const section=node("details");section.open=key===openKey;section.append(node("summary",title));if(fields[key]){tableEditor(key,section);root.append(section);continue}if(["effects","triggers","combat","victory"].includes(key)){advancedEditor(key,section);root.append(section);continue}const area=node("textarea");area.rows=8;area.style.width="100%";area.setAttribute("aria-label",title);area.value=JSON.stringify(module[key]??null,null,2);
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
