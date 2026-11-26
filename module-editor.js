import {demoModule} from "./kernel/demo-module.js";
import {validateModuleV2} from "./kernel/module-v2.js";
import {createMatch} from "./kernel/runtime.js";
const $=id=>document.getElementById(id);
let module=demoModule();
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
function status(text){$("editor-status").textContent=text}
function sync(){ $("source").value=JSON.stringify(module,null,2); }
function render(){
 const root=$("editor-fields");root.replaceChildren();
 const label=node("label","Module name ");const input=node("input");input.value=module.name??"";input.addEventListener("input",()=>{module.name=input.value;sync()});label.append(input);root.append(label);
 for(const [key,title] of [["players","Players"],["definitions","Card definitions"],["zones","Zones"],["setup","Starting cards"],["resources","Resources"],["effects","Effects"],["triggers","Triggers"],["combat","Combat"],["attachment","Attachments"],["timing","Timing"],["chain","Chains"],["victory","Victory conditions"]]){
  const section=node("details");section.append(node("summary",title));const area=node("textarea");area.rows=8;area.style.width="100%";area.setAttribute("aria-label",title);area.value=JSON.stringify(module[key]??null,null,2);
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