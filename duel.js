import {demoModule} from "./kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "./kernel/runtime.js";
import {chooseDemoAction} from "./kernel/demo-ai.js";
const root=document.querySelector("#duel");
let mode="hotseat",timer=null,lastEvents=[];
const inspector=document.createElement("dialog");inspector.className="duel-inspector";document.body.append(inspector);
function inspect(o){
 if(!o.definition)return;
 clearTimeout(timer);inspector.replaceChildren();
 const name=o.definition[0].toUpperCase()+o.definition.slice(1),stats=match.rules.combat.stats[o.definition];
 inspector.append(el("h2","",name),el("div","inspect-symbol",({sentinel:"♜",raider:"⚔",blade:"†",ward:"◈"})[o.definition]??"◆"),el("p","",stats.attack+" attack · "+stats.health+" maximum health"),el("p","","Damage: "+o.damage+" · "+o.orientation),el("p","",match.rules.attachment.definitions.includes(o.definition)?"Equipment: select this card and a friendly host to attach.":"Unit: select this card and an enemy to attack."),button("Close inspection",()=>inspector.close()));
 inspector.showModal();
}
inspector.addEventListener("close",()=>scheduleOpponent());
function scheduleOpponent(){clearTimeout(timer);if(!inspector.open&&mode==="computer"&&!match.result&&(match.pending?.actor??match.timing.priority)==="b"){timer=setTimeout(()=>{const action=chooseDemoAction(match,"b");if(action)act("b",action);else{error="Opponent has no valid action";render(false)}},650)}}
let match=createMatch(demoModule()),selected=null,log=[],error="";
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const button=(label,fn)=>{const b=el("button","",label);b.type="button";b.addEventListener("click",fn);return b};
function act(actor,action){
 try{const r=applyMatchAction(match,actor,action);match=r.match;lastEvents=r.events;log.push(...r.events.map(e=>[e.type,e.id??e.actor??"",e.amount??""].filter(Boolean).join(" ")));error="";selected=null}
 catch(e){error=e.message}
 render();
}
function card(o,viewer){
 const b=button("",()=>{selected=o.id;render()});b.className="duel-card"+(selected===o.id?" selected":"")+(o.orientation==="resting"?" resting":"");
 const name=o.definition?o.definition[0].toUpperCase()+o.definition.slice(1):"Hidden card";
 b.append(el("strong","",name),el("span","card-symbol",({sentinel:"♜",raider:"⚔",blade:"†",ward:"◈"})[o.definition]??"◆"));
 const stats=match.rules.combat.stats[o.definition];
 if(stats)b.append(el("span","",stats.attack+" ATK · "+Math.max(0,stats.health-o.damage)+" HP"));
 const host=match.state.attachments?.[o.id]?.host;
 if(host)b.append(el("small","", "Attached to "+host));
 if(o.orientation==="resting")b.append(el("small","","Rested"));
 b.setAttribute("aria-label",name+" "+(o.id??""));
 if(lastEvents.some(e=>e.id===o.id&&e.type==="cardMoved"))b.classList.add("arriving");
 if(lastEvents.some(e=>e.id===o.id&&e.type==="damageDealt"))b.classList.add("hit");
 b.addEventListener("contextmenu",e=>{e.preventDefault();inspect(o)});
 let hold=null,long=false;
 b.addEventListener("pointerdown",e=>{if(e.pointerType==="touch"){long=false;hold=setTimeout(()=>{long=true;inspect(o)},550)}});
 for(const event of ["pointerup","pointercancel","pointerleave"])b.addEventListener(event,()=>clearTimeout(hold));
 b.addEventListener("click",e=>{if(long){e.stopImmediatePropagation();long=false}},true);
 b.addEventListener("keydown",e=>{if(e.key==="i"){e.preventDefault();inspect(o)}});
 return b;
}
function render(schedule=true){
 root.replaceChildren();
 const actor=match.pending?.actor??match.timing.priority??match.timing.active;
 const viewer=mode==="computer"?"a":actor;
 const view=matchView(match,viewer);
 const top=el("div","duel-top");
 top.append(el("h1","","Ironwood Duel"),el("span","","Turn "+view.turn+" · Active "+view.active.toUpperCase()+" · Priority "+actor.toUpperCase()),button("Restart",()=>{match=createMatch(demoModule());selected=null;log=[];lastEvents=[];error="";render()}));
 top.append(button(mode==="computer"?"Switch to hot-seat":"Play vs computer",()=>{mode=mode==="computer"?"hotseat":"computer";selected=null;render()}));root.append(top);
 const board=el("div","duel-board"),field=view.state.zones.find(z=>z.id==="field");
 for(const p of ["b","a"]){
  const seat=el("section","duel-seat");
  seat.append(el("h2","","Player "+p.toUpperCase()+" · Energy "+view.resources["player-"+p].energy));
  const row=el("div","duel-row");
  for(const o of field.cards.filter(o=>o.controller===p))row.append(card(o,viewer));
  seat.append(row);
  const hand=view.state.zones.find(z=>z.id==="hand-"+p);
  const h=el("div","duel-row hand");h.append(el("span","","Hand · "+hand.count));
  if(hand.cards)for(const o of hand.cards)h.append(card(o,viewer));
  else for(let i=0;i<hand.count;i++)h.append(el("div","card-back","◆"));
  seat.append(h);board.append(seat);
 }
 root.append(board);
 const controls=el("section","duel-controls");
 controls.append(el("h2","","Actions · Player "+viewer.toUpperCase()));
 if(view.result)controls.append(el("strong","",view.result.draw?"Draw":"Winner: "+view.result.winner));
 else if(mode==="computer"&&actor==="b")controls.append(el("p","","Opponent is considering a move…"));
 else if(view.choice){for(const value of view.choice.options??[])controls.append(button("Choose "+value,()=>act(viewer,{type:"choose",value})))}
 else{
  for(const effect of view.available)controls.append(button(effect.startsWith("muster")?"Deploy from hand":effect,()=>act(viewer,{type:"activate",effect})));
  controls.append(button("Pass priority",()=>act(viewer,{type:"pass"})));
  if(view.windowClosed&&view.active===viewer)controls.append(button("End turn",()=>act(viewer,{type:"endTurn"})));
  const o=field.cards.find(c=>c.id===selected);
  if(o&&o.controller===viewer&&view.active===viewer&&!view.queue.length&&!view.windowClosed){
   if(o.orientation==="ready")for(const target of field.cards.filter(c=>c.controller!==viewer&&c.face==="up"))controls.append(button("Attack "+target.definition+" "+target.id,()=>act(viewer,{type:"attack",attacker:o.id,defender:target.id})));
   if(match.rules.attachment.definitions.includes(o.definition))for(const target of field.cards.filter(c=>c.controller===viewer&&c.id!==o.id))controls.append(button("Attach to "+target.definition+" "+target.id,()=>act(viewer,{type:"attach",id:o.id,host:target.id})));
  }
 }
 controls.append(el("p","duel-error",error),el("p","","Stack: "+(view.queue.map(e=>e.effect).join(" · ")||"empty")));
 root.append(controls);
 const history=el("section","duel-log");history.append(el("h2","","Recent events"));for(const line of log.slice(-8).reverse())history.append(el("div","",line));root.append(history);
 lastEvents=[];
 if(schedule)scheduleOpponent();
}
render();
