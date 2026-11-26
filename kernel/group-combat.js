import {teamOf} from "./objectives.js";
import {inRange} from "./spatial.js";
import {damageCards} from "./hidden-zones.js";
import {hasRule} from "./keywords.js";
// Opt-in two-seat declaration combat. All assignments use the pre-damage state.
import {selectCards} from "./selectors.js";
import {deriveStatistic} from "./modifiers.js";
import {replaceDamage} from "./replacements.js";
import {moveWithAttachments} from "./attachments.js";
import {changeResource} from "./resources.js";
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const units=(m,actor,side,ready=false)=>selectCards(m.state,actor,{zones:m.rules.combat.zones,controller:side,face:"up",...(ready?{orientation:"ready"}:{})}).filter(id=>m.rules.combat.stats[m.state.objects[id].definition]&&(!m.rules.combat.group.unitDefinitions||m.rules.combat.group.unitDefinitions.includes(m.state.objects[id].definition)));
const power=(m,id)=>deriveStatistic(m.state,id,"attack",m.rules.combat.stats[m.state.objects[id].definition].attack,m.rules.combat.modifiers??[],{turn:m.turn}).value+(m.battle?.boosts?.[id]??0);
const health=(m,id)=>deriveStatistic(m.state,id,"health",m.rules.combat.stats[m.state.objects[id].definition].health,m.rules.combat.modifiers??[],{turn:m.turn}).value;
export function battleActor(m){return m.battle?.stage==="react"?m.battle.reactionActor??m.battle.defender:m.battle?.stage==="assign"?m.battle.actor:m.battle?.defender??null}
function reactions(m,actor){const p=m.rules.combat.group,opts=[];for(const r of p.reactions??[])for(const id of selectCards(m.state,actor,{zones:r.zones,owner:"self",controller:"self",definition:r.definition,face:"up"}))if(!m.battle.used?.includes(id))opts.push({id,rule:r.id,amount:r.amount});return opts}
export function combatOptions(m,actor){
 const c=m.rules.combat?.group;if(!c||m.timing.players.length!==2)return null;
 const battle=m.battle,enemy=m.timing.players.find(p=>p!==actor);if(teamOf(m,enemy)===teamOf(m,actor))return null;
 if(battle?.stage==="react")return (battle.reactionActor??battle.defender)===actor?{stage:"react",reactions:reactions(m,actor),attackers:battle.attacks.map(a=>a.attacker)}:null;
 if(battle?.stage==="assign")return battle.actor===actor?{stage:"assign",assignments:battle.attacks.filter(a=>battle.blocks.some(b=>b.attacker===a.attacker)).map(a=>({attacker:a.attacker,power:Math.max(0,power(m,a.attacker)),blockers:battle.blocks.filter(b=>b.attacker===a.attacker).map(b=>({id:b.blocker,lethal:Math.max(0,health(m,b.blocker)-m.state.objects[b.blocker].damage)}))})),overflow:!!c.overflow}:null;
 if(battle)return battle.stage==="block"&&battle.defender===actor?{stage:"block",attackers:battle.attacks.map(a=>a.attacker),blockers:units(m,actor,"self",c.readyBlockers!==false).filter(id=>!hasRule(m.state,id,"cannotBlock")).filter(id=>!c.guardStatus||m.state.objects[id].statuses?.includes(c.guardStatus)),attacks:battle.attacks,attackersByBlocker:Object.fromEntries(units(m,actor,"self",c.readyBlockers!==false).map(id=>[id,battle.attacks.filter(a=>inRange(m.state,id,a.attacker,m.state.spatial?.blockRange??Infinity)&&(c.intercept!=="direct"||a.kind==="player")).map(a=>a.attacker)])),intercept:c.intercept??"all"}:null;
 if(m.result||m.promotion||m.openingQueue?.length||m.triggerOrderPending||m.timing.active!==actor||m.timing.priority!==actor||m.windowClosed||m.pending||m.timing.queue.length||m.timing.resolving||m.rules.phases&&!m.rules.phases[m.phaseIndex].actions.includes("attack")||m.combatUsed===m.turn)return null;
 const targets=units(m,actor,"opponent").filter(id=>m.timing.players.includes(m.state.objects[id].controller)&&teamOf(m,m.state.objects[id].controller)!==teamOf(m,actor)).filter(id=>!hasRule(m.state,id,"cannotBeAttacked")).map(id=>({kind:"card",id}));
 if(c.lifeResource||c.lifeCards?.[enemy])targets.push({kind:"player",id:enemy});
 return {stage:"declare",attackers:units(m,actor,"self",true).filter(id=>!hasRule(m.state,id,"cannotAttack")),targets,targetsByAttacker:Object.fromEntries(units(m,actor,"self",true).map(id=>[id,targets.filter(t=>t.kind==="player"||inRange(m.state,id,t.id)&&(!c.sameBattlefield||c.sameBattlefield.includes(Object.values(m.state.zones).find(z=>z.cards.includes(id))?.id)&&Object.values(m.state.zones).some(z=>z.cards.includes(id)&&z.cards.includes(t.id))))])),max:c.maxAttackers??10};
}
export function declareCombat(m,actor,attacks){
 const options=combatOptions(m,actor);check(options?.stage==="declare","Cannot declare attacks");
 check(Array.isArray(attacks)&&attacks.length>0&&attacks.length<=options.max&&new Set(attacks.map(a=>a.attacker)).size===attacks.length,"Invalid attackers");
 for(const a of attacks)check(options.attackers.includes(a.attacker)&&options.targetsByAttacker[a.attacker]?.some(t=>t.kind===a.kind&&t.id===a.target),"Invalid attack target");
 const defender=m.timing.players.find(p=>p!==actor);
 m.battle={stage:"block",actor,defender,attacks:structuredClone(attacks),boosts:{},used:[]};m.combatUsed=m.turn;
 return [{type:"attackersDeclared",actor,count:attacks.length}];
}
export function advanceBattle(m,actor,action){
 const b=m.battle,p=m.rules.combat.group,v=combatOptions(m,actor);check(v,"Combat decision unavailable");
 if(b.stage==="block"){
  check(action.type==="block","Blocking decision required");const blocks=action.blocks;
  check(Array.isArray(blocks)&&blocks.length<=20&&new Set(blocks.map(x=>x.blocker)).size===blocks.length&&blocks.every(x=>v.blockers.includes(x.blocker)&&v.attackers.includes(x.attacker)),"Invalid blocks");
  check(blocks.every(x=>inRange(m.state,x.blocker,x.attacker,m.state.spatial?.blockRange??Infinity)),"Blocker outside range");
  if(p.intercept==="direct")check(blocks.every(x=>b.attacks.find(a=>a.attacker===x.attacker).kind==="player"),"Only direct attacks can be intercepted");
  b.blocks=structuredClone(blocks);
  if(p.reactions?.length){b.stage="react";b.reactionActor=b.defender;b.reactionPasses=0;return [{type:"blockersDeclared",actor,count:blocks.length}]}
 }else if(b.stage==="react"){
  if(action.type==="combatReact"){
   const r=v.reactions.find(x=>x.id===action.id&&x.rule===action.rule);check(r,"Invalid reaction");
   const rule=p.reactions.find(x=>x.id===r.rule),target=action.target;
   check(v.attackers.includes(target),"Invalid reaction target");
   const from=Object.values(m.state.zones).find(z=>z.cards.includes(r.id)).id;
   const moved=moveWithAttachments(m.state,{id:r.id,from,to:rule.destination,face:"up",reset:true});m.state=moved.state;b.used.push(r.id);b.boosts[target]=(b.boosts[target]??0)+(p.twoSidedReactions&&actor===b.actor?r.amount:-r.amount);if(p.twoSidedReactions){b.reactionActor=actor===b.actor?b.defender:b.actor;b.reactionPasses=0}return [...moved.events,{type:"combatReaction",actor,amount:r.amount}];
  }
  check(action.type==="combatContinue","Reaction decision required");if(p.twoSidedReactions&&++b.reactionPasses<2){b.reactionActor=actor===b.actor?b.defender:b.actor;return [{type:"combatReactionPassed",actor}]}
 }else if(b.stage==="assign"){
  check(action.type==="assignDamage"&&Array.isArray(action.assignments)&&action.assignments.length===v.assignments.length,"Invalid assignment");
  const seen=new Set();for(const row of action.assignments){
   const a=v.assignments.find(x=>x.attacker===row.attacker);check(a&&!seen.has(row.attacker)&&Array.isArray(row.amounts)&&row.amounts.length===a.blockers.length,"Invalid assignment row");seen.add(row.attacker);
   const total=row.amounts.reduce((n,x)=>{check(Number.isSafeInteger(x)&&x>=0,"Invalid damage amount");return n+x},0),available=Math.max(0,a.power);
   check(total<=available&&(total===available||p.overflow&&b.attacks.find(x=>x.attacker===row.attacker).kind==="player"&&row.amounts.every((x,i)=>x>=a.blockers[i].lethal)),"Damage must be assigned");
  }b.assignments=structuredClone(action.assignments);return resolveGroupCombat(m,b.defender,b.blocks,true);
 }
 if(p.assignment==="manual"&&b.blocks.length){b.stage="assign";return [{type:"damageAssignmentStarted",actor:b.actor}]}
 return resolveGroupCombat(m,b.defender,b.blocks,true);
}
export function resolveGroupCombat(m,actor,blocks,validated=false){
 const b=m.battle,c=m.rules.combat,policy=c.group,options=combatOptions(m,actor);
 check((validated||options?.stage==="block")&&Array.isArray(blocks)&&blocks.length<=20&&new Set(blocks.map(x=>x.blocker)).size===blocks.length,"Invalid blockers");
 if(!validated)for(const x of blocks){check(options.blockers.includes(x.blocker)&&options.attackers.includes(x.attacker),"Invalid block");check(!policy.guardStatus||m.state.objects[x.blocker].statuses?.includes(policy.guardStatus),"Guard status required")}
 const state=m.state,next=structuredClone(state),events=[],damage=new Map(),life=new Map(),lifeHits=new Map();
 const hitLife=(player,n)=>{if(n<=0)return;life.set(player,(life.get(player)??0)+n);lifeHits.set(player,(lifeHits.get(player)??0)+1)};
 const stat=(id,k)=>deriveStatistic(state,id,k,c.stats[state.objects[id].definition][k],c.modifiers??[],{turn:m.turn}).value;
 const hit=(id,amount)=>{const r=replaceDamage(state,{type:"damageDealt",id,amount,damageType:policy.damageType??"combat"},c.replacements??[]);for(const rule of r.applied)events.push({type:"damageReplaced",rule,id});if(r.event.amount){damage.set(r.event.id,(damage.get(r.event.id)??0)+r.event.amount);events.push(r.event)}};
 for(const a of b.attacks){
  next.objects[a.attacker].orientation="resting";
  const guards=blocks.filter(x=>x.attacker===a.attacker).map(x=>x.blocker);
  if(guards.length){
   let remaining=Math.max(0,power(m,a.attacker));const manual=b.assignments?.find(x=>x.attacker===a.attacker)?.amounts;
   for(const [i,id] of guards.entries()){const n=manual?manual[i]:policy.assignment==="even"?Math.floor(remaining/(guards.length-i)):i===guards.length-1&&!policy.overflow?remaining:Math.min(remaining,Math.max(0,stat(id,"health")-state.objects[id].damage));remaining-=n;hit(id,n);if(c.retaliate!==false)hit(a.attacker,stat(id,"attack"))}
   if(policy.overflow&&remaining>0&&a.kind==="player")hitLife(a.target,remaining);
  }else if(a.kind==="card"){const attack=Math.max(0,power(m,a.attacker)),defense=stat(a.target,"attack");if(policy.comparison==="power"){if(attack>=defense)hit(a.target,Math.max(0,health(m,a.target)-state.objects[a.target].damage));if(c.retaliate!==false&&defense>=attack)hit(a.attacker,Math.max(0,health(m,a.attacker)-state.objects[a.attacker].damage))}else{hit(a.target,attack);if(c.retaliate!==false)hit(a.attacker,defense)}}
  else hitLife(a.target,Math.max(0,power(m,a.attacker)));
 }
 let result=next;
 for(const [id,n] of damage){check(Number.isSafeInteger(n+result.objects[id].damage),"Damage overflow");result.objects[id].damage+=n}
 for(const [player,n] of life){const r=policy.lifeCards?.[player]?damageCards(result,player,policy.lifeCards[player],policy.lifeCards[player].perAttack?lifeHits.get(player):n):changeResource(result,player,policy.lifeResource,-n,{overflow:"clamp"});result=r.state;events.push(...r.events)}
 const defeated=[...damage.keys()].filter(id=>result.objects[id].damage>=stat(id,"health"));
 for(const id of defeated){const from=Object.values(result.zones).find(z=>z.cards.includes(id)).id,to=c.defeatZones[result.objects[id].owner];const r=moveWithAttachments(result,{id,from,to,reset:true});result=r.state;events.push({type:"combatDefeat",id,definition:state.objects[id].definition,owner:state.objects[id].owner,controller:state.objects[id].controller,from,damage:state.objects[id].damage+(damage.get(id)??0)},...r.events)}
 m.state=result;m.battle=null;m.timing.passes=0;return [{type:"combatResolved",actor},...events];
}
