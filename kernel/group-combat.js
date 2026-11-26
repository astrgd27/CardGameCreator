// Opt-in two-seat declaration combat. All assignments use the pre-damage state.
import {selectCards} from "./selectors.js";
import {deriveStatistic} from "./modifiers.js";
import {replaceDamage} from "./replacements.js";
import {moveWithAttachments} from "./attachments.js";
import {changeResource} from "./resources.js";
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const units=(m,actor,side,ready=false)=>selectCards(m.state,actor,{zones:m.rules.combat.zones,controller:side,face:"up",...(ready?{orientation:"ready"}:{})}).filter(id=>m.rules.combat.stats[m.state.objects[id].definition]);
export function combatOptions(m,actor){
 const c=m.rules.combat?.group;if(!c||m.state.players.length!==2)return null;
 const battle=m.battle,enemy=m.state.players.find(p=>p!==actor);
 if(battle)return battle.stage==="block"&&battle.defender===actor?{stage:"block",attackers:battle.attacks.map(a=>a.attacker),blockers:units(m,actor,"self",c.readyBlockers!==false).filter(id=>!c.guardStatus||m.state.objects[id].statuses?.includes(c.guardStatus)),attacks:battle.attacks}:null;
 if(m.result||m.openingQueue?.length||m.triggerOrderPending||m.timing.active!==actor||m.timing.priority!==actor||m.windowClosed||m.pending||m.timing.queue.length||m.timing.resolving||m.rules.phases&&!m.rules.phases[m.phaseIndex].actions.includes("attack")||m.combatUsed===m.turn)return null;
 const targets=units(m,actor,"opponent").map(id=>({kind:"card",id}));
 if(c.lifeResource)targets.push({kind:"player",id:enemy});
 return {stage:"declare",attackers:units(m,actor,"self",true),targets,max:c.maxAttackers??10};
}
export function declareCombat(m,actor,attacks){
 const options=combatOptions(m,actor);check(options?.stage==="declare","Cannot declare attacks");
 check(Array.isArray(attacks)&&attacks.length>0&&attacks.length<=options.max&&new Set(attacks.map(a=>a.attacker)).size===attacks.length,"Invalid attackers");
 for(const a of attacks)check(options.attackers.includes(a.attacker)&&options.targets.some(t=>t.kind===a.kind&&t.id===a.target),"Invalid attack target");
 const defender=m.state.players.find(p=>p!==actor);
 m.battle={stage:"block",actor,defender,attacks:structuredClone(attacks)};m.combatUsed=m.turn;
 return [{type:"attackersDeclared",actor,count:attacks.length}];
}
export function resolveGroupCombat(m,actor,blocks){
 const b=m.battle,c=m.rules.combat,policy=c.group,options=combatOptions(m,actor);
 check(options?.stage==="block"&&Array.isArray(blocks)&&blocks.length<=20&&new Set(blocks.map(x=>x.blocker)).size===blocks.length,"Invalid blockers");
 for(const x of blocks){check(options.blockers.includes(x.blocker)&&options.attackers.includes(x.attacker),"Invalid block");check(!policy.guardStatus||m.state.objects[x.blocker].statuses?.includes(policy.guardStatus),"Guard status required")}
 const state=m.state,next=structuredClone(state),events=[],damage=new Map(),life=new Map();
 const stat=(id,k)=>deriveStatistic(state,id,k,c.stats[state.objects[id].definition][k],c.modifiers??[],{turn:m.turn}).value;
 const hit=(id,amount)=>{const r=replaceDamage(state,{type:"damageDealt",id,amount},c.replacements??[]);for(const rule of r.applied)events.push({type:"damageReplaced",rule,id});if(r.event.amount){damage.set(r.event.id,(damage.get(r.event.id)??0)+r.event.amount);events.push(r.event)}};
 for(const a of b.attacks){
  next.objects[a.attacker].orientation="resting";
  const guards=blocks.filter(x=>x.attacker===a.attacker).map(x=>x.blocker);
  if(guards.length){
   let remaining=stat(a.attacker,"attack");
   for(const [i,id] of guards.entries()){const n=policy.assignment==="even"?Math.floor(remaining/(guards.length-i)):i===guards.length-1?remaining:Math.min(remaining,Math.max(0,stat(id,"health")-state.objects[id].damage));remaining-=n;hit(id,n);if(c.retaliate!==false)hit(a.attacker,stat(id,"attack"))}
  }else if(a.kind==="card"){hit(a.target,stat(a.attacker,"attack"));if(c.retaliate!==false)hit(a.attacker,stat(a.target,"attack"))}
  else life.set(a.target,(life.get(a.target)??0)+stat(a.attacker,"attack"));
 }
 let result=next;
 for(const [id,n] of damage){check(Number.isSafeInteger(n+result.objects[id].damage),"Damage overflow");result.objects[id].damage+=n}
 for(const [player,n] of life){const r=changeResource(result,player,policy.lifeResource,-n,{overflow:"clamp"});result=r.state;events.push(...r.events)}
 const defeated=[...damage.keys()].filter(id=>result.objects[id].damage>=stat(id,"health"));
 for(const id of defeated){const from=Object.values(result.zones).find(z=>z.cards.includes(id)).id,to=c.defeatZones[result.objects[id].owner];const r=moveWithAttachments(result,{id,from,to,reset:true});result=r.state;events.push({type:"combatDefeat",id},...r.events)}
 m.state=result;m.battle=null;m.timing.passes=0;return [{type:"combatResolved",actor},...events];
}
