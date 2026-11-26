import {benchmarks,catalogVersion} from "./benchmarks.js";
import {fixtures} from "./compatibility-fixtures.js";
import * as runtime from "./kernel/runtime.js";
import {packPortable,unpackPortable} from "./portable-modules.js";
const $=id=>document.getElementById(id),node=(tag,t)=>{const n=document.createElement(tag);n.textContent=t??"";return n};
const evidence=await fetch("./benchmarks/evidence.json").then(r=>{if(!r.ok)throw Error("Evidence unavailable");return r.json()}).catch(()=>null);
const root=$("catalog");
for(const game of [...new Set(benchmarks.map(b=>b.game))]){
 const group=node("section");group.append(node("h3",game));for(const category of ["rules","design","logic"]){
 const cases=benchmarks.filter(b=>b.game===game&&b.category===category);
 const accepted=evidence?.catalogVersion===catalogVersion?evidence.cases??{}:{};
 group.append(node("p",category+": "+cases.length+" cases · "+cases.filter(c=>accepted[c.id]).length+" evidence records (not independently verified)"));
 for(const c of cases)group.append(node("p",c.id+" — "+c.title+" — "+(accepted[c.id]?"Evidence recorded":"Pending")));
 }root.append(group)
}
$("run").onclick=async()=>{const b=$("run");b.disabled=true;$("fixtures").replaceChildren();let passed=0;try{for(const f of fixtures){try{const m=f.make();f.run(m,runtime);f.run(await unpackPortable(await packPortable(m)),runtime);passed++;$("fixtures").append(node("p",f.game+" — "+f.title+": fixture passed (partial only)"))}catch(e){$("fixtures").append(node("p",f.game+" — fixture failed: "+e.message))}}$("status").textContent=passed+"/"+fixtures.length+" micro-fixtures passed in this browser. Catalog scores unchanged."}finally{b.disabled=false}};
