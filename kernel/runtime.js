// First unified runtime: trusted module definitions, untrusted player action IDs.
// No client-provided effect programs, prices, statistics or replacement rules.
import {createState,addCard,projectState,assertInvariants} from "./objects.js";
import {initializeResources,payResources,refreshResources,quotePayment} from "./resources.js";
import {attachCard,assertAttachments} from "./attachments.js";
import {createTiming,submitEffect,passPriority,changeActive} from "./timing.js";
import {submitChainLink} from "./chains.js";
import {collectTriggers} from "./triggers.js";
import {beginEffect,resumeEffect,choiceView} from "./effects.js";
import {resolveCombat,evaluateVictory} from "./combat.js";
import {selectCards} from "./selectors.js";
const check=(ok,m)=>{if(!ok)throw Error(m)};
const own=(o,k)=>typeof k==="string"&&Object.hasOwn(o??{},k);
export function createMatch(module){
 const rules=structuredClone(module);
 let state=createState(rules);
 for(const card of rules.setup??[])state=addCard(state,card).state;
 state=initializeResources(state,rules.resources??[]);
 const timing=createTiming(state.players,rules.timing);
 check(rules.effects&&typeof rules.effects==="object"&&!Array.isArray(rules.effects),"Missing effects");
 for(const e of Object.values(rules.effects))check(e&&Array.isArray(e.program)&&Array.isArray(e.costs??[]),"Invalid effect");
 for(const trigger of rules.triggers??[])check(own(rules.effects,trigger.effect),"Unknown trigger effect");
 return {version:1,rules,state,timing,pending:null,turn:1,windowClosed:false,result:null};
}
function effect(m,id){
 check(own(m.rules.effects,id),"Unknown effect");return m.rules.effects[id];
}
function eligible(m,actor,id,e){
 return e.available===true&&(e.actors===undefined||e.actors.includes(actor))&&quotePayment(m.state,actor,e.costs??[]).legal;
}
function finish(m,events){
 assertInvariants(m.state);assertAttachments(m.state);
 if(!m.pending&&!m.timing.resolving&&!m.timing.queue.length&&m.rules.victory?.length){
  const r=evaluateVictory(m.state,m.rules.victory);
  if(r.winner!==null||r.draw)m.result=r;
 }
 return {match:m,events};
}
function enqueue(m,events){
 const r=collectTriggers(m.timing,m.rules.triggers??[],events);
 m.timing=r.timing;return [...events,...r.events];
}
function resolve(m,r){
 m.state=r.state;m.timing=r.timing;m.pending=r.pending;
 return r.events;
}
export function applyMatchAction(match,actor,action){
 check(match.state.players.includes(actor)&&!match.result&&action&&typeof action.type==="string","Action unavailable");
 const m=structuredClone(match);let events=[];
 if(m.pending){
  check(action.type==="choose","Choice pending");
  events=resolve(m,resumeEffect(m.state,m.timing,m.pending,{actor,value:action.value}));
  return finish(m,events);
 }
 check(m.timing.resolving===null&&m.timing.priority===actor,"No priority");
 switch(action.type){
 case "activate":{
  const e=effect(m,action.effect);
  check(eligible(m,actor,action.effect,e),"Effect unavailable");
  const payment=payResources(m.state,actor,e.costs??[]);
  const entry={actor,effect:action.effect};
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
 case "attack":{
  const c=m.rules.combat;
  check(c&&m.timing.active===actor&&!m.timing.queue.length&&!m.windowClosed,"Combat unavailable");
  check(selectCards(m.state,actor,{zones:c.zones,controller:"self",face:"up",orientation:"ready"}).includes(action.attacker),"Invalid attacker");
  check(selectCards(m.state,actor,{zones:c.zones,controller:"opponent",face:"up"}).includes(action.defender),"Invalid defender");
  const r=resolveCombat(m.state,{...c,attacker:action.attacker,defender:action.defender,turn:m.turn});
  m.state=r.state;events=enqueue(m,r.events);m.timing.passes=0;break;
 }
 case "attach":{
  const a=m.rules.attachment;
  check(a&&m.timing.active===actor&&!m.timing.queue.length&&!m.windowClosed,"Attachment unavailable");
  const ids=selectCards(m.state,actor,{zones:a.zones,controller:"self",face:"up"});
  check(ids.includes(action.id)&&ids.includes(action.host)&&a.definitions.includes(m.state.objects[action.id].definition),"Invalid attachment");
  const r=attachCard(m.state,{id:action.id,host:action.host,onHostMove:a.onHostMove,max:a.max});
  m.state=r.state;events=enqueue(m,r.events);m.timing.passes=0;break;
 }
 case "endTurn":{
  check(m.windowClosed&&m.timing.active===actor&&!m.timing.queue.length,"Window must close");
  const players=m.state.players,next=players[(players.indexOf(actor)+1)%players.length];
  m.timing=changeActive(m.timing,next);m.turn++;m.windowClosed=false;
  const r=refreshResources(m.state,next,{includeShared:!!m.rules.refreshShared});
  m.state=r.state;events=enqueue(m,[{type:"turnStarted",actor:next},...r.events]);break;
 }
 default:throw Error("Unknown action");
 }
 return finish(m,events);
}
export function matchView(m,viewer){
 const state=projectState(m.state,viewer);
 const available=m.result||m.pending||m.timing.priority!==viewer?[]:Object.entries(m.rules.effects).filter(([id,e])=>eligible(m,viewer,id,e)).map(([id])=>id);
 return {state,turn:m.turn,active:m.timing.active,priority:m.timing.priority,queue:m.timing.queue.map(({id,actor,effect})=>({id,actor,effect})),choice:choiceView(m.pending,viewer),available,windowClosed:m.windowClosed,result:m.result,resources:structuredClone(m.state.resourcePools)};
}
