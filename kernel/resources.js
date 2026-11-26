// Configurable integer resource pools and atomic cost evaluation.
// Trusted rule definitions provide costs; this is not an authorization API.
const validKey=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(x)&&!Object.hasOwn(Object.prototype,x);
const amount=x=>Number.isSafeInteger(x)&&x>=0;
const fail=m=>{throw Error(m)};
function resource(s,actor,id){
 if(!validKey(actor)||!s.players.includes(actor))fail("Unknown resource owner");
 if(!validKey(id)||!Object.hasOwn(s.resourceRules??{},id))fail("Unknown resource");
 const rule=s.resourceRules[id],key=rule.scope==="shared"?"shared":"player-"+actor;
 return {rule,key,value:s.resourcePools[key][id]};
}
export function initializeResources(state,definitions){
 if(!Array.isArray(definitions))fail("Invalid resource definitions");
 const next=structuredClone(state);
 if(next.resourceRules||next.resourcePools)fail("Resources already initialized");
 next.resourceRules={};next.resourcePools={shared:{}};
 for(const p of state.players)next.resourcePools["player-"+p]={};
 for(const d of definitions){
  if(!d||!validKey(d.id)||Object.hasOwn(next.resourceRules,d.id)||!["player","shared"].includes(d.scope)||
    !amount(d.initial)||!amount(d.max)||d.initial>d.max||!amount(d.refresh??0)||
    !["none","add","set"].includes(d.refreshMode??"none"))fail("Invalid resource definition");
  next.resourceRules[d.id]={id:d.id,scope:d.scope,max:d.max,initial:d.initial,refresh:d.refresh??0,refreshMode:d.refreshMode??"none"};
  const pools=d.scope==="shared"?["shared"]:state.players.map(p=>"player-"+p);
  for(const key of pools)next.resourcePools[key][d.id]=d.initial;
 }
 return next;
}
// Thresholds are checked against the original balance, not the balance
// remaining after earlier costs. Duplicate payments are aggregated.
export function quotePayment(s,actor,costs){
 if(!s.players.includes(actor)||!Array.isArray(costs))fail("Invalid payment");
 const spending=new Map(),thresholds=new Map();
 for(const c of costs){
  if(!c||!amount(c.amount)||!["spend","threshold"].includes(c.kind))fail("Invalid cost");
  resource(s,actor,c.resource);
  const target=c.kind==="spend"?spending:thresholds;
  const n=c.kind==="spend"?(target.get(c.resource)??0)+c.amount:Math.max(target.get(c.resource)??0,c.amount);
  if(!amount(n))fail("Cost overflow");target.set(c.resource,n);
 }
 const shortages=[];
 for(const id of new Set([...spending.keys(),...thresholds.keys()])){
  const {value}=resource(s,actor,id);
  const required=Math.max(spending.get(id)??0,thresholds.get(id)??0);
  if(value<required)shortages.push({resource:id,required,available:value});
 }
 return {legal:!shortages.length,shortages,spending:[...spending].map(([resource,amount])=>({resource,amount}))};
}
export function payResources(s,actor,costs){
 const quote=quotePayment(s,actor,costs);
 if(!quote.legal)fail("Insufficient resources");
 const next=structuredClone(s),events=[];
 for(const {resource:id,amount:n} of quote.spending){
  const {key,value}=resource(next,actor,id);
  next.resourcePools[key][id]=value-n;
  if(n)events.push({type:"resourceChanged",actor,resource:id,before:value,after:value-n});
 }
 return {state:next,events};
}
export function changeResource(s,actor,id,delta,{overflow="clamp"}={}){
 if(!Number.isSafeInteger(delta)||!["clamp","reject"].includes(overflow))fail("Invalid resource change");
 const {rule,key,value}=resource(s,actor,id),raw=value+delta;
 if(!Number.isSafeInteger(raw))fail("Resource overflow");
 if(overflow==="reject"&&(raw<0||raw>rule.max))fail("Resource outside bounds");
 const after=Math.max(0,Math.min(rule.max,raw)),next=structuredClone(s);
 next.resourcePools[key][id]=after;
 return {state:next,events:after===value?[]:[{type:"resourceChanged",actor,resource:id,before:value,after}]};
}
// Shared refresh is explicit, so games cannot accidentally refresh a shared
// pool once per seat. Caller chooses which phase or event performs refresh.
export function refreshResources(s,actor,{includeShared=false}={}){
 if(!s.players.includes(actor))fail("Unknown actor");
 let next=structuredClone(s);const events=[];
 for(const d of Object.values(s.resourceRules??{})){
  if(d.refreshMode==="none"||(d.scope==="shared"&&!includeShared))continue;
  const {value}=resource(next,actor,d.id);
  const delta=d.refreshMode==="set"?Math.min(d.refresh,d.max)-value:Math.min(d.refresh,d.max-value);
  const r=changeResource(next,actor,d.id,delta);next=r.state;events.push(...r.events);
 }
 return {state:next,events};
}
