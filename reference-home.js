import {referenceModules} from "./reference-modules.js";
import {stagePlaytest,saveLibraryModule} from "./module-library.js";
import {packPortable} from "./portable-modules.js";
const root=document.querySelector("#reference-library");
const make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n};
root.append(make("h2","Reference games"),make("p","Editable original games using the generalized rules engine. These are development modules, not finished commercial games."));
const status=make("p");status.setAttribute("role","status");
const grid=make("div");grid.className="stack";
for(const m of referenceModules()){
 const section=make("section");section.className="box";
 section.append(make("h3",m.name),make("p",m.referenceDescription??m.description));
 const actions=make("div");actions.className="pieces";
 for(const [label,url] of [["Play","play.html"],["Edit","module-editor.html?resume=1"]]){
  const b=make("button",label);b.setAttribute("aria-label",label+" "+m.name);
  b.onclick=()=>{try{stagePlaytest(m);location.href=url}catch(e){status.textContent=e.message}};actions.append(b);
 }
 const copy=make("button","Save editable copy");copy.onclick=()=>{try{saveLibraryModule(m);location.reload()}catch(e){status.textContent=e.message}};actions.append(copy);
 const b=make("button","Export ZIP");b.setAttribute("aria-label","Export "+m.name);
 b.onclick=async()=>{try{const blob=await packPortable(m,globalThis.JSZip,{type:"blob"}),url=URL.createObjectURL(blob),a=make("a");a.href=url;a.download=m.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")+".zip";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=m.name+" exported."}catch(e){status.textContent=e.message}};actions.append(b);section.append(actions);grid.append(section);
}
root.append(grid,status);
