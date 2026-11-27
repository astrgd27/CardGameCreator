import {referenceModules} from "./reference-modules.js";
import {readLibrary, saveLibraryModule, stagePlaytest} from "./module-library.js";
import {makeBasic,compileBasic} from "./basic-module.js";
import {createMatch} from "./kernel/runtime.js";
import {appendDeckGroup,validateDeck} from "./kernel/decks.js";
import {packPortable,unpackPortable,validatePortable} from "./portable-modules.js";

const root=document.querySelector("#app");
const query=new URLSearchParams(location.search);
const saved=query.get("saved");
const references=referenceModules();
const draftKey=saved&&"tcg-draft-"+saved;
const node=(tag,text,cls)=>{
 const el=document.createElement(tag);
 if(text!==undefined)el.textContent=text;
 if(cls)el.className=cls;
 return el;
};
function button(text,action,cls){
 const el=node("button",text,cls);
 el.onclick=async()=>{try{await action()}catch(error){report(error.message,true)}};
 return el;
}
function link(text,href,cls="button"){
 const el=node("a",text,cls);
 el.href=href;
 return el;
}
const route=(screen,id=saved)=>"index.html?view="+screen+(id?"&saved="+encodeURIComponent(id):"");
const hub=()=>saved?route("hub"):route("hub",null)+"&game="+query.get("game");
const report=(text,bad=false)=>{
 let status=root.querySelector(".status");
 if(!status){status=node("p","","status");status.setAttribute("role","status");root.append(status)}
 status.textContent=text;
 status.classList.toggle("bad",bad);
};
function title(heading,description,actions){
 const wrap=node("section",undefined,"intro");
 const copy=node("div");
 copy.append(node("h1",heading),node("p",description));
 wrap.append(copy);
 if(actions)wrap.append(actions);
 root.append(wrap);
}
function field(parent,label,value,options={}){
 const wrap=node("label",label,"field");
 const input=node(options.items?"select":options.multiline?"textarea":"input");
 input.setAttribute("aria-label",label);
 if(options.items)for(const [key,text] of options.items){const option=node("option",text);option.value=key;input.append(option)}
 else if(!options.multiline)input.type=options.type??"text";
 if(options.min!==undefined)input.min=options.min;
 if(options.max!==undefined)input.max=options.max;
 if(options.maxLength)input.maxLength=options.maxLength;
 input.value=value??"";
 if(options.change){
  const update=()=>options.change(input.type==="number"?input.valueAsNumber:input.value);
  if(options.live)input.oninput=update;else input.onchange=update;
 }
 wrap.append(input);
 parent.append(wrap);
 return input;
}
function artwork(parent,p,tone,large=false,bundled){
 const art=node("div",undefined,large?"cover large":"cover");
 art.style.setProperty("--tone",tone);
 if(bundled||/^data:image\/(png|jpeg|webp);base64,/i.test(p?.art??"")){
  const img=node("img");img.alt="";img.src=bundled??p.art;art.append(img);
 }else art.textContent=p?.symbol??"◆";
 parent.append(art);
}
const tones=["#377a72","#455f99","#9e6550","#87517c","#676b3d"];
const covers=["looboo","crystal-circuit","taste-dimension","ringworld-rumble","generation-wars"].map(file=>"art/"+file+".webp");
const artOf=m=>Object.values(m.cardPresentation??{})[0];
function moduleTile(m,url,tone,status,cover){
 const tile=node("article",undefined,"tile");
 artwork(tile,artOf(m),tone,false,cover);
 const info=node("div");
 info.append(node("small",status,"eyebrow"),node("h3",m.name||"Untitled module"),node("p",m.description??m.referenceDescription??""),link("Open "+(m.name||"module"),url));
 tile.append(info);
 return tile;
}
function library(){
 const actions=node("div",undefined,"actions");
 const uploader=node("input");
 uploader.type="file";uploader.accept=".zip";uploader.hidden=true;uploader.setAttribute("aria-label","Portable module ZIP");
 uploader.onchange=async()=>{
  const file=uploader.files[0];
  if(!file)return;
  try{
   if(file.size>32*1024*1024)throw Error("This ZIP exceeds the 32 MB limit.");
   const module=await unpackPortable(await file.arrayBuffer());
   location.href=route("hub",saveLibraryModule(module));
  }catch(error){report("Import failed. "+error.message,true)}
  finally{uploader.value=""}
 };
 actions.append(link("New module",route("new",null),"button primary"),button("Import ZIP",()=>uploader.click()),uploader);
 title("Game library","Choose a game to play, or build an original card game in the Workshop.",actions);
 const grid=node("div",undefined,"grid reference-grid");
 references.forEach((m,i)=>grid.append(moduleTile(m,"index.html?view=hub&game="+i,tones[i],"Playable · reference game",covers[i])));
 root.append(node("h2","Built-in games"),grid,node("h2","Your modules"));
 const userGrid=node("div",undefined,"grid");
 for(const {id,module} of readLibrary()){
  const incomplete=!module.definitions.length||deckSlots(module).some(slot=>!slot.some(deck=>!validateDeck(module,deck).length));
  userGrid.append(moduleTile(module,route("hub",id),tones[0],incomplete?"Incomplete checkpoint":"Saved locally"));
 }
 root.append(userGrid);
 if(!userGrid.children.length)userGrid.append(node("p","Create or import a module to add it to your library."));
 report("");
}
async function inlineArt(url){
 try{
  const response=await fetch(url);
  if(!response.ok)return null;
  const blob=await response.blob();
  return await new Promise((resolve,reject)=>{
   const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);
  });
 }catch{return null}
}
function wizard(){
 title("New module","Start with an editable duel or build your card collection from scratch.");
 const form=node("form",undefined,"panel");
 const name=field(form,"Module name","",{maxLength:80});
 name.required=true;
 const template=field(form,"Starting layout","duel",{items:[["duel","Creature duel · sample cards and decks"],["lanes","Two battlefield lanes · sample cards and decks"],["blank","Blank card collection · empty decks"]]});
 const life=field(form,"Starting life",12,{type:"number",min:1,max:100});
 const energy=field(form,"Energy per turn",3,{type:"number",min:0,max:10});
 life.required=true;energy.required=true;
 const submit=node("button","Open Workshop","primary");
 form.append(submit);
 form.onsubmit=async e=>{
  e.preventDefault();
  if(!name.value.trim()){report("Enter a module name.",true);return}
  try{
   submit.disabled=true;
   const m=makeBasic(name.value.trim(),template.value);
   if(m.cardPresentation.guardian){
    const art=await inlineArt("art/woodland-guardian.webp");
    if(art)m.cardPresentation.guardian.art=art;
   }
   m.resources[0].initial=m.resources[0].max=life.valueAsNumber;
   m.resources[1].initial=m.resources[1].refresh=energy.valueAsNumber;
   location.href=route("workshop",saveLibraryModule(m));
  }catch(error){submit.disabled=false;report(error.message,true)}
 };
 root.append(form);
}
function deckSlots(m){
 const slots=new Map();
 for(const deck of m.decks??[]){
  const key=JSON.stringify([deck.player,deck.role??deck.zone]);
  if(!slots.has(key))slots.set(key,[]);
  slots.get(key).push(deck);
 }
 return [...slots.values()];
}
function prepare(m,decks){
 let compiled=compileBasic(m);
 if(decks.length){
  const replaced=new Set(decks.map(d=>d.zone));
  compiled.setup=(compiled.setup??[]).filter(card=>!replaced.has(card.zone));
  for(const player of compiled.players)compiled=appendDeckGroup(compiled,decks,player);
  for(const policy of compiled.drawPolicies??[]){
   const count=compiled.setup.filter(card=>card.zone===policy.deck).length;
   if(count<policy.opening)throw Error("A selected deck is too small for its opening hand. Add copies or reduce the opening hand in Workshop.");
  }
 }
 validatePortable(compiled);
 const match=createMatch(compiled);
 if(match.result)throw Error("The match ends during setup. Check starting cards and victory rules in Workshop.");
 if(!compiled.objectives&&!compiled.victory?.length&&!compiled.drawPolicies?.some(p=>p.exhaustion==="lose")&&!compiled.combat?.group?.lifeCards)throw Error("Add a victory condition before starting a match.");
 return compiled;
}
function download(m){
 return packPortable(m.decks?.length?prepare(m,deckSlots(m).map(decks=>decks[0])):compileBasic(m),globalThis.JSZip,{type:"blob"}).then(blob=>{
  const url=URL.createObjectURL(blob);
  const a=node("a");a.href=url;a.download=(m.name||"module").replace(/[^a-z0-9]+/gi,"-")+".zip";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
}
function setup(m,playtest=false,returnPath=hub()){
 root.replaceChildren();
 title(playtest?"Playtest setup":"Match setup",m.name);
 const form=node("form",undefined,"panel");
 const slots=deckSlots(m);
 const select=slots.map((decks,i)=>field(form,(decks[0].player===m.players[0]?"Your deck":"Opponent deck")+(decks[0].role?" · "+decks[0].role:""),0,{items:decks.map((d,j)=>[j,d.name])}));
 if(!select.length)form.append(node("p","This game supplies its own starting decks and cards."));
 const firstPlayer=m.basicDuel?field(form,"First player","you",{items:[["you","You"],["rival","Opponent"]]}):null;
 const difficulty=field(form,"Opponent difficulty","standard",{items:[["relaxed","Relaxed"],["standard","Standard"]]});
 const speed=field(form,"Animation speed","normal",{items:[["normal","Normal"],["fast","Fast"],["reduced","Reduced motion"]]});
 const seed=playtest?field(form,"Replay seed",1,{type:"number",min:0,max:4294967295}):null;
 const actions=node("div",undefined,"actions");
 actions.append(node("button","Start match","primary"),link(playtest?"Back to Workshop":"Back to module",returnPath));
 form.append(actions);
 form.onsubmit=e=>{
  e.preventDefault();
  try{
   const compiled=prepare(m,slots.map((decks,i)=>decks[Number(select[i].value)]));
   if(firstPlayer)compiled.timing={...compiled.timing,active:firstPlayer.value==="rival"?compiled.players[1]:compiled.players[0]};
   stagePlaytest(compiled);
   sessionStorage.setItem("tcg-match-options",JSON.stringify({returnPath,playtest,difficulty:difficulty.value,speed:speed.value,seed:seed?.valueAsNumber??crypto.getRandomValues(new Uint32Array(1))[0]}));
   location.href="play.html?configured=1";
  }catch(error){report(error.message,true)}
 };
 root.append(form);
}
function moduleHub(m){
 const actions=node("div",undefined,"actions");
 actions.append(button("Card Battle",()=>setup(m),"primary"),saved?link("Workshop",route("workshop")):button("Open editable copy",()=>{location.href=route("workshop",saveLibraryModule(m))}),button("Export ZIP",()=>download(m)));
 title(m.name,m.description??m.referenceDescription??"",actions);
 artwork(root,artOf(m),tones[Number(query.get("game"))%tones.length]??tones[0],true);
 const sections=node("div",undefined,"columns");
 const decks=node("section",undefined,"panel");
 decks.append(node("h2","Deck collection"));
 for(const d of m.decks??[])decks.append(node("p",d.name+" · "+d.cards.reduce((n,c)=>n+c.count,0)+" cards"));
 if(!m.decks?.length)decks.append(node("p","Starting cards are supplied by the module."));
 const rules=node("section",undefined,"panel");
 rules.append(node("h2","Rules"),node("p",m.players.length+" seats · "+m.definitions.length+" card designs"));
 if(m.objectives)rules.append(node("p","Win by completing the game’s scoring objectives."));
 if(m.victory?.length)rules.append(node("p","Win when your rival loses their last life or their required cards."));
 if(m.drawPolicies?.some(p=>p.exhaustion==="lose"))rules.append(node("p","A player loses if they cannot draw a required card."));
 sections.append(decks,rules);root.append(sections);
}
function workshop(checkpoint){
 let draft=JSON.parse(localStorage.getItem(draftKey)??"null")??structuredClone(checkpoint);
 let tab=["Overview","Cards","Decks","Board","Rules"].includes(query.get("tab"))?query.get("tab"):"Overview";
 let cardId=draft.definitions.includes(query.get("card"))?query.get("card"):draft.definitions[0];
 let deckIndex=Math.max(0,Number(query.get("deck"))||0),search="";
 const past=[],future=[];
 let unsaved=false,refreshDetails;
 addEventListener("beforeunload",event=>{if(unsaved){event.preventDefault();event.returnValue=""}});
 function persist(){
  try{localStorage.setItem(draftKey,JSON.stringify(draft));unsaved=false;return true}
  catch(error){unsaved=true;report("Draft could not autosave. "+error.message,true);return false}
 }
 function edit(change,redraw=true){
  past.push(structuredClone(draft));
  if(past.length>40)past.shift();
  future.length=0;
  change(draft);
  const stored=persist();
  if(redraw)render();
  else{root.querySelector(".undo").disabled=false;root.querySelector(".redo").disabled=true;refreshDetails?.()}
  report(stored?"Draft autosaved.":"Draft could not autosave. Browser storage may be full.",!stored);
 }
 function restore(from,to){
  if(!from.length)return;
  to.push(draft);draft=from.pop();
  const stored=persist();render();
  report(stored?"Draft autosaved.":"Draft could not autosave.",!stored);
 }
 const number=(parent,label,value,min,max,change)=>field(parent,label,value,{type:"number",min,max,live:true,change:v=>{if(Number.isInteger(v)&&v>=min&&v<=max)edit(m=>change(m,v),false);else report(label+" must be between "+min+" and "+max+".",true)}});
 function overview(panel){
  field(panel,"Module name",draft.name,{maxLength:80,change:v=>edit(m=>m.name=v,false)});
  field(panel,"Description",draft.description,{multiline:true,change:v=>edit(m=>m.description=v,false)});
  panel.append(node("p",draft.players.length+" players · "+draft.definitions.length+" card designs · "+(draft.decks?.length??0)+" decks"));
  panel.append(node("h2","Get ready to play"),node("p","Create your cards, fill both decks, then validate the draft and start a playtest."));
 }
 function cards(panel){
  const columns=node("div",undefined,"columns");
  const editor=node("section");
  const preview=node("aside");
  const filter=field(editor,"Search cards",search);
  const gallery=node("div",undefined,"actions toolbar");
  function refreshCards(){
   gallery.replaceChildren();
   for(const id of draft.definitions.filter(id=>(draft.cardPresentation?.[id]?.name??id).toLowerCase().includes(search.toLowerCase()))){
    const item=button(draft.cardPresentation?.[id]?.name??id,()=>{cardId=id;render()});
    item.setAttribute("aria-pressed",String(id===cardId));gallery.append(item);
   }
  }
  filter.oninput=()=>{search=filter.value;refreshCards()};
  refreshCards();
  editor.append(gallery);
  function addCard(copy){
   const id="unit-"+crypto.randomUUID();
   edit(m=>{
    m.definitions.push(id);m.cardPresentation??={};
    m.cardPresentation[id]=copy?{...m.cardPresentation[copy],name:(m.cardPresentation[copy]?.name??"Unit")+" copy"}:{name:"New unit",type:"Unit",text:"",symbol:"✦"};
    m.combat.stats[id]=copy?{...m.combat.stats[copy]}:{attack:2,health:3};
    m.basicDuel.costs[id]=copy?m.basicDuel.costs[copy]??1:1;
    if(copy&&m.basicDuel.perks?.[copy])m.basicDuel.perks[id]=m.basicDuel.perks[copy];
    cardId=id;search="";
   });
  }
  if(draft.basicDuel)editor.append(button("Add unit",()=>addCard()),...(cardId&&draft.definitions.includes(cardId)?[button("Duplicate unit",()=>addCard(cardId))]:[]));
  if(!draft.definitions.includes(cardId))cardId=draft.definitions[0];
  if(cardId){
   const p=draft.cardPresentation?.[cardId]??{};
   const set=(key,value)=>edit(m=>{m.cardPresentation??={};m.cardPresentation[cardId]??={};m.cardPresentation[cardId][key]=value},false);
   field(editor,"Card name",p.name??cardId,{maxLength:100,live:true,change:v=>set("name",v)});
   field(editor,"Card text",p.text,{multiline:true,maxLength:1000,live:true,change:v=>set("text",v)});
   const upload=field(editor,"Card artwork",null,{type:"file"});
   upload.accept="image/png,image/jpeg,image/webp";
   upload.onchange=()=>{
    const file=upload.files[0];if(!file)return;
    if(file.size>400000||!["image/png","image/jpeg","image/webp"].includes(file.type)){report("Choose a PNG, JPEG or WebP under 400 KB.",true);return}
    const id=cardId,reader=new FileReader();
    reader.onload=()=>edit(m=>{m.cardPresentation??={};m.cardPresentation[id]??={};m.cardPresentation[id].art=reader.result});
    reader.readAsDataURL(file);
   };
   const stats=draft.combat?.stats?.[cardId];
   if(draft.basicDuel){
    number(editor,"Energy cost",draft.basicDuel.costs[cardId]??1,0,10,(m,v)=>m.basicDuel.costs[cardId]=v);
    number(editor,"Attack",stats.attack,0,100,(m,v)=>m.combat.stats[cardId].attack=v);
    number(editor,"Health",stats.health,1,100,(m,v)=>m.combat.stats[cardId].health=v);
    field(editor,"On deployment",draft.basicDuel.perks?.[cardId]??"none",{items:[["none","No effect"],["draw","Draw a card"],["heal","Restore 2 life"]],change:v=>edit(m=>{m.basicDuel.perks??={};m.basicDuel.perks[cardId]=v},false)});
   }
   refreshDetails=()=>{
    const current=draft.cardPresentation?.[cardId]??{};
    const card=node("div",undefined,"card-preview");
    card.append(node("strong",current.name??cardId));
    artwork(card,current,tones[0]);
    card.append(node("small",current.type??"Unit"),node("p",current.text??""));
    if(stats)card.append(node("strong",stats.attack+" attack · "+stats.health+" health"));
    preview.replaceChildren(card);
    refreshCards();
   };
   refreshDetails();
  }
  columns.append(editor,preview);panel.append(columns);
 }
 function decks(panel){
  if(!draft.decks?.length){panel.append(node("p","This module supplies fixed starting cards. Use Advanced Workshop to configure additional decks."));return}
  if(deckIndex>=draft.decks.length)deckIndex=draft.decks.length-1;
  field(panel,"Deck",deckIndex,{items:draft.decks.map((d,i)=>[i,d.name]),change:v=>{deckIndex=Number(v);render()}});
  const deck=draft.decks[deckIndex];
  const actions=node("div",undefined,"actions toolbar");
  actions.append(button("Duplicate deck",()=>edit(m=>{
   m.decks.push({...structuredClone(deck),name:deck.name+" copy"});
   deckIndex=m.decks.length-1;
  })));
  if(draft.basicDuel)actions.append(button("Add empty deck for this seat",()=>edit(m=>{
   m.decks.push({name:"New deck",player:deck.player,zone:deck.zone,cards:[]});
   deckIndex=m.decks.length-1;
  })));
  panel.append(actions);
  field(panel,"Deck name",deck.name,{change:v=>edit(m=>m.decks[deckIndex].name=v,false)});
  const total=node("p");panel.append(total);
  const legality=node("p");panel.append(legality);
  refreshDetails=()=>{
   const active=draft.decks[deckIndex];
   total.textContent=active.cards.reduce((n,c)=>n+c.count,0)+" cards";
   const problems=validateDeck(draft,active);
   legality.textContent=problems.length?problems[0]:"Deck is legal.";
   legality.classList.toggle("bad",Boolean(problems.length));
  };
  refreshDetails();
  for(const id of draft.definitions){
   const row=node("div",undefined,"deck-row");
   row.append(node("span",draft.cardPresentation?.[id]?.name??id));
   number(row,"Copies",deck.cards.find(c=>c.definition===id)?.count??0,0,draft.deckRules?.copyLimits?.[id]??draft.deckRules?.copies??4,(m,v)=>{
    const cards=m.decks[deckIndex].cards,existing=cards.find(c=>c.definition===id);
    if(!v)m.decks[deckIndex].cards=cards.filter(c=>c!==existing);
    else if(existing)existing.count=v;
    else cards.push({definition:id,count:v});
   }).setAttribute("aria-label","Copies of "+(draft.cardPresentation?.[id]?.name??id));
   panel.append(row);
  }
 }
 function board(panel){
  const preview=node("div",undefined,"board-preview");
  const layout=draft.battlefield?.zones??[];
  const order=[...layout.map(p=>draft.zones.find(z=>z.id===p.zone)).filter(Boolean),
   ...draft.zones.filter(zone=>!layout.some(p=>p.zone===zone.id))];
  const columns=draft.battlefield?.columns??1;
  let perspective="a";
  if(draft.players.length>1)field(panel,"Table perspective","a",{items:[["a","Player"],["b","Opponent"]],change:value=>{perspective=value;drawPreview()}});
  function reorder(from,to){
   if(from===to||!layout.some(z=>z.zone===from)||!layout.some(z=>z.zone===to))return;
   edit(m=>{
    const zones=m.battlefield.zones;
    const index=zones.findIndex(z=>z.zone===from);
    const target=zones.findIndex(z=>z.zone===to);
    zones.splice(target,0,zones.splice(index,1)[0]);
   });
  }
  function drawPreview(){
   preview.replaceChildren();
   const perspectivePlayer=draft.players[perspective==="a"?0:1];
   const bands=[["Opponent side",order.filter(z=>z.owner!==null&&z.owner!==perspectivePlayer)],
    ["Shared table",order.filter(z=>z.owner===null)],["Your side",order.filter(z=>z.owner===perspectivePlayer)]];
   for(const [side,zones] of bands){
    if(!zones.length)continue;
    preview.append(node("h3",side));
    const row=node("section",undefined,"board-row");
    row.style.setProperty("--columns",columns);
    for(const [i,zone] of zones.entries()){
     const presentation=layout.find(z=>z.zone===zone.id);
     const tile=node("article",undefined,"board-slot");
     const name=presentation?.label??zone.id;
     tile.append(node("strong",name),node("small",zone.capacity+" card spaces"));
     if(draft.basicDuel&&draft.combat.zones.includes(zone.id)){
      tile.draggable=true;
      tile.ondragstart=e=>e.dataTransfer.setData("text/plain",zone.id);
      tile.ondragover=e=>e.preventDefault();
      tile.ondrop=e=>{
       e.preventDefault();
       const from=e.dataTransfer.getData("text/plain");
       if(zones.some(z=>z.id===from&&draft.combat.zones.includes(z.id)))reorder(from,zone.id);
      };
      const neighbors=[zones[i-1],zones[i+1]];
      for(const [n,target] of neighbors.entries())if(target&&draft.combat.zones.includes(target.id)){
       const move=button(n?"Move later":"Move earlier",()=>reorder(zone.id,target.id));
       move.setAttribute("aria-label","Move "+name+" "+(n?"later":"earlier")+" on "+side.toLowerCase());
       tile.append(move);
      }
     }
     row.append(tile);
    }
    preview.append(row);
   }
  }
  drawPreview();
  panel.append(preview);
  if(draft.basicDuel)for(const zone of draft.zones.filter(z=>draft.combat.zones.includes(z.id))){
   const label=draft.battlefield.zones.find(z=>z.zone===zone.id)?.label;
   const seat=zone.owner===draft.players[0]?"Your ":"Opponent ";
   field(panel,seat+label.toLowerCase()+" name",label,{maxLength:40,change:v=>{
    if(v.trim())edit(m=>m.battlefield.zones.find(z=>z.zone===zone.id).label=v.trim(),false);
   }});
   number(panel,seat+label.toLowerCase()+" capacity",zone.capacity,1,12,(m,v)=>m.zones.find(z=>z.id===zone.id).capacity=v);
  }
  refreshDetails=drawPreview;
 }
 function rules(panel){
  if(!draft.basicDuel){panel.append(node("p","This module uses custom rules. Open Advanced Workshop to edit them."));return}
  const [life,energy]=draft.resources;
  const lifeWin=!!draft.victory?.length;
  field(panel,"Victory condition",lifeWin?"life":"deck",{items:[["life","Run out of life or cards"],["deck","Run out of cards"]],change:value=>edit(m=>{
   m.victory=value==="life"?m.players.map(player=>({type:"resourceAtMost",player,resource:"life",amount:0})):[];
   if(value==="life")m.combat.group.lifeResource="life";else delete m.combat.group.lifeResource;
  })});
  if(lifeWin)number(panel,"Starting life",life.initial,1,100,(m,v)=>m.resources[0].initial=m.resources[0].max=v);
  number(panel,"Energy per turn",energy.refresh,0,10,(m,v)=>m.resources[1].initial=m.resources[1].refresh=v);
  number(panel,"Opening hand",draft.drawPolicies[0].opening,0,12,(m,v)=>m.drawPolicies.forEach(p=>p.opening=v));
  number(panel,"Cards drawn each turn",draft.drawPolicies[0].perTurn,1,3,(m,v)=>m.drawPolicies.forEach(p=>p.perTurn=v));
  number(panel,"Minimum deck size",draft.deckRules.min,1,60,(m,v)=>m.deckRules.min=v);
  const preview=node("p");panel.append(preview);
  refreshDetails=()=>{
   const limit=lifeWin?"Players lose when they run out of life or fail to draw a required card.":"Players lose when they cannot draw a required card.";
   preview.textContent="Each player draws "+draft.drawPolicies[0].perTurn+" cards per turn. "+limit;
  };
  refreshDetails();
 }
 function render(){
  root.replaceChildren();
  refreshDetails=null;
  const controls=node("div",undefined,"actions");
  const undo=button("Undo",()=>restore(past,future),"undo"),redo=button("Redo",()=>restore(future,past),"redo");
  undo.disabled=!past.length;redo.disabled=!future.length;
  controls.append(link("Module hub",hub()),undo,redo,button("Save checkpoint",()=>{
   saveLibraryModule(draft,saved);report("Checkpoint saved. Card Battle now uses this revision.");
  }),button("Validate",()=>{
   prepare(draft,deckSlots(draft).map(decks=>decks[0]));report("Draft is ready to play.");
  }),button("Playtest",()=>{if(persist())setup(structuredClone(draft),true,route("workshop")+"&"+new URLSearchParams({tab,card:cardId??"",deck:deckIndex}))},"primary"));
  title("Workshop",draft.name,controls);
  const tabs=node("nav",undefined,"tabs");tabs.setAttribute("aria-label","Workshop sections");
  for(const name of ["Overview","Cards","Decks","Board","Rules"]){
   const b=button(name,()=>{tab=name;render()});b.setAttribute("aria-selected",String(name===tab));tabs.append(b);
  }
  root.append(tabs);
  const panel=node("section",undefined,"panel");
  panel.append(node("h2",tab));
  ({Overview:overview,Cards:cards,Decks:decks,Board:board,Rules:rules})[tab](panel);
  root.append(panel);
  const links=node("div",undefined,"actions section-space");
  links.append(button("Export draft ZIP",()=>download(draft)),button("Advanced Workshop",()=>{
   if(!persist())return;
   stagePlaytest(draft.decks?.length?prepare(draft,deckSlots(draft).map(decks=>decks[0])):compileBasic(draft));
   location.href="module-editor.html?resume=1&workshop=1&saved="+encodeURIComponent(saved);
  }));
  root.append(links);report("");
 }
 render();
}

try{
 const view=query.get("view");
 if(!view)library();
 else if(view==="new")wizard();
 else{
  const m=saved?readLibrary().find(x=>x.id===saved)?.module:references[Number(query.get("game"))];
  if(!m)throw Error("This module could not be found.");
  if(!saved&&m.cardPresentation.sentinel){
   const art=await inlineArt(covers[Number(query.get("game"))]);
   if(art)m.cardPresentation.sentinel.art=art;
  }
  if(view==="playtest"&&saved)setup(JSON.parse(localStorage.getItem(draftKey)??"null")??m,true,route("workshop"));
  else if(view==="workshop"&&saved)workshop(m);
  else moduleHub(m);
 }
}catch(error){title("Unable to open TCG Maker",error.message,link("Game library","index.html"))}
