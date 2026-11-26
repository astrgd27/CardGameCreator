import {demoModule} from "./kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "./kernel/runtime.js";
import {chooseStrategicAction,aiProfile} from "./kernel/strategic-ai.js";
import {encounterModule,validateCampaign,readProgress,saveProgress,newCampaign,recordEncounter,nextRoutes} from "./kernel/campaign.js";
import {legalCardTargets} from "./kernel/legal-targets.js";
import {readSettings,saveSettings,animationDuration} from "./tabletop-settings.js";
import {readPlaytest} from "./module-library.js";
const root=document.querySelector("#duel");
const params=new URLSearchParams(location.search),campaignMode=params.has("campaign"),custom=params.has("custom")||campaignMode;
let campaignBase=null,progress=null,recorded=false;
let rules=demoModule(),startupError="";
if(custom){try{rules=readPlaytest();if(!rules)throw Error("No staged module");createMatch(rules,{seed:crypto.getRandomValues(new Uint32Array(1))[0]})}catch(e){startupError=e.message;rules=demoModule()}}
if(campaignMode&&!startupError){try{campaignBase=rules;const errors=validateCampaign(campaignBase);if(errors.length)throw Error(errors.join(" · "));progress=readProgress(campaignBase);rules=encounterModule(campaignBase,campaignBase.campaign.encounters[Math.min(progress.index,campaignBase.campaign.encounters.length-1)],progress.complete?null:progress)}catch(e){startupError=e.message;campaignBase=null;progress=null;rules=demoModule()}}
const players=rules.players;
const human=campaignBase?.campaign.player??players[0],computer=players.find(p=>p!==human);
let opponentProfile=aiProfile(rules.ai??{});
let settings=readSettings(),preview=null,previewTimer=null,targets=[],movement=[];
let mode=campaignBase?"computer":"hotseat",timer=null,lastEvents=[],lastAction=null,aiMoves=0,actionSummary="";
const inspector=document.createElement("dialog");inspector.className="duel-inspector";document.body.append(inspector);
function presentation(o){return Object.hasOwn(rules.cardPresentation??{},o.definition)?rules.cardPresentation[o.definition]:{}}
function cardName(o){return presentation(o).name|| (o.definition?o.definition[0].toUpperCase()+o.definition.slice(1):"Hidden card")}
function artwork(o,cls){const data=presentation(o);if(/^data:image\/(png|jpeg|webp);base64,/.test(data.art??"")){const img=el("img",cls+" custom-art");img.src=data.art;img.alt="";return img}return el("span",cls,({sentinel:"♜",raider:"⚔",blade:"†",ward:"◈"})[o.definition]??"◆")}
function inspect(o){
 if(!o.definition||inspector.open||preview)return;
 clearTimeout(timer);inspector.replaceChildren();
 const name=cardName(o),stats=match.rules.combat?.stats?.[o.definition];
 inspector.append(el("h2","",name),artwork(o,"inspect-symbol"),el("p","",presentation(o).type??""),el("p","",presentation(o).text??""),el("p","",stats?stats.attack+" attack · "+stats.health+" maximum health":"No combat statistics"),el("p","","Damage: "+o.damage+" · "+o.orientation),el("p","",match.rules.attachment?.definitions?.includes(o.definition)?"Equipment: select this card and a friendly host to attach.":"Unit: select this card and an enemy to attack."),button("Close inspection",()=>inspector.close()));
 inspector.showModal();
}
inspector.addEventListener("close",()=>scheduleOpponent());
function scheduleOpponent(){clearTimeout(timer);clearTimeout(previewTimer);if(preview)return;if(!inspector.open&&mode==="computer"&&!match.result&&(match.triggerOrderPending?.actor??match.battle?.defender??match.openingQueue?.[0]?.player??match.pending?.actor??match.timing.priority)===computer){timer=setTimeout(()=>{if(++aiMoves>100){error="Opponent action budget reached; switch to hot-seat to continue.";render(false);return}const action=chooseStrategicAction(match,computer,opponentProfile);if(action){if(settings.opponentPreview&&animationDuration(settings)>0&&action.type!=="pass"){preview=describeAction(computer,action);render(false);previewTimer=setTimeout(()=>{preview=null;act(computer,action)},animationDuration(settings)+250)}else act(computer,action)}else{error="Opponent has no valid action";render(false)}},Math.max(150,animationDuration(settings)+200))}}
let match=createMatch(rules,{seed:crypto.getRandomValues(new Uint32Array(1))[0]}),selected=null,log=[],error="";
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const button=(label,fn)=>{const b=el("button","",label);b.type="button";b.addEventListener("click",fn);return b};
function describeAction(actor,action){const who="Player "+actor.toUpperCase();const name=id=>{const o=match.state.objects[id];return o&&matchView(match,human).state.zones.some(z=>z.cards?.some(c=>c.id===id))?cardName(o):"a card"};switch(action.type){case "activate":return who+" activated "+action.effect;case "declareCombat":return who+" declared "+action.attacks.length+" attackers";case "block":return who+" assigned "+action.blocks.length+" blockers";case "attack":return who+" attacked with "+name(action.attacker)+" → "+name(action.defender);case "attach":return who+" attached "+name(action.id)+" to "+name(action.host);case "pass":return who+" passed priority";case "choose":return who+" made a choice";case "endTurn":return who+" ended their turn";case "nextPhase":return who+" advanced the phase";case "mulligan":return who+" redrew their opening hand";default:return who+" completed "+action.type}}
function act(actor,action){
 if(preview)return;
 const before=new Map([...root.querySelectorAll("[data-card-id]")].map(n=>[n.dataset.cardId,n.getBoundingClientRect()]));
 try{const summary=describeAction(actor,action);const r=applyMatchAction(match,actor,action);match=r.match;movement=r.events.filter(e=>e.type==="cardMoved").map(e=>({id:e.id,from:before.get(e.id)}));actionSummary=summary;lastAction=action;lastEvents=r.events;log.push(...r.events.map(e=>[e.type,e.actor??"",e.amount??""].filter(Boolean).join(" ")));error="";selected=null}
 catch(e){error=e.message}
 render();
}
function card(o,viewer){
 const b=button("",()=>{if(preview||!o.id)return;const options=targets.filter(t=>t.id===o.id);if(options.length===1){act(viewer,options[0].action);return}selected=o.id===selected?null:o.id;render()});b.className="duel-card"+(selected===o.id?" selected":"")+(["resting","tapped"].includes(o.orientation)?" resting":"");
 const name=cardName(o);
 b.append(el("strong","",name),artwork(o,"card-symbol"),el("small","",presentation(o).type??""));
 const stats=match.rules.combat?.stats?.[o.definition];
 if(stats)b.append(el("span","",stats.attack+" ATK · "+Math.max(0,stats.health-o.damage)+" HP"));
 const host=match.state.attachments?.[o.id]?.host;
 if(host)b.append(el("small","", "Attached to "+host));
 if(o.orientation==="resting"||o.orientation==="tapped")b.append(el("small","",o.orientation==="tapped"?"Tapped":"Rested"));
 if(o.definition){const badges=el("div","card-state-badges");if(o.token)badges.append(el("span","","Token"));if(o.components?.length){b.classList.add("composite-card");badges.append(el("span","","Stack ×"+(o.components.length+1)));for(const c of o.components)badges.append(el("span","",c.definition+(c.inherit?" · inherited":"")))}for(const k of o.keywords??[])if(!o.statuses?.includes(k))badges.append(el("span","",k));for(const [k,v] of Object.entries(o.counters??{}))badges.append(el("span","",k+" ×"+v));for(const status of o.statuses??[])badges.append(el("span","",status+(o.statusDurations?.[status]?" ("+o.statusDurations[status]+")":"")));if(o.controller!==o.owner)badges.append(el("span","","Controlled by "+o.controller));if(o.face==="down")badges.append(el("span","","Face down"));if(badges.childNodes.length)b.append(badges)}
 if(lastEvents.some(e=>e.id===o.id&&["cardFlipped","cardTransformed"].includes(e.type)))b.classList.add("flipping");
 if(lastEvents.some(e=>e.id===o.id&&e.type==="tokenCreated"))b.classList.add("arriving");
 b.setAttribute("aria-label",name+" "+(o.id??""));
 if(!o.definition)b.classList.add("concealed");
 if(o.id)b.dataset.cardId=o.id;
 if(targets.some(t=>t.id===o.id))b.classList.add("potential-target","legal-target");
 const frame=presentation(o).frame;if(["steel","crimson","gold","arcane","neutral","verdant"].includes(frame))b.dataset.frame=frame;
 if(presentation(o).text)b.append(el("span","card-rules",presentation(o).text));
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
function startEncounter(){const encounter=campaignBase.campaign.encounters[progress.index];rules=encounterModule(campaignBase,encounter,progress);opponentProfile=aiProfile(rules.ai??{});match=createMatch(rules,{seed:crypto.getRandomValues(new Uint32Array(1))[0]});recorded=false;selected=null;log=[];actionSummary="";error="";aiMoves=0;lastEvents=[];lastAction=null;render()}
function openSettings(){
 if(preview)return;clearTimeout(timer);
 const dialog=el("dialog","duel-inspector settings-dialog");dialog.append(el("h2","","Gameplay settings"));
 const draft={...settings};const aiDraft={...opponentProfile};
 for(const [key,label,values] of [["difficulty","Opponent difficulty",["easy","normal","hard"]],["personality","Opponent personality",["balanced","aggressive","defensive","economic"]]]){const l=el("label","",label+" "),s=el("select");s.setAttribute("aria-label",label);for(const value of values){const o=el("option","",value);o.value=value;s.append(o)}s.value=aiDraft[key];s.onchange=()=>{aiDraft[key]=s.value;if(key==="personality")delete aiDraft.weights};l.append(s);dialog.append(l)}
 for(const [key,label,values] of [["speed","Animation speed",["off","fast","normal","slow"]],["scale","Card scale",["compact","normal","large"]],["opponentPreview","Opponent action preview",["on","off"]]]){
  const l=el("label","",label+" "),select=el("select");for(const value of values){const o=el("option","",value);o.value=value;select.append(o)}select.setAttribute("aria-label",label);select.value=key==="opponentPreview"?(draft[key]?"on":"off"):draft[key];select.onchange=()=>draft[key]=key==="opponentPreview"?select.value==="on":select.value;l.append(select);dialog.append(l);
 }
 dialog.append(button("Save settings",()=>{try{settings=saveSettings(draft);opponentProfile=aiProfile(aiDraft);dialog.close()}catch(e){error=e.message;dialog.close()}}),button("Cancel",()=>dialog.close()));
 document.body.append(dialog);dialog.addEventListener("close",()=>{dialog.remove();render()});dialog.showModal();
}
function choosePayment(actor,a){
 const dialog=el("dialog","duel-inspector");dialog.append(el("h2","","Choose payment cards"));
 const selects=[],payment={targets:{},hybrid:[],generators:[]};
 function pick(label,items,change){const l=el("label","",label+" "),s=el("select");s.setAttribute("aria-label",label);for(const [v,t] of items){const o=el("option","",t);o.value=v;s.append(o)}s.onchange=()=>change(s.value);change(s.value);l.append(s);dialog.append(l)}
 if(a.dynamic){const d=a.dynamic;
  pick("Mode",d.modes.map(v=>[v,v]),v=>payment.mode=v);
  const l=el("label","","Variable amount "),x=el("input");x.type="number";x.min=d.xMin;x.max=d.xMax;x.value=d.xMin;x.setAttribute("aria-label","Variable amount");payment.x=d.xMin;x.oninput=()=>payment.x=Number(x.value);l.append(x);dialog.append(l);
  for(const t of d.targets)pick("Target "+t.name,t.ids.map(id=>[id,cardName(match.state.objects[id])+" "+id]),v=>payment.targets[t.name]=v);
  d.hybrid.forEach((h,i)=>pick("Hybrid payment "+(i+1),h.resources.map(r=>[r,r+" ×"+h.amount]),v=>payment.hybrid[i]=v));
  for(const g of d.generators){const l=el("label","","Generate "+g.resource+" ×"+g.amount+" from "+cardName(match.state.objects[g.id])+" "+g.id),c=el("input");c.type="checkbox";c.onchange=()=>{payment.generators=payment.generators.filter(x=>x.id!==g.id);if(c.checked)payment.generators.push({id:g.id,generator:g.generator})};l.append(c);dialog.append(l)}
 }
 for(const g of a.groups)for(let i=0;i<g.count;i++){const l=el("label","",g.kind+" "+(i+1)+" "),s=el("select");s.setAttribute("aria-label",g.kind+" "+(selects.length+1));for(const id of g.ids){const o=el("option","",cardName(match.state.objects[id])+" "+id);o.value=id;s.append(o)}if(a.example[selects.length])s.value=a.example[selects.length];selects.push(s);l.append(s);dialog.append(l)}
 dialog.append(button("Pay and activate",()=>{const cards=selects.map(s=>s.value);dialog.close();act(actor,{type:"activate",effect:a.effect,source:a.source,plan:a.id,cards,...(a.dynamic?{payment}:{})})}),button("Cancel",()=>dialog.close()));
 document.body.append(dialog);dialog.addEventListener("close",()=>dialog.remove());dialog.showModal();
}
function combatControls(parent,viewer,c){
 const field=el("div","combat-declarations"),select=(label,items)=>{const l=el("label","",label+" "),s=el("select");s.setAttribute("aria-label",label);for(const [value,text] of items){const o=el("option","",text);o.value=value;s.append(o)}l.append(s);field.append(l);return s};
 const name=id=>cardName(match.state.objects[id])+" "+id;
 if(c.stage==="declare"){
  const rows=c.attackers.map(id=>({id,s:select("Attack with "+name(id),[["","Do not attack"],...c.targets.map(t=>[t.kind+":"+t.id,t.kind==="player"?"Player "+t.id:name(t.id)])])}));
  field.append(button("Declare attackers",()=>{const attacks=rows.filter(r=>r.s.value).map(r=>{const [kind,target]=r.s.value.split(":");return {attacker:r.id,kind,target}});act(viewer,{type:"declareCombat",attacks})}));
 }else{
  const rows=c.blockers.map(id=>({id,s:select("Block with "+name(id),[["","Do not block"],...c.attackers.map(id=>[id,name(id)])])}));
  field.append(button("Resolve combat",()=>act(viewer,{type:"block",blocks:rows.filter(r=>r.s.value).map(r=>({blocker:r.id,attacker:r.s.value}))})));
 }
 parent.append(field);
}
function render(schedule=true){
 root.replaceChildren();
 if(campaignBase&&progress.complete){root.append(el("h1","","Campaign complete"),el("p","","Wins: "+progress.wins+" · Losses: "+progress.losses),button("Reset campaign",()=>{if(confirm("Reset all campaign progress?")){progress=newCampaign(campaignBase);saveProgress(progress);startEncounter()}}),button("Back to editor",()=>location.href="module-editor.html"));return}
 const actor=match.triggerOrderPending?.actor??match.battle?.defender??match.openingQueue?.[0]?.player??match.pending?.actor??match.timing.priority??match.timing.active;
 if(actor!==computer)aiMoves=0;
 const viewer=mode==="computer"?human:actor;
 const view=matchView(match,viewer);
 targets=preview||actor!==viewer?[]:legalCardTargets(match,viewer,selected);
 root.dataset.scale=settings.scale;root.dataset.theme=["forest","midnight","stone","ember"].includes(rules.tabletop?.theme)?rules.tabletop.theme:"forest";root.dataset.back=["diamond","rune","spiral"].includes(rules.tabletop?.back)?rules.tabletop.back:"diamond";root.style.setProperty("--motion",animationDuration(settings)+"ms");
 const top=el("div","duel-top");
 top.append(el("h1","",rules.name??"Custom duel"),el("span","","Turn "+view.turn+" · Active "+view.active.toUpperCase()+" · Priority "+actor.toUpperCase()),button("Restart",()=>{if(preview)return;match=createMatch(rules,{seed:crypto.getRandomValues(new Uint32Array(1))[0]});selected=null;log=[];actionSummary="";lastEvents=[];lastAction=null;error="";render()}));
 if(players.length===2&&!campaignBase)top.append(button(mode==="computer"?"Switch to hot-seat":"Play vs computer",()=>{if(preview)return;mode=mode==="computer"?"hotseat":"computer";selected=null;aiMoves=0;render()}));if(campaignBase){const encounter=campaignBase.campaign.encounters[progress.index];top.append(el("h2","",encounter.name),el("p","",encounter.intro??""),el("span","","Encounter "+(progress.index+1)+" / "+campaignBase.campaign.encounters.length+" · Wins "+progress.wins+" · Losses "+progress.losses));if(progress.rewards.length)top.append(el("p","","Earned cards: "+progress.rewards.map(r=>r.definition+" ×"+r.count).join(", ")));}if(view.phase)top.append(el("span","","Phase: "+view.phase));top.append(button("Gameplay settings",openSettings));root.append(top);if(custom)top.append(button("Back to editor",()=>location.href="module-editor.html"));if(startupError)root.append(el("p","duel-error","Custom module could not load: "+startupError));
 if(preview){const cue=el("div","opponent-preview","Opponent move: "+preview);cue.setAttribute("role","status");root.append(cue)}
 if(actionSummary){const banner=el("div","action-banner",actionSummary);banner.setAttribute("role","status");root.append(banner)}
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
 if(view.result){controls.append(el("strong","",view.result.draw?"Draw":"Winner: "+view.result.winner));if(campaignBase){const win=view.result.winner===human&&!view.result.draw;const advance=route=>{try{if(!recorded){const next=recordEncounter(campaignBase,progress,progress.index,view.result,route);saveProgress(next);progress=next;recorded=true}if(progress.complete)render();else startEncounter()}catch(e){error=e.message;render()}};if(win){const encounter=campaignBase.campaign.encounters[progress.index],routes=nextRoutes(campaignBase,progress.index);if(encounter.rewards?.length)controls.append(el("p","","Reward: "+encounter.rewards.map(r=>r.definition+" ×"+r.count).join(", ")));if(routes.length)for(const r of routes)controls.append(button(r.label,()=>advance(r.to)));else controls.append(button("Continue campaign",()=>advance()))}else controls.append(button("Retry encounter",()=>advance()))}}
 else if(preview||mode==="computer"&&actor===computer)controls.append(el("p","","Opponent is considering a move…"));
 else if(view.triggerOrder){const ids=[...view.triggerOrder.ids];const order=el("div","combat-declarations");function drawOrder(){order.replaceChildren();for(const [i,id] of ids.entries()){const line=el("div","",view.queue.find(q=>q.id===id)?.effect??id);if(i)line.append(button("Move up",()=>{[ids[i-1],ids[i]]=[ids[i],ids[i-1]];drawOrder()}));order.append(line)}order.append(button("Confirm trigger order",()=>act(viewer,{type:"orderTriggers",ids})))}drawOrder();controls.append(order)}
 else if(view.combat?.stage==="block"){combatControls(controls,viewer,view.combat)}
 else if(view.opening){controls.append(el("p","","Opening hand · "+view.opening.remaining+" mulligans remaining"),button("Keep opening hand",()=>act(viewer,{type:"keep"})),button("Mulligan",()=>act(viewer,{type:"mulligan"})))}
 else if(view.choice){const p=el("section","private-decision");p.append(el("h2","","Private decision: "+(view.choice.name??"waiting")));for(const value of view.choice.options??[]){const label=view.choice.labels?.[value];p.append(button("Choose "+(label?(rules.cardPresentation?.[label]?.name??label)+" "+value:value),()=>act(viewer,{type:"choose",value})))}controls.append(p)}
 else{
  if(view.combat?.stage==="declare")combatControls(controls,viewer,view.combat);
  if(view.reveals?.length){const p=el("section","private-decision");p.append(el("h2","","Revealed cards"));for(const r of view.reveals)p.append(el("p","",(rules.cardPresentation?.[r.definition]?.name??r.definition)+" · "+r.zone));controls.append(p)}
  if(view.scheduler){const p=view.scheduler;controls.append(el("p","","Window: "+p.window+" · "+p.mode+(p.initiative?" · Initiative "+p.initiative:"")+(p.gauge!==null?" · Gauge "+p.gauge:"")+(p.passed.length?" · Passed: "+p.passed.join(", "):"")));if(p.canClaim)controls.append(button("Claim initiative",()=>act(viewer,{type:"claimInitiative"})));if(p.canPassOut)controls.append(button("Pass out",()=>act(viewer,{type:"passOut"})))}
  for(const o of view.stackOptions??[])controls.append(button("Stack "+cardName(match.state.objects[o.material])+" "+o.material+" on "+cardName(match.state.objects[o.host])+" "+o.host,()=>act(viewer,{type:"stack",...o})));
  for(const g of view.generators??[])controls.append(button("Generate "+g.resource+" · "+cardName(match.state.objects[g.id])+" "+g.id,()=>act(viewer,{type:"generate",id:g.id,generator:g.generator})));
  for(const a of view.activations??[]){const label=(!custom&&a.effect.startsWith("muster")?"Deploy from hand":a.effect)+(a.source?" · "+cardName(match.state.objects[a.source])+" "+a.source:"")+(a.id!=="default"?" · "+a.id:"");controls.append(button(label,()=>a.groups.length||a.dynamic?choosePayment(viewer,a):act(viewer,{type:"activate",effect:a.effect,source:a.source,plan:a.id})))}
  controls.append(button("Pass priority",()=>act(viewer,{type:"pass"})));
  if(view.windowClosed&&view.active===viewer)controls.append(button(view.hasNextPhase?"Next phase":"End turn",()=>act(viewer,{type:view.hasNextPhase?"nextPhase":"endTurn"})));
  const candidates=custom?view.state.zones.flatMap(z=>z.cards??[]):field.cards;
  const o=candidates.find(c=>c.id===selected);
  if(o&&o.controller===viewer&&view.active===viewer&&!view.queue.length&&!view.windowClosed){
   for(const t of targets.filter(t=>t.action.type==="attack")){const target=candidates.find(c=>c.id===t.id);if(target)controls.append(button("Attack "+target.definition+" "+target.id,()=>act(viewer,t.action)))}
   for(const t of targets.filter(t=>t.action.type==="attach")){const target=candidates.find(c=>c.id===t.id);if(target)controls.append(button("Attach to "+target.definition+" "+target.id,()=>act(viewer,t.action)))}
  }
 }
 controls.append(el("p","duel-error",error),el("p","","Stack: "+(view.queue.map(e=>e.effect).join(" · ")||"empty")));
 sidebar.append(controls);
 const history=el("section","duel-log");history.append(el("h2","","Recent events"));for(const line of log.slice(-8).reverse())history.append(el("div","",line));sidebar.append(history);
 if(animationDuration(settings)>0&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches){for(const m of movement){const dest=[...root.querySelectorAll("[data-card-id]")].find(n=>n.dataset.cardId===m.id);if(!dest)continue;const end=dest.getBoundingClientRect();if(m.from)dest.animate([{transform:"translate("+(m.from.left-end.left)+"px,"+(m.from.top-end.top)+"px)",opacity:.7},{transform:"none",opacity:1}],{duration:animationDuration(settings),easing:"ease-out"});else dest.animate([{opacity:0,transform:"translateY(30px) scale(.8)"},{opacity:1,transform:"none"}],{duration:animationDuration(settings)})}}
 movement=[];lastEvents=[];lastAction=null;
 if(schedule)scheduleOpponent();
}
render();
