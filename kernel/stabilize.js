import {evaluate} from "./expressions.js";
import {moveWithAttachments} from "./attachments.js";
import {deriveStatistic} from "./modifiers.js";
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
export function stabilize(state,rules,turn){
 if(!rules.stabilization)return {state,events:[]};
 let next=state,events=[];const seen=new Set();
 for(let step=0;step<32;step++){
  const signature=JSON.stringify(next);check(!seen.has(signature),"State stabilization cycle");seen.add(signature);
  const moves=[];
  if(rules.stabilization.lethal)for(const z of Object.values(next.zones).filter(z=>rules.combat?.zones.includes(z.id)))for(const id of z.cards){
   const o=next.objects[id],base=rules.combat.stats[o.definition]?.health;
   if(o.face==="up"&&Number.isSafeInteger(base)&&o.damage>=deriveStatistic(next,id,"health",base,rules.combat.modifiers??[],{turn}).value)moves.push({id,from:z.id,to:rules.combat.defeatZones[o.owner]});
  }
  for(const r of rules.stabilization.moves??[])for(const id of next.zones[r.from].cards){
   const o=next.objects[id];if(o.face==="up"&&evaluate(r.when,next,{self:id,actor:o.controller})===true&&!moves.some(x=>x.id===id))moves.push({id,from:r.from,to:r.to});
  }
  if(!moves.length)return {state:next,events};
  for(const move of moves){if(!next.zones[move.from].cards.includes(move.id))continue;const o=next.objects[move.id];const r=moveWithAttachments(next,{...move,reset:true});next=r.state;events.push({type:"stateBasedMove",id:move.id,definition:o.definition,owner:o.owner,controller:o.controller,from:move.from,to:move.to},...r.events);check(events.length<=100,"State-based event budget exceeded")}
 }
 throw Error("State stabilization step budget exceeded");
}
