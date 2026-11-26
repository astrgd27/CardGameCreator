// Public-information evaluation, bounded candidate search and deterministic tie breaks.
import {applyMatchAction,matchView} from "./runtime.js";
import {chooseDemoAction} from "./demo-ai.js";
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
 if(view.result)return view.result.draw?0:view.result.winner===actor?10000:-10000;
 let score=0;
 for(const z of view.state.zones){
  if(field.includes(z.id))for(const o of z.cards??[]){if(!o.definition)continue;const s=c.stats?.[o.definition];if(!s)continue;const sign=o.controller===actor?1:-1;score+=sign*w.board*(2+s.attack*.8+Math.max(0,s.health-o.damage)*.6+(o.orientation==="ready"?.25:0));}
  else if(z.visibility==="owner"&&z.owner!==null)score+=(z.owner===actor?1:-1)*w.hand*z.count*1.4;
 }
 for(const p of rules.players){const sign=p===actor?1:-1;for(const [k,v] of Object.entries(view.resources["player-"+p]??{}))score+=sign*v*(k===life?w.life*2:w.resource*.5)}
 return score;
}
const actionKey=a=>JSON.stringify(a);
function candidates(match,actor,v){
 const out=[],add=(action,bias=0)=>out.push({action,bias});
 if(v.triggerOrder){if(v.triggerOrder.actor===actor){add({type:"orderTriggers",ids:v.triggerOrder.ids});add({type:"orderTriggers",ids:[...v.triggerOrder.ids].reverse()})}return out}
 if(v.opening){if(v.opening.actor===actor)add({type:"keep"});return out}
 if(v.choice){if(v.choice.actor===actor)for(const value of v.choice.options??[])add({type:"choose",value});return out}
 if(v.combat?.stage==="block"){
  const c=v.combat;add({type:"block",blocks:[]});
  for(const blocker of c.blockers)for(const attacker of c.attackers)add({type:"block",blocks:[{blocker,attacker}]});
  add({type:"block",blocks:c.blockers.slice(0,c.attackers.length).map((blocker,i)=>({blocker,attacker:c.attackers[i]}))});return out;
 }
 if(v.priority!==actor)return out;
 if(v.windowClosed&&v.active===actor){add({type:v.hasNextPhase?"nextPhase":"endTurn"},100);return out}
 add(v.scheduler?.canPassOut?{type:"passOut"}:{type:"pass"});
 const combat=match.rules.combat,attachment=match.rules.attachment,cards=zones=>v.state.zones.filter(z=>zones?.includes(z.id)).flatMap(z=>z.cards??[]).filter(c=>c.id);
 if(v.combat?.stage==="declare"){
  const c=v.combat;
  for(const t of c.targets){for(const attacker of c.attackers)add({type:"declareCombat",attacks:[{attacker,kind:t.kind,target:t.id}]},3);if(c.attackers.length)add({type:"declareCombat",attacks:c.attackers.slice(0,c.max).map(attacker=>({attacker,kind:t.kind,target:t.id}))},4)}
 }else if(v.active===actor&&!v.queue.length&&!v.windowClosed){
  const units=cards(combat?.zones).filter(c=>combat?.stats?.[c.definition]&&!attachment?.definitions.includes(c.definition));
  for(const a of units.filter(c=>c.controller===actor&&c.orientation==="ready"&&c.face==="up"))for(const d of units.filter(c=>c.controller!==actor&&c.face==="up"))add({type:"attack",attacker:a.id,defender:d.id},1);
 }
 if(v.active===actor&&!v.queue.length&&!v.windowClosed){
  const gear=cards(attachment?.zones).filter(c=>c.controller===actor&&c.face==="up");
  for(const g of gear.filter(c=>attachment?.definitions.includes(c.definition)))for(const h of gear.filter(c=>c.id!==g.id&&!attachment.definitions.includes(c.definition)))add({type:"attach",id:g.id,host:h.id},2);
 }
 if(!v.queue.length&&!v.windowClosed)for(const a of v.activations??[]){
  const e=match.rules.effects[a.effect];
  if(!e.limit&&!e.requiresCard&&!a.groups.length&&!e.costs?.some(c=>c.kind==="spend"&&c.amount>0)&&!e.alternatives?.find(p=>p.id===a.id)?.costs?.some(c=>c.kind==="spend"&&c.amount>0))continue;
  add({type:"activate",effect:a.effect,...(a.source?{source:a.source}:{}),...(a.id!=="default"?{plan:a.id}:{}),...(a.example.length?{cards:a.example}:{})},2);
 }
 return out;
}
// Resolve queued public effects via passes, stopping before choices or concealed draws.
// Do not inspect newly revealed cards or rank outcomes involving hidden information.
function projectedScore(match,actor,action,profile){
 const initial=matchView(match,actor),base=evaluatePosition(initial,match.rules,actor,profile);
 let next=applyMatchAction(match,actor,action).match;
 if(action.type==="activate"){
  const program=match.rules.effects[action.effect].program;
  if(program.some(op=>["draw","target","choose","skipUnless","skipUnlessChoice","skipUnlessResource","token","move"].includes(op.type)))return 2-(action.cards?.length??0)*2;
  for(let i=0;i<match.state.players.length&&next.timing.queue.length&&!next.pending;i++)next=applyMatchAction(next,next.timing.priority,{type:"pass"}).match;
 }
 if(action.type==="declareCombat"){
  // Estimate pressure from public attack statistics; no opponent private state.
  return action.attacks.reduce((n,a)=>{const card=initial.state.zones.flatMap(z=>z.cards??[]).find(c=>c.id===a.attacker);return n+(match.rules.combat.stats[card.definition].attack??0)*.7},0);
 }
 if(action.type==="endTurn"||action.type==="nextPhase"||action.type==="pass")return 0;
 if(action.type==="choose")return 0;
 return evaluatePosition(matchView(next,actor),match.rules,actor,profile)-base;
}
export function chooseStrategicAction(match,actor,input={}){
 const p=aiProfile(input),v=matchView(match,actor);
 if(v.result)return null;
 if(p.difficulty==="easy")return chooseDemoAction(match,actor);
 const budget=p.difficulty==="hard"?160:60,items=candidates(match,actor,v);
 let best=null,bestScore=-Infinity;
 for(const item of items.slice(0,budget)){
  try{const score=projectedScore(match,actor,item.action,p)+item.bias*p.weights.pressure;
   if(score>bestScore||(score===bestScore&&best&&actionKey(item.action)<actionKey(best))){bestScore=score;best=item.action}
  }catch{}
 }
 return best??chooseDemoAction(match,actor);
}
export function decisionActor(m){return m.openingQueue?.[0]?.player??m.triggerOrderPending?.actor??m.battle?.defender??m.pending?.actor??m.timing.priority}
