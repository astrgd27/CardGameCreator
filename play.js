import {readPlaytest} from "./module-library.js";
import {createMatch,applyMatchAction,matchView} from "./kernel/runtime.js";
import {chooseStrategicAction,decisionActor} from "./kernel/strategic-ai.js";
import {legalCardTargets} from "./kernel/legal-targets.js";
import {projectEvents} from "./kernel/event-view.js";
const root=document.querySelector("#match");
function el(tag,cls,text){
 const element=document.createElement(tag);
 if(cls)element.className=cls;
 if(text!==undefined)element.textContent=text;
 return element;
}
function btn(text,action,cls){
 const element=el("button",cls,text);
 element.type="button";
 element.onclick=action;
 return element;
}
let rules,match,human,selected=null,timer,error="",history=[],speed;
let arrivals=new Set(),damage=new Set(),lastMove="",currentView;
const name=id=>displayName(currentView,id)??"Concealed card";
const label=z=>rules.battlefield?.zones?.find(x=>x.zone===z.id)?.label??titleCase(z.id);
const isArt=art=>/^data:image\/(png|jpeg|webp);base64,/i.test(art??"");
function artImage(src){
 const img=el("img");
 img.alt="";img.src=src;
 return img;
}
function dialog(title,build){
 clearTimeout(timer);
 const d=el("dialog");
 d.setAttribute("aria-label",title);
 d.append(el("h2","",title));
 build(d);
 d.append(btn("Close",()=>d.close()));
 document.body.append(d);
 d.onclose=()=>{d.remove();render()};
 d.showModal();
 return d;
}
function inspect(o){
 if(!o.definition)return;
 const p=rules.cardPresentation?.[o.definition]??{};
 dialog(p.name??titleCase(o.definition),d=>{
  if(isArt(p.art))d.append(artImage(p.art));
  d.append(el("p","",p.type??""),el("p","",p.text??""));
  const stats=rules.combat?.stats?.[o.definition];
  if(stats)d.append(el("p","",stats.attack+" attack · "+Math.max(0,stats.health-o.damage)+" health"));
  if(o.keywords?.length)d.append(el("p","",o.keywords.map(titleCase).join(" · ")));
  for(const [counter,amount] of Object.entries(o.counters??{}))d.append(el("p","",titleCase(counter)+" "+amount));
  if(o.statuses?.length)d.append(el("p","",o.statuses.map(titleCase).join(" · ")));
  const attached=viewCards(currentView).filter(c=>c.attachedTo===o.id&&c.definition);
  if(attached.length)d.append(el("p","","Attached cards · "+attached.map(c=>name(c.id)).join(", ")));
 });
}
const eventText={
 openingKept:"Kept opening hand",openingRedrawn:"Redrew opening hand",
 effectQueued:"Played an effect",effectFizzled:"Effect lost its target",
 cardMoved:"Moved a card",resourcePaid:"Paid a resource cost",
 attackersDeclared:"Declared an attack",damageDealt:"Dealt damage",
 combatDefeat:"A card was defeated",turnStarted:"Started a turn",scoreAwarded:"Scored"
};
function act(actor,action){
 clearTimeout(timer);
 try{
  const prior=match.state,result=applyMatchAction(match,actor,action);
  match=result.match;
  const events=projectEvents(result.events,prior,match.state,human);
  arrivals=new Set(events.filter(e=>e.type==="cardMoved").map(e=>e.id));
  damage=new Set(events.filter(e=>e.type==="damageDealt").map(e=>e.id));
  const messages=events.filter(e=>eventText[e.type]).map(e=>{
   const who=e.actor===human?"You · ":e.actor?"Opponent · ":"";
   const number=e.amount!==undefined?" · "+e.amount:"";
   return who+eventText[e.type]+number;
  });
  history.push(...messages);
  if(history.length>200)history=history.slice(-200);
  if(messages.length)lastMove=messages.at(-1);
  error="";selected=null;
 }catch(e){
  error=e.message;
  endRequested=false;
 }
 render();
}
function card(o,actor,targets){
 if(!o.definition){
  const concealed=el("div","card back");
  concealed.setAttribute("aria-label","Face-down card");
  return concealed;
 }
 const p=rules.cardPresentation?.[o.definition]??{};
 const title=p.name??titleCase(o.definition);
 const n=btn("",()=>{
  const moves=targets.filter(t=>t.id===o.id);
  if(moves.length===1){automaticSteps=0;act(actor,moves[0].action);return}
  if(moves.length>1){
   dialog("Choose an action",d=>{for(const move of moves)d.append(btn(targetLabel(move),()=>{d.close();act(actor,move.action)}))});
   return;
  }
  selected=selected===o.id?null:o.id;render();
 },"card");
 n.dataset.cardId=o.id;
 n.setAttribute("aria-label",title);
 n.setAttribute("aria-pressed",String(selected===o.id));
 if(["verdant","gold","arcane","crimson","steel","neutral"].includes(p.frame))n.dataset.frame=p.frame;
 if(selected===o.id)n.classList.add("selected");
 if(targets.some(t=>t.id===o.id)||legalSources.has(o.id))n.classList.add("legal");
 if(o.orientation!=="ready")n.classList.add("resting");
 if(arrivals.has(o.id))n.classList.add("arrive");
 if(damage.has(o.id))n.classList.add("damaged");
 const art=el("div","art");
 if(isArt(p.art))art.append(artImage(p.art));else art.textContent=p.symbol??"◆";
 n.append(el("strong","",title),art,el("small","",p.type??""),el("span","rules",p.text??""));
 const stat=rules.combat?.stats?.[o.definition];
 if(stat)n.append(el("strong","",stat.attack+" / "+Math.max(0,stat.health-o.damage)));
 if(o.orientation!=="ready")n.title=title+" · "+titleCase(o.orientation);
 n.oncontextmenu=event=>{event.preventDefault();inspect(o)};
 let hold;
 n.onpointerdown=event=>{if(event.pointerType==="touch")hold=setTimeout(()=>inspect(o),500)};
 n.onpointerup=n.onpointercancel=n.onpointerleave=()=>clearTimeout(hold);
 return n;
}
function selectField(parent,label,values,initial){
 const wrap=el("label","",label+" ");
 const choice=el("select");
 choice.setAttribute("aria-label",label);
 for(const [value,text] of values){
  const option=el("option","",text);
  option.value=value;choice.append(option);
 }
 if(initial!==undefined)choice.value=initial;
 wrap.append(choice);parent.append(wrap);
 return choice;
}
function amountField(parent,label,min,max,value){
 const wrap=el("label","",label+" ");
 const input=el("input");
 input.type="number";input.min=min;input.max=max;input.value=value;
 wrap.append(input);parent.append(wrap);
 return input;
}
function payment(actor,a){
 automaticSteps=0;
 const base={type:"activate",effect:a.effect,source:a.source,plan:a.id};
 if(!a.dynamic&&!a.groups.length){act(actor,base);return}
 dialog("Choose payment",d=>{
  const cards=[];
  for(const group of a.groups)for(let i=0;i<group.count;i++){
   cards.push(selectField(d,titleCase(group.kind)+" card "+(i+1),group.ids.map(id=>[id,name(id)]),a.example?.[cards.length]));
  }
  const x=a.dynamic,example=a.paymentExample;
  const targets={},hybrid=[],generators=[];
  let mode,amount;
  if(x){
   if(x.modes.length>1)mode=selectField(d,"Payment mode",x.modes.map(value=>[value,titleCase(value)]),example?.mode);
   if(x.xMax>x.xMin)amount=amountField(d,"Extra resource amount",x.xMin,x.xMax,example?.x??x.xMin);
   for(const target of x.targets)targets[target.name]=selectField(d,titleCase(target.name),target.ids.map(id=>[id,name(id)]),example?.targets?.[target.name]);
   for(const [i,h] of x.hybrid.entries())hybrid.push(selectField(d,"Resource "+(i+1),h.resources.map(r=>[r,titleCase(r)]),example?.hybrid?.[i]));
   for(const g of x.generators){
    const wrap=el("label","",name(g.id)+" → "+g.resource+" ");
    const input=el("input");input.type="checkbox";
    input.checked=example?.generators?.some(value=>value.id===g.id&&value.generator===g.generator)??false;
    wrap.append(input);d.append(wrap);generators.push({input,g});
   }
  }
  const hint=el("p","error");hint.setAttribute("role","status");
  d.append(hint,btn("Confirm",()=>{
   const materials=cards.map(c=>c.value);
   if(new Set(materials).size!==materials.length){hint.textContent="Choose a different card for each payment slot.";return}
   if(amount&&!amount.reportValidity())return;
   const payment=x?{
    mode:mode?.value??x.modes[0],x:amount?.valueAsNumber??x.xMin,
    targets:Object.fromEntries(Object.entries(targets).map(([key,input])=>[key,input.value])),
    hybrid:hybrid.map(input=>input.value),
    generators:generators.filter(g=>g.input.checked).map(({g})=>({id:g.id,generator:g.generator}))
   }:undefined;
   d.close();act(actor,{...base,cards:materials,...(payment?{payment}:{})});
  },"primary"));
 });
}
function combat(actor,c){
 automaticSteps=0;
 const declare=c.stage==="declare";
 dialog(declare?"Choose attackers":c.stage==="block"?"Choose blockers":"Assign damage",d=>{
  if(c.stage==="assign"){
   const rows=c.assignments.map(a=>{
    d.append(el("h3","",name(a.attacker)+" · "+a.power+" damage to assign"));
    return {attacker:a.attacker,inputs:a.blockers.map(b=>amountField(d,name(b.id),0,a.power,0))};
   });
   d.append(btn("Confirm",()=>{
    if(rows.some(r=>r.inputs.some(n=>!n.reportValidity())))return;
    d.close();act(actor,{type:"assignDamage",assignments:rows.map(r=>({attacker:r.attacker,amounts:r.inputs.map(n=>Number(n.value))}))});
   },"primary"));
   return;
  }
  const ids=declare?c.attackers:c.blockers;
  const rows=[];
  for(const id of ids){
   const legal=declare?c.targetsByAttacker?.[id]??c.targets:(c.attackersByBlocker?.[id]??c.attackers).map(id=>({id,kind:"card"}));
   if(!legal.length)continue;
   const choices=legal.map((t,i)=>[i,t.kind==="player"?"Opponent":name(t.id)]);
   rows.push({id,legal,input:selectField(d,name(id),[["","Skip"],...choices])});
  }
  const hint=el("p","error");hint.setAttribute("role","status");
  d.append(hint,btn("Confirm",()=>{
   const chosen=rows.filter(row=>row.input.value!=="").map(row=>{
    const target=row.legal[Number(row.input.value)];
    return declare?{attacker:row.id,kind:target.kind,target:target.id}:{blocker:row.id,attacker:target.id};
   });
   if(declare&&(chosen.length<1||chosen.length>c.max)){hint.textContent="Choose between 1 and "+c.max+" attackers.";return}
   d.close();act(actor,declare?{type:"declareCombat",attacks:chosen}:{type:"block",blocks:chosen});
  },"primary"));
 });
}
function targetLabel(t){
 const cardName=name(t.id);
 const zones=currentView.state.zones;
 const duplicates=viewCards(currentView).filter(card=>name(card.id)===cardName).length>1;
 const zone=duplicates&&zones.find(z=>z.cards?.some(card=>card.id===t.id));
 const target=cardName+(zone?" · "+label(zone):"");
 if(t.action.type==="choose")return "Choose "+target;
 if(t.action.type==="attack")return (t.action.profile?titleCase(t.action.profile)+" → ":"Attack ")+target;
 return "Attach to "+target;
}

let legalSources=new Set();
const config=location.search.includes("configured")?JSON.parse(sessionStorage.getItem("tcg-match-options")??"{}"):{};
const seed=config.seed??crypto.getRandomValues(new Uint32Array(1))[0];
const reduced=config.speed==="reduced"||matchMedia("(prefers-reduced-motion: reduce)").matches;
document.body.classList.toggle("reduced-motion",reduced);
speed=reduced?35:config.speed==="fast"?100:440;
let autoPass=true,endRequested=false,automaticSteps=0;
const back=()=>location.href=config.returnPath??"index.html";
const humanize=value=>String(value??"").replace(/([a-z])([A-Z])/g,"$1 $2").replaceAll("-", " ");
const titleCase=value=>humanize(value).replace(/^./,v=>v.toUpperCase());
const viewCards=v=>v.state.zones.flatMap(z=>z.cards??[]);
const displayName=(view,id)=>{
 const projected=viewCards(view).find(card=>card.id===id)??view.reveals?.find(card=>card.id===id);
 return projected?.definition?rules.cardPresentation?.[projected.definition]?.name??titleCase(projected.definition):null;
};
function restart(){
 clearTimeout(timer);
 match=createMatch(rules,{seed});selected=null;history=[];error="";lastMove="";arrivals.clear();damage.clear();
 endRequested=false;automaticSteps=0;render();
}
function resultReason(v){
 if(v.result.reason)return titleCase(v.result.reason);
 if(match.state.ruleLosses?.length)return "A player could not draw or take a required card.";
 for(const r of rules.victory??[]){
  if(!v.result.losers?.includes(r.player))continue;
  if(r.type==="resourceAtMost"&&v.resources["player-"+r.player]?.[r.resource]<=r.amount)return titleCase(r.resource)+" reached "+r.amount+".";
  if(r.type==="emptyZone"&&v.state.zones.find(z=>z.id===r.zone)?.count===0)return "A required pile was emptied.";
 }
 if(v.objectives)return "The match objectives were decided.";
 return "A victory condition was met.";
}
function seat(view,p){
 const banner=el("div","seat");
 banner.append(el("strong","",p===human?"You":rules.players.length===2?"Opponent":"Opponent "+(rules.players.indexOf(p)+1)));
 for(const [key,value] of Object.entries(view.resources["player-"+p]??{}))banner.append(el("span","counter",titleCase(key)+" "+value));
 if(view.objectives)banner.append(el("span","counter","Score "+view.objectives.scores[p]));
 if(view.active===p)banner.append(el("small","turn-owner","Active player"));
 return banner;
}
function progression(view){
 return view.windowClosed?{type:view.hasNextPhase?"nextPhase":"endTurn"}:{type:"pass"};
}
function noResponse(view){
 return !view.opening&&!view.choice&&!view.triggerOrder&&!view.combat&&!view.activations.length&&
 !view.generators.length&&!view.stackOptions.length&&!view.spatial?.moves.length&&
 !view.scheduler?.canClaim&&!view.scheduler?.canPassOut;
}
function schedule(actor,action,delay,status){
 timer=setTimeout(()=>{
  if(++automaticSteps>120){
   error="Automatic play reached its action limit. Open History to review the match.";
   status.textContent=error;
   return;
  }
  try{
   const next=action??chooseStrategicAction(match,actor,{...rules.ai,difficulty:config.difficulty==="relaxed"?"easy":undefined});
   if(!next)throw Error("The opponent has no legal decision.");
   act(actor,next);
  }catch(e){status.textContent=e.message;status.classList.add("error")}
 },delay);
}

function render(){
 clearTimeout(timer);
 const focused=document.activeElement;
 const focusCard=focused?.dataset.cardId;
 const focusText=focused instanceof HTMLButtonElement?focused.textContent:null;
 const scrollTop=root.querySelector("#table")?.scrollTop??0;
 const scrollRows=new Map(Array.from(root.querySelectorAll("[data-scroll-zone]"),row=>[row.dataset.scrollZone,row.scrollLeft]));
 root.replaceChildren();
 const actor=decisionActor(match),view=matchView(match,human);
 currentView=view;
 const can=actor===human&&!view.result;
 legalSources=new Set(can?[...view.activations.map(a=>a.source),...view.generators.map(a=>a.id),...view.stackOptions.map(a=>a.material),...view.combat?.attackers??[]]:[]);
 const targets=can&&(selected||view.choice)?legalCardTargets(match,human,selected):[];
 const header=el("header");
 header.append(btn(config.playtest?"Workshop":"Module hub",back),el("h1","",rules.name),
  el("span","turn","Turn "+view.turn+(view.phase?" · "+titleCase(view.phase):"")),
  btn("History",()=>dialog("Match history",d=>{for(const text of history.slice(-60))d.append(el("p","",text));if(!history.length)d.append(el("p","","No moves yet."))})),
  btn("Settings",()=>dialog("Match settings",d=>{
   d.append(btn(autoPass?"Hold empty windows":"Auto-pass empty windows",()=>{autoPass=!autoPass;endRequested=false;d.close()}),
    btn("Restart match",()=>{d.close();restart()}));
  })));
 root.append(header);

 const table=el("section");table.id="table";table.setAttribute("aria-label","Game table");
 const zoneOrder=rules.battlefield?.zones??[];
 const zones=[...view.state.zones].sort((a,b)=>{
  const index=z=>{const i=zoneOrder.findIndex(p=>p.zone===z.id);return i<0?Infinity:i};
  return index(a)-index(b);
 });
 const hand=z=>z.id==="hand-"+z.owner||rules.drawPolicies?.some(p=>p.hand===z.id);
 const pile=z=>!hand(z)&&(z.visibility==="hidden"||zoneOrder.find(p=>p.zone===z.id)?.display==="count");
 const cardRow=(z,cls)=>{
  const row=el("div",cls);
  for(const o of z.cards??[])row.append(card(o,human,targets));
  if(!z.cards)for(let i=0;i<Math.min(z.count,12);i++)row.append(el("div","card back"));
  row.setAttribute("aria-label",(z.owner===human?"Your ":"Opponent ")+label(z));
  row.dataset.scrollZone=z.id;
  return row;
 };
 for(const p of rules.players.filter(p=>p!==human)){
  table.append(seat(view,p));
  for(const z of zones.filter(z=>z.owner===p&&hand(z)))table.append(cardRow(z,"hand opponent"));
 }
 const board=el("div","board");
 const renderBand=(side,items)=>{
  if(!items.length)return;
  const band=el("div","band "+side);
  band.style.setProperty("--columns",rules.battlefield?.columns??Math.min(items.length,3));
  for(const z of items){
   const panel=el("section","zone");
   panel.dataset.zone=z.id;
   const span=zoneOrder.find(p=>p.zone===z.id)?.span??1;
   panel.style.gridColumn="span "+Math.min(span,rules.battlefield?.columns??Math.min(items.length,3));
   panel.append(el("h2","",label(z)),cardRow(z,"row"));
   if(can&&selected&&view.spatial?.moves.some(m=>m.id===selected&&m.to===z.id))panel.append(btn("Move here",()=>act(human,{type:"moveSpatial",id:selected,to:z.id})));
   band.append(panel);
  }
  board.append(band);
 };
 const playZones=zones.filter(z=>!hand(z)&&!pile(z));
 renderBand("enemy",playZones.filter(z=>z.owner!==null&&z.owner!==human));
 renderBand("shared",playZones.filter(z=>z.owner===null));
 renderBand("friendly",playZones.filter(z=>z.owner===human));
 table.append(board);
 const piles=el("div","piles");
 for(const z of zones.filter(pile)){
  const text=(z.owner===null?"":z.owner===human?"Your ":"Opponent ")+label(z)+" · "+z.count;
  if(z.cards?.some(o=>o.definition))piles.append(btn(text,()=>dialog(text,d=>{const cards=el("div","row");for(const o of z.cards)cards.append(card(o,human,[]));d.append(cards)}),"pile"));
  else piles.append(el("span","pile",text));
 }
 table.append(piles,seat(view,human));
 for(const z of zones.filter(z=>z.owner===human&&hand(z)))table.append(cardRow(z,"hand"));
 root.append(table);

 const foot=el("footer");
 const selectedName=selected&&displayName(view,selected);
 const message=error||(view.result?resultReason(view):view.opening&&can?"Keep or redraw your opening hand.":view.choice&&can?titleCase(view.choice.name):can?(selectedName?"Selected · "+selectedName:"Your decision"):"Opponent thinking…");
 const status=el("div","status",message);status.setAttribute("role","status");
 if(lastMove&&!view.result&&!error)status.append(el("small","last-move",lastMove));
 if(error)status.classList.add("error");
 const context=el("div","context");
 const userAction=action=>{automaticSteps=0;act(human,action)};
 const add=(text,action,style="primary")=>context.append(btn(text,()=>userAction(action),style));
 foot.append(status,context);root.append(foot);
 if(view.result){
  const won=view.result.winner===human||view.result.winners?.includes(human);
  status.replaceChildren(el("strong","result",view.result.draw?"Draw":won?"Victory":"Defeat"),el("span","",resultReason(view)));
  context.append(btn("Rematch",restart,"primary"),btn(config.playtest?"Return to Workshop":"Return to module",back));
 }else if(can){
  if(view.opening){
   add("Keep hand",{type:"keep"});if(view.opening.remaining)add("Mulligan",{type:"mulligan"},"");
  }else if(view.choice){
   for(const [i,value] of (view.choice.options??[]).entries()){
    const detail=view.choice.labels?.[value];
    add(displayName(view,value)??(detail?rules.cardPresentation?.[detail]?.name??titleCase(detail):/^c\d+$/.test(value)?"Option "+(i+1):titleCase(value)),{type:"choose",value});
   }
  }else if(view.triggerOrder){
   context.append(btn("Order effects",()=>dialog("Choose resolution order",d=>{
    const list=el("ol"),ids=[...view.triggerOrder.ids];
    function order(){
     list.replaceChildren();
     for(const [i,id] of ids.entries()){
      const item=el("li","",effectLabel(view.queue.find(q=>q.id===id)?.effect));
      if(i)item.append(btn("Move up",()=>{[ids[i-1],ids[i]]=[ids[i],ids[i-1]];order()}));
      list.append(item);
     }
    }
    d.append(list);order();d.append(btn("Resolve",()=>{d.close();userAction({type:"orderTriggers",ids})},"primary"));
   }),"primary"));
  }else if(view.combat&&view.combat.stage!=="declare"){
   const c=view.combat;
   if(c.stage==="react"){
    for(const r of c.reactions)context.append(btn(displayName(view,r.id)??"React",()=>dialog("Choose reaction target",d=>{
     for(const id of c.attackers)d.append(btn(displayName(view,id)??"Attacker",()=>{d.close();userAction({type:"combatReact",id:r.id,rule:r.rule,target:id})}));
    })));
    add("Continue combat",{type:"combatContinue"});
   }else if(c.stage==="block"&&!c.blockers.length)add("Continue combat",{type:"block",blocks:[]});
   else context.append(btn(c.stage==="assign"?"Assign damage":"Choose blockers",()=>combat(human,c),"primary"));
  }else{
   const selectedCard=viewCards(view).find(o=>o.id===selected);
   if(selectedCard){
    context.append(btn("Inspect",()=>inspect(selectedCard)),btn("Cancel selection",()=>{selected=null;render()}));
    for(const g of view.generators.filter(g=>g.id===selected))add("Generate "+g.resource,{type:"generate",id:g.id,generator:g.generator});
    for(const s of view.stackOptions.filter(s=>s.material===selected))add("Combine with "+name(s.host),{type:"stack",...s});
    for(const t of targets)add(targetLabel(t),t.action);
   }
   for(const a of view.activations.filter(a=>selectedCard?a.source===selected:!a.source)){
    const effect=rules.effects[a.effect];
    const costs=(a.id==="default"?effect.costs:effect.alternatives?.find(p=>p.id===a.id)?.costs)??[];
    const price=costs.filter(c=>c.kind==="spend").map(c=>c.amount+" "+c.resource).join(", ");
    const label=effectLabel(a.effect,a.source?zones.some(z=>hand(z)&&z.cards?.some(c=>c.id===selected))?"Play card":"Use ability":null);
    context.append(btn(label+(a.id==="default"?"":" · "+titleCase(a.id))+(price?" · "+price:""),()=>payment(human,a),"primary"));
   }
   if(view.combat?.stage==="declare"&&view.combat.attackers.some(id=>(view.combat.targetsByAttacker?.[id]??view.combat.targets).length))context.append(btn("Declare attacks",()=>combat(human,view.combat),"primary"));
   if(view.scheduler?.canClaim)add("Claim initiative",{type:"claimInitiative"},"");
   if(view.scheduler?.canPassOut)add("Pass out",{type:"passOut"});
   const advance=progression(view);
   const label=view.windowClosed?(view.hasNextPhase?"Next phase":"End turn"):view.queue.length?"Pass response":view.active===human?(view.hasNextPhase?"Next phase":"End turn"):"Pass";
   context.append(btn(label,()=>{
    if(!view.queue.length)endRequested=!view.windowClosed&&view.active===human;
    userAction(advance);
   },context.children.length?"":"primary"));
  }
 }
 table.scrollTop=scrollTop;
 for(const row of table.querySelectorAll("[data-scroll-zone]"))row.scrollLeft=scrollRows.get(row.dataset.scrollZone)??0;
 if(focusCard)root.querySelectorAll("[data-card-id]").forEach(element=>{if(element.dataset.cardId===focusCard)element.focus({preventScroll:true})});
 else if(focusText)Array.from(root.querySelectorAll("button")).find(b=>b.textContent===focusText)?.focus({preventScroll:true});
 arrivals.clear();damage.clear();

 if(view.result||error)return;
 if(!can)schedule(actor,null,speed,status);
 else if(endRequested&&view.windowClosed){
  endRequested=false;schedule(human,progression(view),speed,status);
 }else if(autoPass&&noResponse(view)&&!view.windowClosed&&
   (view.queue.length||view.active!==human||endRequested))schedule(human,{type:"pass"},speed,status);
}
function effectLabel(id,otherwise){
 const effect=rules.effects[id];
 return effect?.label??otherwise??(effect?.sourceDefinition?rules.cardPresentation?.[effect.sourceDefinition]?.name:undefined)??titleCase(id??"Effect");
}
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&selected&&!document.querySelector("dialog[open]")){
  selected=null;render();
 }
});
try{
 rules=readPlaytest();
 if(!rules)throw Error("Choose a game from the library.");
 human=rules.players[0];
 restart();
}catch(e){root.append(el("h1","","Unable to start match"),el("p","error",e.message),btn("Return",back))}
