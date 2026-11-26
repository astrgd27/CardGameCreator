// Trusted declarative dynamic costs; clients submit only choices, never prices.
import {hasRule} from "./keywords.js";
import {selectCards} from "./selectors.js";
import {payPlan,paymentOptions} from "./card-costs.js";
import {changeResource,quotePayment} from "./resources.js";
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
export function dynamicOptions(m,actor,e,source,plan){
 const d=e.dynamicPayment;if(!d)return paymentOptions(m.state,actor,plan);
 const targets=(d.targets??[]).map(t=>({name:t.name,ids:selectCards(m.state,actor,{...t.selector,targetable:true})}));
 if(targets.some(t=>!t.ids.length))return null;
 const modes=d.modes??["default"],hybrid=(d.hybrid??[]).map(h=>({resources:h.resources,amount:h.amount}));
 const xMin=d.variable?.min??0,xMax=d.variable?.max??0;
 const generators=generatorOptions(m,actor);
 const groups=(plan.cardCosts??[]).map(c=>({kind:c.kind,count:c.count,ids:selectCards(m.state,actor,{zones:[c.from],controller:"self",...(c.kind==="discard"?{owner:"self"}:{face:"up"})})}));
 const slots=groups.flatMap(g=>Array.from({length:g.count},()=>g.ids)),assigned=new Map();
 function assign(i,seen){for(const id of slots[i]){if(seen.has(id))continue;seen.add(id);if(!assigned.has(id)||assign(assigned.get(id),seen)){assigned.set(id,i);return true}}return false}
 if(!slots.every((_,i)=>assign(i,new Set())))return null;
 const example=Array(slots.length);for(const [id,i] of assigned)example[i]=id;
 // Conservative upper bound: never advertise a plan that cannot pay even with every eligible generator.
 const optimistic=structuredClone(m.state);for(const g of generators){const r=optimistic.resourceRules[g.resource],pool=optimistic.resourcePools[r.scope==="shared"?"shared":"player-"+actor];pool[g.resource]=Math.min(r.max,pool[g.resource]+g.amount)}
 const mandatory=structuredClone(plan.costs??[]);if(d.variable)mandatory.push({kind:"spend",resource:d.variable.resource,amount:xMin});
 for(const mod of d.modifiers??[])if(mod.delta<0&&selectCards(m.state,actor,{zones:mod.zones,definition:mod.definition,controller:"self",face:"up"}).length){let left=-mod.delta;for(const c of mandatory.filter(c=>c.kind==="spend"&&c.resource===mod.resource)){const n=Math.min(left,c.amount);c.amount-=n;left-=n}}
 if(!quotePayment(optimistic,actor,mandatory).legal)return null;
 // Options are structural; affordability is rechecked atomically at commitment.
 return {id:plan.id,groups,example,dynamic:{targets,modes,hybrid,xMin,xMax,generators}};
}
export function generatorOptions(m,actor){
 return (m.rules.generators??[]).flatMap(g=>selectCards(m.state,actor,{zones:g.zones,controller:"self",definition:g.definition,face:"up",orientation:"ready"}).filter(id=>!hasRule(m.state,id,"cannotActivate")).filter(id=>{const r=m.state.resourceRules[g.resource],pool=m.state.resourcePools[r.scope==="shared"?"shared":"player-"+actor];return pool[g.resource]+g.amount<=r.max}).map(id=>({id,generator:g.id,resource:g.resource,amount:g.amount})));
}
export function generate(m,actor,selection){
 const g=generatorOptions(m,actor).find(x=>x.id===selection.id&&x.generator===selection.generator);
 check(g,"Invalid resource generator");
 const r=changeResource(m.state,actor,g.resource,g.amount,{overflow:"reject"});
 r.state.objects[g.id].orientation="resting";
 return {state:r.state,events:[{type:"orientationChanged",id:g.id,orientation:"resting"},...r.events]};
}
export function commitDynamic(m,actor,e,source,plan,action){
 const d=e.dynamicPayment;
 if(!d)return {...payPlan(m.state,actor,plan,action.cards??[]),choices:source?{source}:{}};
 const opt=dynamicOptions(m,actor,e,source,plan)?.dynamic;check(opt,"No legal targets");
 const input=action.payment??{},x=input.x??0,mode=input.mode??"default";
 check(Number.isSafeInteger(x)&&x>=opt.xMin&&x<=opt.xMax&&opt.modes.includes(mode),"Invalid variable cost or mode");
 const targets=input.targets??{};check(targets&&typeof targets==="object"&&!Array.isArray(targets)&&Object.keys(targets).length===opt.targets.length,"Invalid target count");
 const choices={...(source?{source}:{}),mode,x:String(x)};
 for(const t of opt.targets){check(t.ids.includes(targets[t.name]),"Invalid pre-commit target");choices[t.name]=targets[t.name]}
 const hybrid=input.hybrid??[];check(Array.isArray(hybrid)&&hybrid.length===opt.hybrid.length,"Invalid hybrid selection");
 const costs=structuredClone(plan.costs??[]);
 for(const [i,h] of opt.hybrid.entries()){check(h.resources.includes(hybrid[i]),"Invalid hybrid resource");costs.push({resource:hybrid[i],amount:h.amount,kind:"spend"})}
 if(d.variable)costs.push({resource:d.variable.resource,amount:x,kind:"spend"});
 for(const mod of d.modifiers??[]){
  if(!selectCards(m.state,actor,{zones:mod.zones,definition:mod.definition,controller:"self",face:"up"}).length)continue;
  const entries=costs.filter(c=>c.kind==="spend"&&c.resource===mod.resource);
  if(entries.length){let total=entries.reduce((n,c)=>n+c.amount,0)+mod.delta;total=Math.max(0,total);entries[0].amount=total;for(const c of entries.slice(1))c.amount=0}
 }
 let state=m.state,events=[];const gens=input.generators??[];check(Array.isArray(gens)&&gens.length<=20&&new Set(gens.map(g=>g.id)).size===gens.length,"Invalid generators");
 for(const g of gens){const r=generate({...m,state},actor,g);state=r.state;events.push(...r.events)}
 const paid=payPlan(state,actor,{...plan,costs},action.cards??[]);
 return {state:paid.state,events:[...events,...paid.events],choices};
}
