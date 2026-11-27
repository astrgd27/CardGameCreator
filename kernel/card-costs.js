// Payment plans are trusted rules; choices are untrusted instance IDs.
import {selectCards} from "./selectors.js";
import {payResources} from "./resources.js";
import {moveWithAttachments,detachCard,attachCard} from "./attachments.js";
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
export function materialEligible(state,id,c){const a=state.attributes?.[state.objects[id].definition]??{};return (c.hostBinding!=="source"||!!c.attachedTo)&&id!==c.attachedTo&&(!c.definition||state.objects[id].definition===c.definition)&&(!c.attribute||a[c.attribute]===c.value)&&(c.kind==="material"||!c.attachedTo||state.attachments?.[id]?.host===c.attachedTo)&&(c.kind!=="detach"||!!state.attachments?.[id])}
export function paymentPlans(effect){return [{id:"default",costs:effect.costs??[],cardCosts:effect.cardCosts??[]},...(effect.alternatives??[])]}
export function payPlan(state,actor,plan,ids=[]){
 check(Array.isArray(ids)&&new Set(ids).size===ids.length,"Duplicate payment cards");
 let {state:next,events}=payResources(state,actor,plan.costs??[]);let offset=0;
 for(const cost of plan.cardCosts??[]){
  const chosen=ids.slice(offset,offset+cost.count);offset+=cost.count;
  check(chosen.length===cost.count,"Missing payment cards");
  const eligible=selectCards(next,actor,{zones:[cost.from],controller:"self",...(cost.definition?{definition:cost.definition}:{}),...(cost.kind==="discard"?{owner:"self"}:{face:"up"})});
  check(chosen.every(id=>eligible.includes(id)&&materialEligible(next,id,cost)),"Invalid payment card");
  if(cost.totalLevel!==undefined)check(chosen.reduce((n,id)=>n+(next.attributes?.[next.objects[id].definition]?.level??0),0)===cost.totalLevel,"Incorrect material level total");
  if(cost.totalRating!==undefined){let sums=new Set([0]);for(const id of chosen){const rating=next.attributes?.[next.objects[id].definition]?.linkRating??1;sums=new Set([...sums].flatMap(n=>[n+1,n+rating]))}check(sums.has(cost.totalRating),"Incorrect material rating total")}
  for(const id of chosen){if(cost.kind==="detach"){const d=detachCard(next,id);next=d.state;events.push(...d.events)}const r=moveWithAttachments(next,{id,from:cost.from,to:cost.to,face:"up"});next=r.state;if(cost.kind==="material"){const host=next.objects[cost.attachedTo];check(host&&host.controller===actor&&next.zones[cost.to].cards.includes(host.id),"Invalid material host");const attached=attachCard(next,{id,host:host.id,onHostMove:"follow"});next=attached.state;events.push(...attached.events)}events.push(...r.events,{type:cost.kind==="detach"?"materialDetached":cost.kind==="discard"?"cardDiscarded":"cardSacrificed",id,actor})}
 }
 check(offset===ids.length,"Unexpected payment cards");return {state:next,events};
}
export function paymentOptions(state,actor,plan){
 const groups=(plan.cardCosts??[]).map(c=>({count:c.count,kind:c.kind,ids:selectCards(state,actor,{zones:[c.from],controller:"self",...(c.definition?{definition:c.definition}:{}),...(c.kind==="discard"?{owner:"self"}:{face:"up"})}).filter(id=>materialEligible(state,id,c))}));
 if(groups.some(g=>g.ids.length<g.count))return null;
 // Bounded matching ensures at least one disjoint legal payment.
 const slots=groups.flatMap(g=>Array.from({length:g.count},()=>g.ids)),assigned=new Map();
 function assign(i,seen){for(const id of slots[i]){if(seen.has(id))continue;seen.add(id);if(!assigned.has(id)||assign(assigned.get(id),seen)){assigned.set(id,i);return true}}return false}
 if(!slots.every((_,i)=>assign(i,new Set())))return null;
 const example=Array(slots.length);for(const [id,i] of assigned)example[i]=id;
 try{payPlan(state,actor,plan,example);return {id:plan.id,groups,example}}catch{let budget=4096;function search(chosen){if(--budget<0)return null;if(chosen.length===slots.length){try{payPlan(state,actor,plan,chosen);return chosen}catch{return null}}for(const id of slots[chosen.length])if(!chosen.includes(id)){const result=search([...chosen,id]);if(result)return result;if(budget<0)break}return null}const alternative=search([]);return alternative?{id:plan.id,groups,example:alternative}:null}
}
