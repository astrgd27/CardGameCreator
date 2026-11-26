// Only visible candidate cards are offered; the runtime adjudicates legality.
import {applyMatchAction,matchView} from "./runtime.js";
export function legalCardTargets(match,actor,source){
 const v=matchView(match,actor),out=[];
 if(v.result||v.opening||v.priority!==actor&&!v.choice)return out;
 const cards=v.state.zones.flatMap(z=>z.cards??[]).filter(c=>c.id);
 if(v.choice){if(v.choice.actor!==actor)return out;for(const c of cards)if(v.choice.options?.includes(c.id))out.push({id:c.id,action:{type:"choose",value:c.id}});return out}
 if(!cards.some(c=>c.id===source))return out;
 for(const c of cards){if(c.id===source)continue;for(const action of [{type:"attack",attacker:source,defender:c.id},{type:"attach",id:source,host:c.id}]){
  try{applyMatchAction(match,actor,action);out.push({id:c.id,action})}catch{}
 }}
 return out;
}
