import {demoModule} from "./kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "./kernel/runtime.js";
const root=document.querySelector("#duel");
let match=createMatch(demoModule()),selected=null,log=[],error="";
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const button=(label,fn)=>{const b=el("button","",label);b.type="button";b.addEventListener("click",fn);return b};
function act(actor,action){
 try{const r=applyMatchAction(match,actor,action);match=r.match;log.push(...r.events.map(e=>[e.type,e.id??e.actor??"",e.amount??""].filter(Boolean).join(" ")));error="";selected=null}
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
 b.setAttribute("aria-label",name+" "+(o.id??""));return b;
}
function render(){
 root.replaceChildren();
 const viewer=match.pending?.actor??match.timing.priority??match.timing.active;
 const view=matchView(match,viewer);
 const top=el("div","duel-top");
 top.append(el("h1","","Ironwood Duel"),el("span","","Turn "+view.turn+" · Active "+view.active.toUpperCase()+" · Priority "+viewer.toUpperCase()),button("Restart",()=>{match=createMatch(demoModule());selected=null;log=[];error="";render()}));
 root.append(top);
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
}
render();
