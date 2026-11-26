import {demoModule} from "./kernel/demo-module.js";
import {validateModuleV2} from "./kernel/module-v2.js";
import {createMatch} from "./kernel/runtime.js";
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
 return null;
}
function fieldControl(label,value,kind,change){
 const opts=options(kind),input=node(opts?"select":"input");
 input.setAttribute("aria-label",label);
 if(opts){
  const values=[...opts];if(!values.includes(value))values.unshift(value??"");
  for(const v of values){const o=node("option",v===null?"Shared":String(v));o.value=v===null?"":String(v);input.append(o)}
  input.value=value??"";
 }else{input.type=kind==="number"?"number":"text";if(kind==="number"){input.min="0";input.step="1"}input.value=value??""}
 input.onchange=()=>change(kind==="number"?Number(input.value):kind==="owner"&&input.value===""?null:input.value);
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

function render(openKey){
 const root=$("editor-fields");root.replaceChildren();
 const label=node("label","Module name ");const input=node("input");input.value=module.name??"";input.addEventListener("input",()=>{module.name=input.value;sync()});label.append(input);root.append(label);
 for(const [key,title] of [["players","Players"],["definitions","Card definitions"],["zones","Zones"],["setup","Starting cards"],["resources","Resources"],["effects","Effects"],["triggers","Triggers"],["combat","Combat"],["attachment","Attachments"],["timing","Timing"],["chain","Chains"],["victory","Victory conditions"]]){
  const section=node("details");section.open=key===openKey;section.append(node("summary",title));if(fields[key]){tableEditor(key,section);root.append(section);continue}const area=node("textarea");area.rows=8;area.style.width="100%";area.setAttribute("aria-label",title);area.value=JSON.stringify(module[key]??null,null,2);
  const apply=node("button","Apply "+title.toLowerCase());apply.type="button";apply.onclick=()=>{try{const v=JSON.parse(area.value);if(v===null)delete module[key];else module[key]=v;sync();status(title+" updated; validate before exporting.")}catch(e){status("Invalid JSON: "+e.message)}};section.append(area,apply);root.append(section);
 }sync();
}
function valid(){const errors=validateModuleV2(module);if(errors.length){status(errors.join(" · "));return false}try{createMatch(module);status("Module passed structural and setup validation.");return true}catch(e){status("Setup error: "+e.message);return false}}
function load(text){try{const value=JSON.parse(text);if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Expected module object");module=value;render();valid()}catch(e){status("Import error: "+e.message)}}
$("reset").onclick=()=>{module=demoModule();render();status("Example loaded.")};
$("validate").onclick=valid;
$("apply").onclick=()=>load($("source").value);
$("import").onchange=async e=>{const file=e.target.files[0];if(file){if(file.size>1000000){status("Module exceeds 1 MB.");return}load(await file.text())}};
$("export").onclick=()=>{if(!valid())return;const url=URL.createObjectURL(new Blob([JSON.stringify(module,null,2)],{type:"application/json"}));const a=node("a");a.href=url;a.download="tcg-module-v2.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
render();