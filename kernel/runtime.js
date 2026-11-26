import {hasRule,keywords} from "./keywords.js";
// First unified runtime: trusted module definitions, untrusted player action IDs.
// No client-provided effect programs, prices, statistics or replacement rules.
import {createState,addCard,projectState,assertInvariants} from "./objects.js";
import {initializeResources,payResources,refreshResources,quotePayment} from "./resources.js";
import {attachCard,assertAttachments,moveWithAttachments} from "./attachments.js";
import {createTiming,submitEffect,passPriority,changeActive} from "./timing.js";
import {submitChainLink} from "./chains.js";
import {collectTriggers} from "./triggers.js";
import {beginEffect,resumeEffect,choiceView} from "./effects.js";
import {resolveCombat,evaluateVictory} from "./combat.js";
import {selectCards} from "./selectors.js";
import {shuffleZone,drawCards} from "./draw.js";
import {paymentPlans,payPlan,paymentOptions} from "./card-costs.js";
import {expireStatuses,cleanupTokens} from "./card-state.js";
import {combatOptions,declareCombat,resolveGroupCombat} from "./group-combat.js";
import {assertModuleV2} from "./module-v2.js";
const check=(ok,m)=>{if(!ok)throw Error(m)};
const own=(o,k)=>typeof k==="string"&&Object.hasOwn(o??{},k);
export function createMatch(module,{seed=1}={}){
 if(module?.schemaVersion===2)assertModuleV2(module);
 const rules=structuredClone(module);
 let state=createState(rules);if(rules.keywordRules)state.keywordRules=structuredClone(rules.keywordRules);
 for(const card of rules.setup??[])state=addCard(state,card).state;
 state=initializeResources(state,rules.resources??[]);
 for(const p of rules.drawPolicies??[]){if(p.shuffle){const r=shuffleZone(state,p.deck,seed);state=r.state;seed=r.seed}if(p.opening)state=drawCards(state,p.deck,p.hand,p.opening).state}
 const openingQueue=(rules.drawPolicies??[]).filter(p=>(p.mulligans??0)>0&&(p.opening??0)>0).map(p=>({player:p.player,remaining:p.mulligans,ids:(p.opening??0)>0?state.zones[p.hand].cards.slice(-p.opening):[]}));
 const timing=createTiming(state.players,rules.timing);
 check(rules.effects&&typeof rules.effects==="object"&&!Array.isArray(rules.effects),"Missing effects");
 for(const e of Object.values(rules.effects))check(e&&Array.isArray(e.program)&&Array.isArray(e.costs??[]),"Invalid effect");
 for(const trigger of rules.triggers??[])check(own(rules.effects,trigger.effect),"Unknown trigger effect");
 return finish({version:1,rules,state,timing,pending:null,turn:1,windowClosed:false,result:null,openingQueue,seed,phaseIndex:0,uses:{}},[]).match;
}
function effect(m,id){
 check(own(m.rules.effects,id),"Unknown effect");return m.rules.effects[id];
}
function phase(m){return m.rules.phases?.[m.phaseIndex??0]}
function allows(m,type){return !phase(m)||phase(m).actions.includes(type)}
function eligible(m,actor,id,e,source){
 if(source&&hasRule(m.state,source,"cannotActivate"))return false;
 if(e.sourceDefinition){if(!source||!selectCards(m.state,actor,{zones:e.sourceZones,controller:"self",definition:e.sourceDefinition,face:"up"}).includes(source))return false}else if(source!==undefined)return false;
 const useKey=JSON.stringify([actor,id,source??null]);const usage=m.uses?.[useKey];if(e.limit&&usage&&(e.limit.scope==="match"?usage.total:usage.turn===m.turn?usage.count:0)>=e.limit.count)return false;
 return allows(m,"activate")&&(!e.phases||e.phases.includes(phase(m)?.id))&&(!e.requiresCard||!m.timing.queue.some(q=>q.effect===id))&&e.available===true&&(e.actors===undefined||e.actors.includes(actor))&&(!e.requiresCard||m.state.zones[e.requiresCard.zone]?.cards.includes(e.requiresCard.id))&&paymentPlans(e).some(p=>paymentOptions(m.state,actor,p));
}
function finish(m,events){
 if(!m.pending&&m.rules.tokenPolicy?.zones){const r=cleanupTokens(m.state,m.rules.tokenPolicy.zones);m.state=r.state;if(r.events.length)events=[...events,...(!m.timing.resolving?enqueue(m,r.events):r.events)]}
 assertInvariants(m.state);assertAttachments(m.state);
 if(!m.openingQueue?.length&&!m.battle&&!m.pending&&!m.timing.resolving&&!m.timing.queue.length&&m.rules.victory?.length){
  const r=evaluateVictory(m.state,m.rules.victory);
  if(r.winner!==null||r.draw)m.result=r;
 }
 return {match:m,events};
}
function enqueue(m,events){
 const start=m.timing.queue.length;
 const r=collectTriggers(m.timing,m.rules.triggers??[],events);
 m.timing=r.timing;if(m.rules.triggerOrder==="player"&&r.events.length>1){const batch=m.timing.queue.slice(start);m.triggerOrderPending={actor:m.timing.active,ids:batch.map(x=>x.id)}}return [...events,...r.events];
}
function resolve(m,r){
 m.state=r.state;m.timing=r.timing;m.pending=r.pending;
 if(m.rules.triggerOrder==="player"&&!r.pending){const ids=r.events.filter(e=>e.type==="triggerQueued").map(e=>e.id);if(ids.length>1)m.triggerOrderPending={actor:m.timing.active,ids}}
 return r.events;
}
export function applyMatchAction(match,actor,action){
 check(match.state.players.includes(actor)&&!match.result&&action&&typeof action.type==="string","Action unavailable");
 const m=structuredClone(match);let events=[];
 if(m.openingQueue?.length){
  const q=m.openingQueue[0];check(actor===q.player,"Opening decision belongs to another player");
  if(action.type==="keep"){m.openingQueue.shift();return finish(m,[{type:"openingKept",actor}])}
  check(action.type==="mulligan"&&q.remaining>0,"Opening decision required");
  const p=m.rules.drawPolicies.find(p=>p.player===actor);
  const ids=[...q.ids];check(ids.length>0&&ids.length<=100,"Invalid opening hand");
  for(const id of ids)m.state=moveWithAttachments(m.state,{id,from:p.hand,to:p.deck,face:"down"}).state;
  const shuffled=shuffleZone(m.state,p.deck,m.seed);m.state=shuffled.state;m.seed=shuffled.seed;
  const n=Math.max(0,ids.length-(p.mulliganPenalty??0));
  const previous=new Set(m.state.zones[p.hand].cards);m.state=drawCards(m.state,p.deck,p.hand,n).state;
  q.ids=m.state.zones[p.hand].cards.filter(id=>!previous.has(id));q.remaining--;
  if(!q.remaining||!q.ids.length)m.openingQueue.shift();
  return finish(m,[{type:"openingRedrawn",actor,count:n}]);
 }
 if(m.triggerOrderPending){const p=m.triggerOrderPending;check(actor===p.actor&&action.type==="orderTriggers"&&Array.isArray(action.ids)&&action.ids.length===p.ids.length&&new Set(action.ids).size===p.ids.length&&action.ids.every(id=>p.ids.includes(id)),"Invalid trigger order");const items=m.timing.queue.filter(q=>p.ids.includes(q.id));m.timing.queue=m.timing.queue.filter(q=>!p.ids.includes(q.id)).concat(action.ids.map(id=>items.find(q=>q.id===id)));m.triggerOrderPending=null;return finish(m,[{type:"triggersOrdered",actor}])}
 if(m.battle){check(action.type==="block","Blocking decision required");events=enqueue(m,resolveGroupCombat(m,actor,action.blocks));return finish(m,events)}
 if(m.pending){
  check(action.type==="choose","Choice pending");
  events=resolve(m,resumeEffect(m.state,m.timing,m.pending,{actor,value:action.value}));
  return finish(m,events);
 }
 check(m.timing.resolving===null&&m.timing.priority===actor,"No priority");
 switch(action.type){
 case "activate":{
  const e=effect(m,action.effect);
  check(eligible(m,actor,action.effect,e,action.source),"Effect unavailable");
  const plan=paymentPlans(e).find(p=>p.id===(action.plan??"default"));check(plan,"Unknown payment plan");
  const payment=payPlan(m.state,actor,plan,action.cards??[]);
  const useKey=JSON.stringify([actor,action.effect,action.source??null]);m.uses??={};const old=m.uses[useKey];m.uses[useKey]={turn:m.turn,count:(old?.turn===m.turn?old.count:0)+1,total:(old?.total??0)+1};
  const entry={actor,effect:action.effect,choices:action.source?{source:action.source}:{}};
  const r=m.rules.chain?submitChainLink(m.timing,entry,m.rules.chain):submitEffect(m.timing,entry);
  m.state=payment.state;m.timing=r.timing;m.windowClosed=false;
  events=[...r.events,...enqueue(m,payment.events)];break;
 }
 case "pass":{
  const r=passPriority(m.timing,actor);m.timing=r.timing;events=r.events;
  m.windowClosed=events.some(e=>e.type==="windowClosed");
  if(m.timing.resolving){
   const e=effect(m,m.timing.resolving.effect);
   events=[...events,...resolve(m,beginEffect(m.state,m.timing,e.program,m.rules.triggers??[]))];
  }break;
 }
 case "declareCombat":{events=declareCombat(m,actor,action.attacks);break}
 case "attack":{
  const c=m.rules.combat;
  check(!c?.group&&allows(m,"attack")&&c&&Array.isArray(c.zones)&&c.zones.length&&m.timing.active===actor&&!m.timing.queue.length&&!m.windowClosed,"Combat unavailable");
  check(selectCards(m.state,actor,{zones:c.zones,controller:"self",face:"up",orientation:"ready"}).includes(action.attacker),"Invalid attacker");
  check(selectCards(m.state,actor,{zones:c.zones,controller:"opponent",face:"up"}).includes(action.defender),"Invalid defender");
  check(!hasRule(m.state,action.attacker,"cannotAttack")&&!hasRule(m.state,action.defender,"cannotBeAttacked"),"Keyword prohibits attack");
  const r=resolveCombat(m.state,{...c,attacker:action.attacker,defender:action.defender,turn:m.turn});
  m.state=r.state;events=enqueue(m,r.events);m.timing.passes=0;break;
 }
 case "attach":{
  const a=m.rules.attachment;
  check(allows(m,"attach")&&a&&Array.isArray(a.zones)&&a.zones.length&&m.timing.active===actor&&!m.timing.queue.length&&!m.windowClosed,"Attachment unavailable");
  const ids=selectCards(m.state,actor,{zones:a.zones,controller:"self",face:"up"});
  check(ids.includes(action.id)&&ids.includes(action.host)&&a.definitions.includes(m.state.objects[action.id].definition),"Invalid attachment");
  const r=attachCard(m.state,{id:action.id,host:action.host,onHostMove:a.onHostMove,max:a.max});
  m.state=r.state;events=enqueue(m,r.events);m.timing.passes=0;break;
 }
 case "nextPhase":{
  check(m.windowClosed&&m.timing.active===actor&&!m.timing.queue.length&&m.rules.phases&&(m.phaseIndex??0)<m.rules.phases.length-1,"Phase cannot advance");
  m.phaseIndex++;m.windowClosed=false;events=enqueue(m,[{type:"phaseStarted",actor,phase:phase(m).id}]);break;
 }
 case "endTurn":{
  check(m.windowClosed&&m.timing.active===actor&&!m.timing.queue.length&&(!m.rules.phases||(m.phaseIndex??0)===m.rules.phases.length-1),"Window must close or phases remain");
  const players=m.state.players,next=players[(players.indexOf(actor)+1)%players.length];
  const expired=expireStatuses(m.state);m.state=expired.state;
  m.timing=changeActive(m.timing,next);m.turn++;m.phaseIndex=0;m.windowClosed=false;
  for(const id of Object.values(m.state.zones).filter(z=>m.rules.combat?.zones.includes(z.id)).flatMap(z=>z.cards))if(m.state.objects[id].controller===next)m.state.objects[id].orientation="ready";
  const r=refreshResources(m.state,next,{includeShared:!!m.rules.refreshShared});
  m.state=r.state;events=[...expired.events,{type:"turnStarted",actor:next},...r.events];if(phase(m))events.push({type:"phaseStarted",actor:next,phase:phase(m).id});
  for(const p of m.rules.drawPolicies??[])if(p.player===next&&p.perTurn){const n=Math.min(p.perTurn,m.state.zones[p.deck].cards.length,m.state.zones[p.hand].capacity-m.state.zones[p.hand].cards.length);const drawn=drawCards(m.state,p.deck,p.hand,n);m.state=drawn.state;events.push(...drawn.events)}
  events=enqueue(m,events);break;
 }
 default:throw Error("Unknown action");
 }
 return finish(m,events);
}
export function matchView(m,viewer){
 const state=projectState(m.state,viewer);for(const z of state.zones)for(const o of z.cards??[])if(o.id){o.keywords=keywords(m.state,o.id)}
 const activations=[];
 if(!m.result&&!m.battle&&!m.triggerOrderPending&&!m.openingQueue?.length&&!m.pending&&m.timing.priority===viewer)for(const [id,e] of Object.entries(m.rules.effects)){const sources=e.sourceDefinition?selectCards(m.state,viewer,{zones:e.sourceZones,controller:"self",definition:e.sourceDefinition,face:"up"}):[undefined];for(const source of sources)if(eligible(m,viewer,id,e,source))for(const p of paymentPlans(e)){const option=paymentOptions(m.state,viewer,p);if(option)activations.push({effect:id,source,...option})}}
 const available=[...new Set(activations.filter(a=>a.source===undefined&&a.id==="default"&&!a.groups.length).map(a=>a.effect))];
 return {state,triggerOrder:m.triggerOrderPending?{actor:m.triggerOrderPending.actor,ids:m.triggerOrderPending.actor===viewer?m.triggerOrderPending.ids:undefined}:null,combat:combatOptions(m,viewer),combatActor:m.battle?.defender??null,phase:phase(m)?.id??null,phaseActions:phase(m)?.actions??["activate","attack","attach"],hasNextPhase:!!m.rules.phases&&(m.phaseIndex??0)<m.rules.phases.length-1,opening:m.openingQueue?.length?{actor:m.openingQueue[0].player,remaining:m.openingQueue[0].player===viewer?m.openingQueue[0].remaining:undefined}:null,turn:m.turn,active:m.timing.active,priority:m.timing.priority,queue:m.timing.queue.map(({id,actor,effect})=>({id,actor,effect})),choice:choiceView(m.pending,viewer),available,activations,windowClosed:m.windowClosed,result:m.result,resources:structuredClone(m.state.resourcePools)};
}
