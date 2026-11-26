// Configurable combat math; caller authorizes attacks and selects eligible targets.
import {moveWithAttachments} from "./attachments.js";
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const check=(ok,m)=>{if(!ok)throw Error(m)};
function unit(s,id){check(typeof id==="string"&&Object.hasOwn(s.objects,id),"Unknown combatant");return s.objects[id]}
function zone(s,id){const z=Object.values(s.zones).find(z=>z.cards.includes(id));check(z,"Missing combatant zone");return z.id}
function value(stats,s,id,name){
 const def=unit(s,id).definition;
 check(Object.hasOwn(stats,def)&&integer(stats[def][name]),"Missing combat statistic");
 return stats[def][name];
}
export function resolveCombat(state,{attacker,defender,stats,retaliate=true,defeatZones}){
 check(attacker!==defender&&typeof retaliate==="boolean","Invalid combat");
 const a=unit(state,attacker),d=unit(state,defender);
 check(a.controller!==d.controller&&a.face==="up"&&d.face==="up"&&a.orientation==="ready","Ineligible combatants");
 const strike=value(stats,state,attacker,"attack"),counter=retaliate?value(stats,state,defender,"attack"):0;
 const ah=value(stats,state,attacker,"health"),dh=value(stats,state,defender,"health");
 check(ah>0&&dh>0&&integer(a.damage)&&integer(d.damage)&&a.damage<ah&&d.damage<dh,"Invalid combat health");
 check(integer(a.damage+counter)&&integer(d.damage+strike),"Damage overflow");
 let next=structuredClone(state);const events=[];
 next.objects[attacker].orientation="resting";
 for(const [id,amount] of [[defender,strike],[attacker,counter]]){
  next.objects[id].damage+=amount;
  if(amount)events.push({type:"damageDealt",id,amount});
 }
 const defeated=[[defender,dh],[attacker,ah]].filter(([id,h])=>next.objects[id].damage>=h);
 for(const [id] of defeated){
  const owner=next.objects[id].owner;
  check(defeatZones&&Object.hasOwn(defeatZones,owner),"Missing defeat destination");
  const result=moveWithAttachments(next,{id,from:zone(next,id),to:defeatZones[owner],reset:true});
  next=result.state;events.push({type:"combatDefeat",id},...result.events);
 }
 return {state:next,events};
}
// Each rule identifies a player who loses when a condition becomes true.
// Multiple losers are handled together, so simultaneous defeat can draw.
export function evaluateVictory(s,rules){
 check(Array.isArray(rules)&&rules.length>0&&rules.length<=100,"Invalid victory rules");
 const losers=new Set();
 for(const r of rules){
  check(r&&s.players.includes(r.player),"Invalid victory player");
  if(r.type==="emptyZone"){
   check(typeof r.zone==="string"&&Object.hasOwn(s.zones,r.zone),"Unknown victory zone");
   if(s.zones[r.zone].cards.length===0)losers.add(r.player);
  }else if(r.type==="resourceAtMost"){
   const pool=s.resourcePools?.["player-"+r.player];
   check(pool&&typeof r.resource==="string"&&Object.hasOwn(pool,r.resource)&&integer(r.amount),"Invalid victory resource");
   if(pool[r.resource]<=r.amount)losers.add(r.player);
  }else throw Error("Unsupported victory rule");
 }
 const remaining=s.players.filter(p=>!losers.has(p));
 return {losers:[...losers],winner:remaining.length===1&&losers.size?remaining[0]:null,draw:remaining.length===0};
}
