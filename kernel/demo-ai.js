// Bounded public-information opponent. Never scores concealed card identities.
import {applyMatchAction,matchView} from "./runtime.js";
export function chooseDemoAction(match,actor){
 const v=matchView(match,actor);
 if(v.result)return null;
 if(v.opening)return v.opening.actor===actor?{type:"keep"}:null;
 const candidates=[];
 if(v.choice){
  if(v.choice.actor!==actor)return null;
  for(const value of v.choice.options??[])candidates.push({action:{type:"choose",value},score:1});
 }else{
  if(v.priority!==actor)return null;
  if(v.windowClosed&&v.active===actor)candidates.push({action:{type:v.hasNextPhase?"nextPhase":"endTurn"},score:100});
  if(v.active===actor&&!v.queue.length&&!v.windowClosed){
   const combat=match.rules.combat,attachment=match.rules.attachment;
   const cards=zones=>v.state.zones.filter(z=>zones?.includes(z.id)).flatMap(z=>z.cards??[]);
   const gearCards=cards(attachment?.zones);
   for(const g of gearCards.filter(c=>c.controller===actor&&attachment?.definitions.includes(c.definition)&&!match.state.attachments?.[c.id])){
    for(const h of gearCards.filter(c=>c.controller===actor&&c.id!==g.id&&!attachment.definitions.includes(c.definition)))candidates.push({action:{type:"attach",id:g.id,host:h.id},score:30});
   }
   const units=cards(combat?.zones).filter(c=>combat?.stats?.[c.definition]&&!attachment?.definitions.includes(c.definition));
   for(const a of units.filter(c=>c.controller===actor&&c.orientation==="ready"&&c.face==="up")){
    for(const d of units.filter(c=>c.controller!==actor&&c.face==="up")){
     const as=combat.stats[a.definition],ds=combat.stats[d.definition];
     const damage=Math.min(as.attack,ds.health-d.damage),counter=combat.retaliate===false?0:Math.min(ds.attack,as.health-a.damage);
     const score=8+damage-counter+(as.attack>=ds.health-d.damage?12:0)-(counter>=as.health-a.damage?15:0);
     candidates.push({action:{type:"attack",attacker:a.id,defender:d.id},score});
    }
   }
  }
  if(!v.queue.length&&!v.windowClosed)for(const effect of v.available){
   // Avoid repeating no-cost effects indefinitely. The per-turn budget is
   // tracked by the browser; this conservative policy also prefers passing
   // over an effect which has neither a source card nor a spending cost.
   const e=match.rules.effects[effect];
   if(e.requiresCard||e.costs?.some(c=>c.kind==="spend"&&c.amount>0))candidates.push({action:{type:"activate",effect},score:20});
  }
  candidates.push({action:{type:"pass"},score:0});
 }
 candidates.sort((a,b)=>b.score-a.score);
 for(const {action} of candidates.slice(0,100)){
  try{applyMatchAction(match,actor,action);return action}catch{}
 }
 return null;
}
