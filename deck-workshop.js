import {readPlaytest,stagePlaytest} from "./module-library.js";
import {demoModule} from "./kernel/demo-module.js";
import {validateDeck} from "./kernel/decks.js";
const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
let module;
try{module=readPlaytest()??demoModule()}catch{module=demoModule()}
module.decks??=[];module.deckRules??={min:1,max:40,copies:4};
let index=0;
const status=text=>$("deck-error").textContent=text;
const current=()=>module.decks[index];
const name=id=>module.cardPresentation?.[id]?.name||id;
const type=id=>module.cardPresentation?.[id]?.type||"Unclassified";
const stat=(id,k)=>module.combat?.stats?.[id]?.[k]??0;
const total=d=>(d?.cards??[]).reduce((n,c)=>n+c.count,0);
function select(el,items,value){el.replaceChildren();for(const [v,t] of items){const o=node("option",t);o.value=v;el.append(o)}el.value=String(value??"")}
function fresh(){const player=module.players[0];return {name:"New deck",player,zone:module.zones.find(z=>z.owner===player)?.id??"",cards:[]}}
function button(label,fn){const b=node("button",label);b.type="button";b.onclick=fn;return b}
function add(id,delta){const d=current();if(!d||!module.definitions.includes(id))return;const r=d.cards.find(c=>c.definition===id),n=(r?.count??0)+delta;if(delta>0&&(n>(module.deckRules.copies??4)||total(d)>=(module.deckRules.max??100))){status("Deck limit reached.");return}if(n<=0){d.cards=d.cards.filter(c=>c.definition!==id)}else if(r)r.count=n;else d.cards.push({definition:id,count:n});status("");render()}
function renderGallery(){
 const q=$("card-search").value.toLowerCase().trim(),filter=$("type-filter").value,sort=$("card-sort").value;
 const ids=module.definitions.filter(id=>[name(id),id,type(id),module.cardPresentation?.[id]?.text??""].join(" ").toLowerCase().includes(q)&&(!filter||type(id)===filter));
 ids.sort((a,b)=>sort==="name"?name(a).localeCompare(name(b)):stat(b,sort)-stat(a,sort)||name(a).localeCompare(name(b)));
 const gallery=$("card-gallery");gallery.replaceChildren();
 for(const id of ids){const p=node("article");p.className="gallery-card";p.draggable=true;p.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",id));const art=module.cardPresentation?.[id]?.art;if(/^data:image\/(png|jpeg|webp);base64,/.test(art??"")){const img=node("img");img.src=art;img.alt="";p.append(img)}else{const icon=node("div","◆");icon.className="gallery-art";p.append(icon)}p.append(node("strong",name(id)),node("p",type(id)),node("p",module.combat?.stats?.[id]?stat(id,"attack")+" ATK · "+stat(id,"health")+" HP":""),node("p",module.cardPresentation?.[id]?.text??""));const b=button("Add "+name(id),()=>add(id,1));b.disabled=!current();p.append(b);gallery.append(p)}
}
function render(){
 select($("deck-select"),module.decks.map((d,i)=>[i,d.name]),index);const d=current();$("deck-name").value=d?.name??"";select($("deck-player"),module.players.map(p=>[p,p]),d?.player);select($("deck-zone"),module.zones.filter(z=>z.owner===d?.player).map(z=>[z.id,z.id]),d?.zone);
 for(const id of ["deck-name","deck-player","deck-zone","deck-copy","deck-remove","deck-validate"])$(id).disabled=!d;
 const list=$("deck-list");list.replaceChildren();
 for(const row of d?.cards??[]){const r=node("div");r.className="deck-row";r.append(node("span",name(row.definition)),node("strong",String(row.count)),button("−",()=>add(row.definition,-1)),button("+",()=>add(row.definition,1)));r.lastChild.setAttribute("aria-label","Add copy of "+name(row.definition));r.children[2].setAttribute("aria-label","Remove copy of "+name(row.definition));list.append(r)}
 const n=total(d),types={};for(const r of d?.cards??[])types[type(r.definition)]=(types[type(r.definition)]??0)+r.count;
 $("deck-stats").textContent=n+" cards · "+(d?.cards?.length??0)+" unique\n"+Object.entries(types).map(([k,v])=>k+": "+v).join(" · ")+"\nLimits: "+(module.deckRules.min??1)+"–"+(module.deckRules.max??100)+" cards, "+(module.deckRules.copies??4)+" copies";
 renderGallery();
}
$("deck-module").textContent=module.name;
select($("type-filter"),[["","All types"],...[...new Set(module.definitions.map(type))].sort().map(t=>[t,t])],"");
for(const id of ["card-search","type-filter","card-sort"])$(id).addEventListener("input",renderGallery);
$("deck-select").onchange=()=>{index=Number($("deck-select").value);render()};
$("deck-new").onclick=()=>{module.decks.push(fresh());index=module.decks.length-1;render()};
$("deck-copy").onclick=()=>{if(!current())return;module.decks.push({...structuredClone(current()),name:current().name+" copy"});index=module.decks.length-1;render()};
$("deck-remove").onclick=()=>{if(current()&&confirm("Delete this deck?")){module.decks.splice(index,1);index=Math.max(0,index-1);render()}};
$("deck-name").onchange=()=>{if(current()){current().name=$("deck-name").value;render()}};
$("deck-player").onchange=()=>{if(current()){current().player=$("deck-player").value;current().zone=module.zones.find(z=>z.owner===current().player)?.id??"";render()}};
$("deck-zone").onchange=()=>{if(current())current().zone=$("deck-zone").value};
$("deck-validate").onclick=()=>{const errors=validateDeck(module,current());status(errors.length?errors.join(" · "):"Deck is legal.")};
$("deck-done").onclick=()=>{try{stagePlaytest(module);location.href="module-editor.html?resume=1"}catch(e){status(e.message)}};
const panel=document.querySelector(".deck-panel");panel.ondragover=e=>{e.preventDefault();panel.classList.add("drag-over")};panel.ondragleave=()=>panel.classList.remove("drag-over");panel.ondrop=e=>{e.preventDefault();panel.classList.remove("drag-over");add(e.dataTransfer.getData("text/plain"),1)};
render();
