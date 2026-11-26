// Bounded, data-only trigger matching. Input events are trusted engine events.
import {enqueueTriggers} from "./timing.js";
const key=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(x)&&!Object.hasOwn(Object.prototype,x);
const scalar=x=>x===null||typeof x==="string"||typeof x==="boolean"||Number.isFinite(x);
export function collectTriggers(timing,rules,events){
 if(!Array.isArray(rules)||rules.length>100||!Array.isArray(events)||events.length>100)throw Error("Trigger budget exceeded");
 const entries=[],seen=new Set();
 for(const r of rules){
  if(!r||!key(r.id)||seen.has(r.id)||!key(r.event)||!key(r.effect)||!timing.players.includes(r.actor))throw Error("Invalid trigger rule");
  seen.add(r.id);
  const where=r.where??{};
  if(typeof where!=="object"||Array.isArray(where)||Object.entries(where).some(([k,v])=>!key(k)||!scalar(v)))throw Error("Invalid trigger predicate");
 }
 for(const e of events){
  if(!e||!key(e.type))throw Error("Invalid event");
  for(const r of rules){
   if(e.type!==r.event||!Object.entries(r.where??{}).every(([k,v])=>Object.hasOwn(e,k)&&e[k]===v))continue;
   entries.push({actor:r.actor,effect:r.effect,choices:{}});
   if(entries.length>100)throw Error("Trigger budget exceeded");
  }
 }
 return enqueueTriggers(timing,entries);
}
