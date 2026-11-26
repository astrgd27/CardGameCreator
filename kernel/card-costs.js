// Payment plans are trusted rules; choices are untrusted instance IDs.
import {selectCards} from "./selectors.js";
import {payResources} from "./resources.js";
import {moveWithAttachments} from "./attachments.js";
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
export function paymentPlans(effect){return [{id:"default",costs:effect.costs??[],cardCosts:effect.cardCosts??[]},...(effect.alternatives??[])]}
export function payPlan(state,actor,plan,ids=[]){
 check(Array.isArray(ids)&&new Set(ids).size===ids.length,"Duplicate payment cards");
 let {state:next,events}=payResources(state,actor,plan.costs??[]);let offset=0;
 for(const cost of plan.cardCosts??[]){
  const chosen=ids.slice(offset,offset+cost.count);offset+=cost.count;
  check(chosen.length===cost.count,"Missing payment cards");
  const eligible=selectCards(next,actor,{zones:[cost.from],controller:"self",...(cost.kind==="discard"?{owner:"self"}:{face:"up"})});
  check(chosen.every(id=>eligible.includes(id)),"Invalid payment card");
  for(const id of chosen){const r=moveWithAttachments(next,{id,from:cost.from,to:cost.to,face:"up"});next=r.state;events.push(...r.events,{type:cost.kind==="discard"?"cardDiscarded":"cardSacrificed",id,actor})}
 }
 check(offset===ids.length,"Unexpected payment cards");return {state:next,events};
}
export function paymentOptions(state,actor,plan){
 const groups=(plan.cardCosts??[]).map(c=>({count:c.count,kind:c.kind,ids:selectCards(state,actor,{zones:[c.from],controller:"self",...(c.kind==="discard"?{owner:"self"}:{face:"up"})})}));
 if(groups.some(g=>g.ids.length<g.count))return null;
 // Bounded matching ensures at least one disjoint legal payment.
 const slots=groups.flatMap(g=>Array.from({length:g.count},()=>g.ids)),assigned=new Map();
 function assign(i,seen){for(const id of slots[i]){if(seen.has(id))continue;seen.add(id);if(!assigned.has(id)||assign(assigned.get(id),seen)){assigned.set(id,i);return true}}return false}
 if(!slots.every((_,i)=>assign(i,new Set())))return null;
 const example=Array(slots.length);for(const [id,i] of assigned)example[i]=id;
 try{payPlan(state,actor,plan,example);return {id:plan.id,groups,example}}catch{return null}
}
