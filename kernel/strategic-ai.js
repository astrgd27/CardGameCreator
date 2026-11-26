import {paymentCandidates,publicSimulationSafe} from "./ai-information.js";
// Public-information evaluation, bounded candidate search and deterministic tie breaks.
import {applyMatchAction,matchView} from "./runtime.js";

export const personalities={
 balanced:{board:1,life:1,resource:1,hand:1,pressure:1},
 aggressive:{board:1,life:2,resource:.5,hand:.7,pressure:2},
 defensive:{board:1.5,life:2,resource:1,hand:1,pressure:.5},
 economic:{board:.8,life:1,resource:2,hand:1.8,pressure:.6}
};
export function aiProfile(p={}){
 const personality=Object.hasOwn(personalities,p.personality)?p.personality:"balanced";
 const difficulty=["easy","normal","hard"].includes(p.difficulty)?p.difficulty:"normal";
 const weights={...personalities[personality]};
 for(const k of Object.keys(weights))if(Number.isFinite(p.weights?.[k]))weights[k]=Math.max(0,Math.min(5,p.weights[k]));
 return {personality,difficulty,weights};
}
export function evaluatePosition(view,rules,actor,profile={}){
 const w=aiProfile(profile).weights,c=rules.combat,field=c?.zones??[],life=c?.group?.lifeResource;
 if(view.result)return view.result.draw?0:(view.result.winners?.includes(actor)||view.result.winner===actor)?10000:-10000;
 let score=0;const friendly=p=>p===actor||view.objectives?.teams?.[p]!==undefined&&view.objectives.teams[p]===view.objectives.teams[actor];
 if(view.objectives)for(const [p,n] of Object.entries(view.objectives.scores))score+=(friendly(p)?1:-1)*n*5;
 for(const z of view.state.zones){
  if(field.includes(z.id))for(const o of z.cards??[]){if(!o.definition)continue;const s=c.stats?.[o.definition];if(!s)continue;const sign=friendly(o.controller)?1:-1;score+=sign*w.board*(2+s.attack*.8+Math.max(0,s.health-o.damage)*.6+(o.orientation==="ready"?.25:0));}
  else if(z.visibility==="owner"&&z.owner!==null)score+=(friendly(z.owner)?1:-1)*w.hand*z.count*1.4;
 }
 for(const p of rules.players){const sign=friendly(p)?1:-1;for(const [k,v] of Object.entries(view.resources["player-"+p]??{}))score+=sign*v*(k===life?w.life*2:w.resource*.5)}
 return score;
}
const actionKey=a=>JSON.stringify(a);
export function candidates(match,actor,v,cap=160){
 const out=[],add=(action,bias=0)=>{if(out.length<cap)out.push({action,bias})};
 if(v.triggerOrder){if(v.triggerOrder.actor===actor){add({type:"orderTriggers",ids:v.triggerOrder.ids});add({type:"orderTriggers",ids:[...v.triggerOrder.ids].reverse()})}return out}
 if(v.opening){if(v.opening.actor===actor)add({type:"keep"});return out}
 if(v.choice){if(v.choice.actor===actor)for(const value of v.choice.options??[])add({type:"choose",value});return out}
 if(v.combat?.stage==="react"){add({type:"combatContinue"});for(const r of v.combat.reactions)for(const target of v.combat.attackers)add({type:"combatReact",id:r.id,rule:r.rule,target},r.amount*.8-.6);return out}
 if(v.combat?.stage==="assign"){add({type:"assignDamage",assignments:v.combat.assignments.map(a=>({attacker:a.attacker,amounts:a.blockers.map((b,i)=>i===0?Math.max(0,a.power):0)}))});return out}
 if(v.combat?.stage==="block"){
  const c=v.combat;add({type:"block",blocks:[]});
  for(const blocker of c.blockers)for(const attacker of c.attackersByBlocker?.[blocker]??c.attackers)add({type:"block",blocks:[{blocker,attacker}]});
  add({type:"block",blocks:c.blockers.slice(0,c.attackers.length).map((blocker,i)=>({blocker,attacker:c.attackers[i]}))});return out;
 }
 if(v.priority!==actor)return out;
 if(v.windowClosed&&v.active===actor){add({type:v.hasNextPhase?"nextPhase":"endTurn"},100);return out}
 add(v.scheduler?.canPassOut?{type:"passOut"}:{type:"pass"});
 if(v.scheduler?.canClaim)add({type:"claimInitiative"},.1);
 for(const g of v.generators??[])add({type:"generate",id:g.id,generator:g.generator},.4);
 for(const o of v.stackOptions??[])add({type:"stack",...o},2);
 for(const o of v.spatial?.moves??[])add({type:"moveSpatial",id:o.id,to:o.to},0);
 const combat=match.rules.combat,attachment=match.rules.attachment,cards=zones=>v.state.zones.filter(z=>zones?.includes(z.id)).flatMap(z=>z.cards??[]).filter(c=>c.id);
 if(v.combat?.stage==="declare"){
  const c=v.combat;
  for(const t of c.targets){for(const attacker of c.attackers.filter(id=>(c.targetsByAttacker?.[id]??c.targets).some(x=>x.kind===t.kind&&x.id===t.id)))add({type:"declareCombat",attacks:[{attacker,kind:t.kind,target:t.id}]},3);if(c.attackers.length)add({type:"declareCombat",attacks:c.attackers.filter(id=>(c.targetsByAttacker?.[id]??c.targets).some(x=>x.kind===t.kind&&x.id===t.id)).slice(0,c.max).map(attacker=>({attacker,kind:t.kind,target:t.id}))},4)}
 }else if(v.active===actor&&!v.queue.length&&!v.windowClosed){
  const units=cards(combat?.zones).filter(c=>combat?.stats?.[c.definition]&&!attachment?.definitions.includes(c.definition));
  for(const a of units.filter(c=>c.controller===actor&&c.orientation==="ready"&&c.face==="up"))for(const d of units.filter(c=>c.controller!==actor&&c.face==="up"))for(const p of combat.attackProfiles?.[a.definition]??[null])add({type:"attack",attacker:a.id,defender:d.id,...(p?{profile:p.id}:{})},1);
 }
 if(v.active===actor&&!v.queue.length&&!v.windowClosed){
  const gear=cards(attachment?.zones).filter(c=>c.controller===actor&&c.face==="up");
  for(const g of gear.filter(c=>attachment?.definitions.includes(c.definition)))for(const h of gear.filter(c=>c.id!==g.id&&!attachment.definitions.includes(c.definition)))add({type:"attach",id:g.id,host:h.id},2);
 }
 if(!v.windowClosed&&!v.queue.length)for(const a of v.activations??[]){
  const e=match.rules.effects[a.effect];
  // Do not repeatedly queue the same source/effect while awaiting resolution.
  if(v.queue.some(q=>q.actor===actor&&q.effect===a.effect))continue;
  if(!a.dynamic&&!a.source&&!e.limit&&!e.requiresCard&&!a.groups.length&&!e.costs?.some(c=>c.kind==="spend"&&c.amount>0)&&!e.alternatives?.find(p=>p.id===a.id)?.costs?.some(c=>c.kind==="spend"&&c.amount>0))continue;
  for(const action of paymentCandidates(a,Math.min(32,cap)))add(action,2);
 }
 return out;
}
// Resolve queued public effects via passes, stopping before choices or concealed draws.
// Do not inspect newly revealed cards or rank outcomes involving hidden information.
function projectedScore(match,actor,action,profile,initial,next){
 const rules=match.rules,card=id=>initial.state.zones.flatMap(z=>z.cards??[]).find(c=>c.id===id),stats=id=>rules.combat?.stats?.[card(id)?.definition]??{attack:0,health:0};
 if(action.type==="choose"){const label=initial.choice?.labels?.[action.value],s=rules.combat?.stats?.[label];return s?s.attack+s.health*.5:action.value==="accept"?.2:0}
 if(action.type==="declareCombat")return action.attacks.reduce((n,a)=>n+stats(a.attacker).attack*.7,0);
 if(action.type==="block")return action.blocks.reduce((n,b)=>n+Math.min(stats(b.blocker).health,stats(b.attacker).attack)-Math.max(0,stats(b.attacker).attack-stats(b.blocker).health)*.5,0);
 if(action.type==="moveSpatial"){const r=initial.spatial?.moves.find(x=>x.id===action.id&&x.to===action.to),objective=rules.objectives?.locations?.find(x=>x.zone===action.to);return (objective&&initial.objectives?.captures[action.to]!==actor?(objective.capturePoints??0)*5+1:0)-(r?.cost??0)*.5}
 if(action.type==="stack")return 2+Math.max(0,stats(action.material).attack-stats(action.host).attack);
 if(action.type==="attack"){const a=stats(action.attacker),d=stats(action.defender);return Math.min(a.attack,d.health-(card(action.defender)?.damage??0))*.7-Math.min(d.attack,a.health-(card(action.attacker)?.damage??0))*.6+(a.attack>=d.health-(card(action.defender)?.damage??0)?3:0)}
 if(action.type==="activate"){const e=rules.effects[action.effect];return 1+(e.program.filter(op=>["token","move","awardScore","lifeDamage","draw"].includes(op.type)).length)-(action.cards?.length??0)*.6-(action.payment?.generators?.length??0)*.15}
 if(!publicSimulationSafe(match,initial,action))return 0;
 return evaluatePosition(matchView(next,actor),rules,actor,profile)-evaluatePosition(initial,rules,actor,profile);
}
// Public-only tactical continuation: at most eight root candidates and twelve replies.
// No speculative opponent hand, deck, pending choice, or hidden draw is evaluated.
function tacticalContinuation(match,actor,view,action,next,profile){
 if(!publicSimulationSafe(match,view,action)||action.type!=="attack"||match.rules.players.length!==2||next.result||next.pending||next.timing.queue.length)return 0;
 const base=evaluatePosition(matchView(next,actor),match.rules,actor,profile);
 const enemy=match.rules.players.find(p=>p!==actor);
 let worst=base;
 // Project a public enemy attack after the current turn's pass/end sequence.
 // Refuse to cross draw, refresh-trigger or state-dependent boundaries.
 if(match.rules.drawPolicies?.length||match.rules.scheduler||match.rules.phases||match.rules.tokenPolicy||match.rules.keywordRules||match.rules.permissionRules||match.rules.combat?.modifiers?.length||match.rules.combat?.replacements?.length)return 0;
 try{
  let future=next;for(let i=0;i<2;i++)future=applyMatchAction(future,future.timing.priority,{type:"pass"}).match;
  if(!future.windowClosed||future.timing.active!==actor)return 0;
  future=applyMatchAction(future,actor,{type:"endTurn"}).match;
  if(future.result||future.timing.active!==enemy)return 0;
  const enemyView=matchView(future,enemy),replies=candidates(future,enemy,enemyView,60).filter(x=>x.action.type==="attack"&&publicSimulationSafe(future,enemyView,x.action)).slice(0,12);
  const baseline=evaluatePosition(matchView(future,actor),match.rules,actor,profile);let loss=0;
  for(const reply of replies){try{const r=applyMatchAction(future,enemy,reply.action).match;loss=Math.min(loss,evaluatePosition(matchView(r,actor),match.rules,actor,profile)-baseline)}catch{}}
  return loss*.65;
 }catch{return 0}
}
export function chooseStrategicAction(match,actor,input={}){
 const p=aiProfile(input),v=matchView(match,actor);
 if(v.result||decisionActor(match)!==actor)return null;
 const budget={easy:20,normal:60,hard:160}[p.difficulty],items=candidates(match,actor,v,budget);
 let best=null,bestScore=-Infinity;const ranked=[];
 for(const item of items){
  try{const next=applyMatchAction(match,actor,item.action).match;
   const score=p.difficulty==="easy"?item.bias:projectedScore(match,actor,item.action,p,v,next)+item.bias*p.weights.pressure;
   ranked.push({action:item.action,score,next:p.difficulty==="hard"&&item.action.type==="attack"?next:null});
   if(score>bestScore||(score===bestScore&&best&&actionKey(item.action)<actionKey(best))){bestScore=score;best=item.action}
  }catch{}
 }
 if(p.difficulty==="hard"&&ranked.length){ranked.sort((a,b)=>b.score-a.score||actionKey(a.action).localeCompare(actionKey(b.action)));let top=null,topScore=-Infinity;for(const r of ranked.slice(0,8)){const score=r.score+(r.next?tacticalContinuation(match,actor,v,r.action,r.next,p):0);if(score>topScore){top=r.action;topScore=score}}return top}
 return best;
}
export function decisionActor(m){return m.promotion?.actor??m.openingQueue?.[0]?.player??m.triggerOrderPending?.actor??(m.battle?.stage==="react"?m.battle.reactionActor??m.battle.defender:m.battle?.stage==="assign"?m.battle.actor:m.battle?.defender)??m.pending?.actor??m.timing.priority}
