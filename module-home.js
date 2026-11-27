import {referenceModules} from "./reference-modules.js";
import {readLibrary,saveLibraryModule,deleteLibraryModule,stagePlaytest} from "./module-library.js";
import {packPortable,unpackPortable,validatePortable} from "./portable-modules.js";
const $=id=>document.getElementById(id),node=(tag,t)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;return n};
const status=t=>$("status").textContent=t;
function button(text,fn){const b=node("button",text);b.onclick=async()=>{try{await fn()}catch(e){status(e.message)}};return b}
function render(){const root=$("modules");root.replaceChildren();for(const item of readLibrary()){
 const m=item.module,p=node("section");p.append(node("h2",m.name??"Untitled"),node("p",m.definitions.length+" card definitions · "+m.players.length+" seats"));
 function open(path){stagePlaytest(validatePortable(m));location.href=path}
 p.append(button("Edit",()=>open("module-editor.html?resume=1&saved="+encodeURIComponent(item.id))),button("Decks",()=>open("deck-workshop.html?saved="+encodeURIComponent(item.id))),button("Play",()=>open("play.html")),button("Duplicate",()=>{saveLibraryModule(m);render()}),button("Export ZIP",async()=>{const blob=await packPortable(m,globalThis.JSZip,{type:"blob"}),url=URL.createObjectURL(blob),a=node("a");a.href=url;a.download="tcg-module-v2.zip";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}),button("Delete",()=>{if(confirm("Delete saved module?")){deleteLibraryModule(item.id);render()}}));root.append(p)
 }if(!root.children.length)root.append(node("p","No saved generalized modules yet."))}
 $("zip").onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>32*1024*1024)throw Error("ZIP exceeds size limit");saveLibraryModule(await unpackPortable(await f.arrayBuffer()));render();status("Imported as a new saved module.")}catch(err){status(err.message)}finally{e.target.value=""}};
try{render()}catch(e){status(e.message)}
