// Deterministic bounded opponent policy for the generalized demo.
// Candidate actions are checked through the same transaction API as human actions.
import {applyMatchAction,matchView} from "./runtime.js";
export function chooseDemoAction(match,actor){
 const v=matchView(match,actor);
 if(v.result)return null;
 if(v.choice){
  if(v.choice.actor!==actor)return null;
  for(const value of v.choice.options??[]){const action={type:"choose",value};try{applyMatchAction(match,actor,action);return action}catch{}}
  return null;
 }
 if(v.priority!==actor)return null;
 const candidates=[];
 if(v.windowClosed&&v.active===actor)candidates.push({type:"endTurn"});
 if(v.active===actor&&!v.queue.length&&!v.windowClosed){
  const field=v.state.zones.find(z=>z.id==="field")?.cards??[];
  const own=field.filter(c=>c.controller===actor),enemy=field.filter(c=>c.controller!==actor&&c.face==="up");
  for(const gear of own.filter(c=>match.rules.attachment?.definitions.includes(c.definition)&&!match.state.attachments?.[c.id])){
   for(const host of own.filter(c=>c.id!==gear.id&&!match.rules.attachment.definitions.includes(c.definition)))candidates.push({type:"attach",id:gear.id,host:host.id});
  }
  for(const a of own.filter(c=>c.orientation==="ready"&&!match.rules.attachment?.definitions.includes(c.definition))){
   for(const d of enemy.filter(c=>!match.rules.attachment?.definitions.includes(c.definition)))candidates.push({type:"attack",attacker:a.id,defender:d.id});
  }
 }
 if(!v.queue.length&&!v.windowClosed)for(const effect of v.available)candidates.push({type:"activate",effect});
 candidates.push({type:"pass"});
 for(const action of candidates.slice(0,100)){
  try{applyMatchAction(match,actor,action);return action}catch{}
 }
 return null;
}
