// Enumerate bounded payment candidates from the authorized player view.
function expand(rows,values,add,cap){const out=[];for(const r of rows)for(const v of values){const item=add(r,v);if(item!==null)out.push(item);if(out.length>=cap)return out}return out}
export function paymentCandidates(a,cap=32){
 const base={type:"activate",effect:a.effect,...(a.source?{source:a.source}:{}),...(a.id!=="default"?{plan:a.id}:{})};
 if(!a.dynamic)return [{...base,...(a.example?.length?{cards:a.example}:{})}];
 const d=a.dynamic;let cards=[[]];
 for(const g of a.groups??[])for(let i=0;i<g.count;i++)cards=expand(cards,g.ids,(r,v)=>r.includes(v)?null:[...r,v],cap*2).filter(Boolean).slice(0,cap);
 let payments=[{targets:{},hybrid:[],generators:[]}];
 for(const t of d.targets)payments=expand(payments,t.ids,(r,v)=>({...r,targets:{...r.targets,[t.name]:v}}),cap);
 for(const h of d.hybrid)payments=expand(payments,h.resources,(r,v)=>({...r,hybrid:[...r.hybrid,v]}),cap);
 payments=expand(payments,d.modes,(r,v)=>({...r,mode:v}),cap);
 payments=expand(payments,[...new Set([d.xMin,d.xMax,Math.floor((d.xMin+d.xMax)/2)])],(r,v)=>({...r,x:v}),cap);
 const gs=d.generators??[],sets=[[]];for(const g of gs.slice(0,10)){const more=sets.filter(s=>!s.some(x=>x.id===g.id)).map(s=>[...s,{id:g.id,generator:g.generator}]);sets.push(...more.slice(0,Math.max(0,cap-sets.length)));if(sets.length>=cap)break}
 const out=a.paymentExample?[{...base,cards:a.example??[],payment:a.paymentExample}]:[];for(let round=0;round<Math.max(sets.length,payments.length,cards.length);round++)for(let i=0;i<sets.length;i++){if(!payments.length||!cards.length)return out;const g=sets[i],p=payments[(round+i)%payments.length],c=cards[(round+i)%cards.length];out.push({...base,cards:c,payment:{...p,generators:g}});if(out.length>=cap)return out}return out;
}
// A strict information-set policy: use only the authorized projection for scoring.
// Speculation is allowed solely for known, deterministic, public operations.
export function publicSimulationSafe(match,view,action){
 const publicIds=new Set(view.state.zones.filter(z=>z.visibility==="public").flatMap(z=>z.cards??[]).filter(c=>c.definition&&c.face==="up").map(c=>c.id));
 if(match.rules.stabilization||match.rules.eventReplacements?.length||match.rules.objectives||match.rules.triggers?.length)return false;
 if(!["attack","attach","moveSpatial","stack","generate","activate"].includes(action.type))return false;
 if(action.type==="activate")return !match.timing.queue.length&&!action.source&&!action.cards?.length&&!action.payment&&match.rules.effects[action.effect].program.every(op=>op.type==="resource"||["counter","status","orient"].includes(op.type)&&publicIds.has(op.id));
 if(action.type==="stack")return publicIds.has(action.host)&&publicIds.has(action.material);
 if(action.type==="moveSpatial"||action.type==="generate")return publicIds.has(action.id);
 if(action.type==="attack")return publicIds.has(action.attacker)&&publicIds.has(action.defender);
 return publicIds.has(action.id)&&publicIds.has(action.host);
}
