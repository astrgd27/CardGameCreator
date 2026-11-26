// Definition keywords and conditional, face-up public auras. No executable module code.
export function keywords(state,id){
 const o=state.objects[id];if(!o)return [];
 return [...new Set([...(state.keywordRules?.definitions?.[o.definition]??[]),...(o.statuses??[])])];
}
export function hasRule(state,id,rule){
 const tags=keywords(state,id);return tags.some(k=>(state.keywordRules?.keywords?.[k]?.restrictions??[]).includes(rule));
}
export function passiveModifiers(state,id,stat,turn=0){
 const target=state.objects[id],out=[];if(!target)return out;
 const zones=Object.values(state.zones),location=zones.find(z=>z.cards.includes(id));
 for(const [i,p] of (state.keywordRules?.passives??[]).entries()){
  if(p.stat!==stat||!p.targetZones.includes(location?.id)||p.targetKeyword&&!keywords(state,id).includes(p.targetKeyword)||p.targetDefinition&&target.definition!==p.targetDefinition)continue;
  for(const z of zones.filter(z=>z.visibility==="public"&&p.sourceZones.includes(z.id)))for(const sid of z.cards){
   const source=state.objects[sid];if(source.face!=="up"||source.definition!==p.sourceDefinition)continue;
   if(p.relation==="self"&&sid!==id||p.relation==="friendly"&&source.controller!==target.controller||p.relation==="enemy"&&source.controller===target.controller)continue;
   if(p.requiresStatus&&!source.statuses?.includes(p.requiresStatus))continue;
   if(p.minimumCounter&&(source.counters[p.minimumCounter.name]??0)<p.minimumCounter.amount)continue;
   if(p.minimumTurn!==undefined&&turn<p.minimumTurn)continue;
   out.push({id:"passive-"+i+"-"+sid,op:p.op,value:p.value});
   if(out.length>100)throw Error("Passive modifier budget exceeded");
  }
 }
 return out;
}
