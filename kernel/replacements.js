import {hasRule} from "./keywords.js";
// Ordered damage replacement rules; each rule applies at most once per event.
const check=(ok,m)=>{if(!ok)throw Error(m)};
export function replaceDamage(state,event,rules=[]){
 check(event?.type==="damageDealt"&&Object.hasOwn(state.objects,event.id)&&Number.isSafeInteger(event.amount)&&event.amount>=0,"Invalid damage event");
 check(Array.isArray(rules)&&rules.length<=100,"Invalid replacement budget");
 let next={...event};
 if(hasRule(state,event.id,"damageImmune"))return {event:{...next,amount:0},applied:["keyword-immunity"]};const applied=[],seen=new Set();
 for(const r of rules){
  check(r&&typeof r.id==="string"&&r.id.length>0&&!seen.has(r.id)&&["prevent","reduce","redirect"].includes(r.op),"Invalid replacement");
  seen.add(r.id);
  check(r.target===undefined||Object.hasOwn(state.objects,r.target),"Invalid replacement target");
  check(r.op!=="reduce"||(Number.isSafeInteger(r.amount)&&r.amount>=0),"Invalid reduction");
  check(r.op!=="redirect"||Object.hasOwn(state.objects,r.to),"Invalid redirection");
  if(!next.amount||(r.target!==undefined&&r.target!==next.id))continue;
  if(r.op==="prevent")next.amount=0;
  if(r.op==="reduce")next.amount=Math.max(0,next.amount-r.amount);
  if(r.op==="redirect")next.id=r.to;
  applied.push(r.id);
 }
 if(hasRule(state,next.id,"damageImmune"))next.amount=0;
 return {event:next,applied};
}
