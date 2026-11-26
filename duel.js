import {demoModule} from "./kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "./kernel/runtime.js";
import {chooseDemoAction} from "./kernel/demo-ai.js";
import {encounterModule,validateCampaign,readProgress,saveProgress,newCampaign,recordEncounter} from "./kernel/campaign.js";
import {readPlaytest} from "./module-library.js";
const root=document.querySelector("#duel");
const params=new URLSearchParams(location.search),campaignMode=params.has("campaign"),custom=params.has("custom")||campaignMode;
let campaignBase=null,progress=null,recorded=false;
let rules=demoModule(),startupError="";
if(custom){try{rules=readPlaytest();if(!rules)throw Error("No staged module");createMatch(rules,{seed:crypto.getRandomValues(new Uint32Array(1))[0]})}catch(e){startupError=e.message;rules=demoModule()}}
if(campaignMode&&!startupError){try{campaignBase=rules;const errors=validateCampaign(campaignBase);if(errors.length)throw Error(errors.join(" · "));progress=readProgress(campaignBase);rules=encounterModule(campaignBase,campaignBase.campaign.encounters[Math.min(progress.index,campaignBase.campaign.encounters.length-1)])}catch(e){startupError=e.message;campaignBase=null;progress=null;rules=demoModule()}}
const players=rules.players;
const human=campaignBase?.campaign.player??players[0],computer=players.find(p=>p!==human);
let mode=campaignBase?"computer":"hotseat",timer=null,lastEvents=[],lastAction=null,aiMoves=0;
const inspector=document.createElement("dialog");inspector.className="duel-inspector";document.body.append(inspector);
function presentation(o){return Object.hasOwn(rules.cardPresentation??{},o.definition)?rules.cardPresentation[o.definition]:{}}
function cardName(o){return presentation(o).name|| (o.definition?o.definition[0].toUpperCase()+o.definition.slice(1):"Hidden card")}
function artwork(o,cls){const data=presentation(o);if(/^data:image\/(png|jpeg|webp);base64,/.test(data.art??"")){const img=el("img",cls+" custom-art");img.src=data.art;img.alt="";return img}return el("span",cls,({sentinel:"♜",raider:"⚔",blade:"†",ward:"◈"})[o.definition]??"◆")}
function inspect(o){
 if(!o.definition||inspector.open)return;
 clearTimeout(timer);inspector.replaceChildren();
 const name=cardName(o),stats=match.rules.combat?.stats?.[o.definition];
 inspector.append(el("h2","",name),artwork(o,"inspect-symbol"),el("p","",presentation(o).type??""),el("p","",presentation(o).text??""),el("p","",stats?stats.attack+" attack · "+stats.health+" maximum health":"No combat statistics"),el("p","","Damage: "+o.damage+" · "+o.orientation),el("p","",match.rules.attachment?.definitions?.includes(o.definition)?"Equipment: select this card and a friendly host to attach.":"Unit: select this card and an enemy to attack."),button("Close inspection",()=>inspector.close()));
 inspector.showModal();
}
inspector.addEventListener("close",()=>scheduleOpponent());
function scheduleOpponent(){clearTimeout(timer);if(!inspector.open&&mode==="computer"&&!match.result&&(match.openingQueue?.[0]?.player??match.pending?.actor??match.timing.priority)===computer){timer=setTimeout(()=>{if(++aiMoves>100){error="Opponent action budget reached; switch to hot-seat to continue.";render(false);return}const action=chooseDemoAction(match,computer);if(action)act(computer,action);else{error="Opponent has no valid action";render(false)}},650)}}
let match=createMatch(rules,{seed:crypto.getRandomValues(new Uint32Array(1))[0]}),selected=null,log=[],error="";
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const button=(label,fn)=>{const b=el("button","",label);b.type="button";b.addEventListener("click",fn);return b};
function act(actor,action){
 try{const r=applyMatchAction(match,actor,action);match=r.match;lastAction=action;lastEvents=r.events;log.push(...r.events.map(e=>[e.type,e.id??e.actor??"",e.amount??""].filter(Boolean).join(" ")));error="";selected=null}
 catch(e){error=e.message}
 render();
}
function card(o,viewer){
 const b=button("",()=>{selected=o.id;render()});b.className="duel-card"+(selected===o.id?" selected":"")+(o.orientation==="resting"?" resting":"");
 const name=cardName(o);
 b.append(el("strong","",name),artwork(o,"card-symbol"),el("small","",presentation(o).type??""));
 const stats=match.rules.combat?.stats?.[o.definition];
 if(stats)b.append(el("span","",stats.attack+" ATK · "+Math.max(0,stats.health-o.damage)+" HP"));
 const host=match.state.attachments?.[o.id]?.host;
 if(host)b.append(el("small","", "Attached to "+host));
 if(o.orientation==="resting")b.append(el("small","","Rested"));
 b.setAttribute("aria-label",name+" "+(o.id??""));
 if(lastEvents.some(e=>e.id===o.id&&e.type==="cardMoved"))b.classList.add("arriving");
 if(lastEvents.some(e=>e.id===o.id&&e.type==="damageDealt"))b.classList.add("hit");
 if(lastAction?.type==="attack"&&lastAction.attacker===o.id)b.classList.add("striking");
 if(lastAction?.type==="attach"&&lastAction.id===o.id)b.classList.add("equipping");
 b.addEventListener("contextmenu",e=>{e.preventDefault();inspect(o)});
 let hold=null,long=false;
 b.addEventListener("pointerdown",e=>{if(e.pointerType==="touch"){long=false;hold=setTimeout(()=>{long=true;inspect(o)},550)}});
 for(const event of ["pointerup","pointercancel","pointerleave"])b.addEventListener(event,()=>clearTimeout(hold));
 b.addEventListener("click",e=>{if(long){e.stopImmediatePropagation();long=false}},true);
 b.addEventListener("keydown",e=>{if(e.key==="i"){e.preventDefault();inspect(o)}});
 return b;
}
function startEncounter(){const encounter=campaignBase.campaign.encounters[progress.index];rules=encounterModule(campaignBase,encounter);match=createMatch(rules,{seed:crypto.getRandomValues(new Uint32Array(1))[0]});recorded=false;selected=null;log=[];error="";aiMoves=0;lastEvents=[];lastAction=null;render()}
function render(schedule=true){
 root.replaceChildren();
 if(campaignBase&&progress.complete){root.append(el("h1","","Campaign complete"),el("p","","Wins: "+progress.wins+" · Losses: "+progress.losses),button("Reset campaign",()=>{if(confirm("Reset all campaign progress?")){progress=newCampaign(campaignBase);saveProgress(progress);startEncounter()}}),button("Back to editor",()=>location.href="module-editor.html"));return}
 const actor=match.openingQueue?.[0]?.player??match.pending?.actor??match.timing.priority??match.timing.active;
 if(actor!==computer)aiMoves=0;
 const viewer=mode==="computer"?human:actor;
 const view=matchView(match,viewer);
 const top=el("div","duel-top");
 top.append(el("h1","",rules.name??"Custom duel"),el("span","","Turn "+view.turn+" · Active "+view.active.toUpperCase()+" · Priority "+actor.toUpperCase()),button("Restart",()=>{match=createMatch(rules,{seed:crypto.getRandomValues(new Uint32Array(1))[0]});selected=null;log=[];lastEvents=[];lastAction=null;error="";render()}));
 if(players.length===2&&!campaignBase)top.append(button(mode==="computer"?"Switch to hot-seat":"Play vs computer",()=>{mode=mode==="computer"?"hotseat":"computer";selected=null;aiMoves=0;render()}));if(campaignBase){const encounter=campaignBase.campaign.encounters[progress.index];top.append(el("h2","",encounter.name),el("p","",encounter.intro??""),el("span","","Encounter "+(progress.index+1)+" / "+campaignBase.campaign.encounters.length+" · Wins "+progress.wins+" · Losses "+progress.losses));}if(view.phase)top.append(el("span","","Phase: "+view.phase));root.append(top);if(custom)top.append(button("Back to editor",()=>location.href="module-editor.html"));if(startupError)root.append(el("p","duel-error","Custom module could not load: "+startupError));
 const board=el("div","duel-board"),field={cards:view.state.zones.filter(z=>z.id==="field"||(custom&&(rules.combat?.zones??[]).includes(z.id))).flatMap(z=>z.cards??[])};
 for(const p of custom?[]:[...players].reverse()){
  const seat=el("section","duel-seat "+(p===viewer?"friendly":"opposing")+(p===view.active?" active-seat":""));
  seat.append(el("h2","","Player "+p.toUpperCase()+" · Energy "+(custom?Object.entries(view.resources["player-"+p]??{}).map(([k,v])=>k+" "+v).join(" · "):view.resources["player-"+p].energy)));
  const row=el("div","duel-row");
  for(const o of field.cards.filter(o=>o.controller===p))row.append(card(o,viewer));
  seat.append(row);
  const hand=view.state.zones.find(z=>z.id==="hand-"+p)??{count:0};
  const h=el("div","duel-row hand");h.append(el("span","","Hand · "+hand.count));
  if(hand.cards)for(const o of hand.cards)h.append(card(o,viewer));
  else for(let i=0;i<hand.count;i++)h.append(el("div","card-back","◆"));
  if(p!==human)seat.prepend(h);else seat.append(h);
 const discard=view.state.zones.find(z=>z.id==="discard-"+p)??{count:0};
 seat.append(el("small","discard-count","Discard · "+discard.count));board.append(seat);
 }
 if(custom){const config=rules.battlefield??{},columns=config.columns??1;board.style.setProperty("--zone-columns",String(columns));board.classList.add("custom-board");for(const p of players){const resources=view.resources["player-"+p]??{};board.append(el("h2","","Player "+p+" · "+Object.entries(resources).map(([k,v])=>k+": "+v).join(" · ")))}const layouts=config.zones??[];const ordered=[...layouts.map(r=>view.state.zones.find(z=>z.id===r.zone)).filter(Boolean),...view.state.zones.filter(z=>!layouts.some(r=>r.zone===z.id))];for(const z of ordered){const r=layouts.find(r=>r.zone===z.id)??{};const section=el("section","duel-seat");section.style.setProperty("--zone-span",String(Math.min(columns,r.span??1)));section.append(el("h2","",(r.label||z.id)+" · "+z.count));const row=el("div","duel-row");if(r.display==="count"){row.append(el("span","","Cards: "+z.count))}else if(z.cards)for(const o of z.cards)row.append(card(o,viewer));else row.append(el("span","","Hidden cards: "+z.count));section.append(row);board.append(section)}}
 const layout=el("div","duel-layout");layout.append(board);root.append(layout);
 const sidebar=el("aside","duel-sidebar");layout.append(sidebar);
 const controls=el("section","duel-controls");
 controls.append(el("h2","","Actions · Player "+viewer.toUpperCase()));
 if(view.result){controls.append(el("strong","",view.result.draw?"Draw":"Winner: "+view.result.winner));if(campaignBase){controls.append(button(view.result.winner===human?"Continue campaign":"Retry encounter",()=>{try{if(!recorded){const next=recordEncounter(campaignBase,progress,progress.index,view.result);saveProgress(next);progress=next;recorded=true}if(progress.complete)render();else startEncounter()}catch(e){error=e.message;render()}}))}}
 else if(mode==="computer"&&actor===computer)controls.append(el("p","","Opponent is considering a move…"));
 else if(view.opening){controls.append(el("p","","Opening hand · "+view.opening.remaining+" mulligans remaining"),button("Keep opening hand",()=>act(viewer,{type:"keep"})),button("Mulligan",()=>act(viewer,{type:"mulligan"})))}
 else if(view.choice){for(const value of view.choice.options??[])controls.append(button("Choose "+value,()=>act(viewer,{type:"choose",value})))}
 else{
  for(const effect of view.available)controls.append(button(!custom&&effect.startsWith("muster")?"Deploy from hand":effect,()=>act(viewer,{type:"activate",effect})));
  controls.append(button("Pass priority",()=>act(viewer,{type:"pass"})));
  if(view.windowClosed&&view.active===viewer)controls.append(button(view.hasNextPhase?"Next phase":"End turn",()=>act(viewer,{type:view.hasNextPhase?"nextPhase":"endTurn"})));
  const candidates=custom?view.state.zones.flatMap(z=>z.cards??[]):field.cards;
  const o=candidates.find(c=>c.id===selected);
  if(o&&o.controller===viewer&&view.active===viewer&&!view.queue.length&&!view.windowClosed){
   if(view.phaseActions.includes("attack")&&match.rules.combat&&o.orientation==="ready")for(const target of field.cards.filter(c=>c.controller!==viewer&&c.face==="up"))controls.append(button("Attack "+target.definition+" "+target.id,()=>act(viewer,{type:"attack",attacker:o.id,defender:target.id})));
   if(view.phaseActions.includes("attach")&&match.rules.attachment?.definitions?.includes(o.definition))for(const target of candidates.filter(c=>c.controller===viewer&&c.id!==o.id))controls.append(button("Attach to "+target.definition+" "+target.id,()=>act(viewer,{type:"attach",id:o.id,host:target.id})));
  }
 }
 controls.append(el("p","duel-error",error),el("p","","Stack: "+(view.queue.map(e=>e.effect).join(" · ")||"empty")));
 sidebar.append(controls);
 const history=el("section","duel-log");history.append(el("h2","","Recent events"));for(const line of log.slice(-8).reverse())history.append(el("div","",line));sidebar.append(history);
 lastEvents=[];lastAction=null;
 if(schedule)scheduleOpponent();
}
render();
