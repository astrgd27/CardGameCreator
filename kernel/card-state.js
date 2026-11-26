// Trusted, transactional card-state operations for the effect interpreter.
import {addCard,assertInvariants} from "./objects.js";
const key=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(x)&&!Object.hasOwn(Object.prototype,x);
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
export function createTokens(state,actor,op){
 check(state.players.includes(actor)&&state.definitions.includes(op.definition)&&Object.hasOwn(state.zones,op.zone)&&Number.isSafeInteger(op.count)&&op.count>=1&&op.count<=20,"Invalid token creation");
 let next=state;const events=[];
 for(let i=0;i<op.count;i++){const r=addCard(next,{definition:op.definition,owner:actor,zone:op.zone,face:op.face??"up"});next=r.state;next.objects[r.id].token=true;events.push({type:"tokenCreated",id:r.id,zone:op.zone,actor})}
 return {state:next,events};
}
export function changeCardState(state,actor,id,op){
 check(state.players.includes(actor)&&key(id)&&Object.hasOwn(state.objects,id),"Unknown card");
 const next=structuredClone(state),o=next.objects[id];let event;
 switch(op.type){
 case "counter":{
  check(key(op.counter)&&Number.isSafeInteger(op.delta)&&Math.abs(op.delta)<=10000,"Invalid counter");
  const before=o.counters[op.counter]??0,after=Math.max(0,before+op.delta);check(after<=10000,"Counter limit exceeded");
  if(after)o.counters[op.counter]=after;else delete o.counters[op.counter];event={type:"counterChanged",id,counter:op.counter,before,after};break;
 }
 case "status":{
  check(key(op.status)&&["add","remove"].includes(op.operation),"Invalid status");
  o.statuses??=[];if(op.operation==="add"&&!o.statuses.includes(op.status)){check(o.statuses.length<50,"Too many statuses");o.statuses.push(op.status)}else if(op.operation==="remove")o.statuses=o.statuses.filter(s=>s!==op.status);
  o.statusDurations??={};if(op.operation==="remove"||!op.duration)delete o.statusDurations[op.status];else{check(Number.isSafeInteger(op.duration)&&op.duration>=1&&op.duration<=100,"Invalid status duration");o.statusDurations[op.status]=op.duration}
  event={type:"statusChanged",id,status:op.status,operation:op.operation};break;
 }
 case "transform":check(next.definitions.includes(op.definition),"Unknown transformation");event={type:"cardTransformed",id};o.definition=op.definition;if(next.reveals)delete next.reveals[id];break;
 case "flip":check(["up","down","toggle"].includes(op.face),"Invalid face");o.face=op.face==="toggle"?(o.face==="up"?"down":"up"):op.face;event={type:"cardFlipped",id,face:o.face};if(next.reveals)delete next.reveals[id];break;
 case "control":{const player=op.player==="self"?actor:op.player;check(next.players.includes(player),"Invalid controller");o.controller=player;event={type:"controlChanged",id,actor:player};break}
 case "orient":check(["ready","resting","tapped"].includes(op.orientation),"Invalid orientation");o.orientation=op.orientation;event={type:"orientationChanged",id,orientation:o.orientation};break;
 default:throw Error("Unsupported card-state operation");
 }
 assertInvariants(next);return {state:next,events:[event]};
}

export function expireStatuses(state){
 const next=structuredClone(state),events=[];
 for(const o of Object.values(next.objects))for(const [name,n] of Object.entries(o.statusDurations??{})){
  if(n<=1){delete o.statusDurations[name];o.statuses=(o.statuses??[]).filter(s=>s!==name);events.push({type:"statusExpired",id:o.id,status:name})}else o.statusDurations[name]=n-1;
 }
 return {state:next,events};
}
export function cleanupTokens(state,zones){
 const next=structuredClone(state),events=[];
 for(const zone of Object.values(next.zones))if(zones.includes(zone.id))for(const id of [...zone.cards])if(next.objects[id].token){
  for(const [child,link] of Object.entries(next.attachments??{}))if(child===id||link.host===id){delete next.attachments[child];events.push({type:"detached",id:child,host:link.host})}
  zone.cards=zone.cards.filter(c=>c!==id);delete next.objects[id];if(next.reveals)delete next.reveals[id];events.push({type:"tokenRemoved",id,zone:zone.id});
 }
 assertInvariants(next);return {state:next,events};
}
