import {createMatch,applyMatchAction} from "./runtime.js";
import {chooseStrategicAction,decisionActor,aiProfile} from "./strategic-ai.js";
export function simulateMatch(module,{seed=1,profiles={},maxActions=250,maxTurns=40,profileTiming=false}={}){
 if(!Number.isSafeInteger(maxActions)||maxActions<1||maxActions>5000||!Number.isSafeInteger(maxTurns)||maxTurns<1||maxTurns>500)throw Error("Invalid simulation budget");
 let m=createMatch(module,{seed}),actions=0,reason="budget",error=null;
 const types={},durations=[];
 while(!m.result&&actions<maxActions&&m.turn<=maxTurns){
  const actor=decisionActor(m);
  try{const started=profileTiming?performance.now():0;const a=chooseStrategicAction(m,actor,profiles[actor]??module.ai??{});if(profileTiming)durations.push(performance.now()-started);if(!a){reason="stalled";break}m=applyMatchAction(m,actor,a).match;actions++;types[a.type]=(types[a.type]??0)+1}catch(e){reason="error";error=e.message;break}
 }
 if(m.result)reason=m.result.draw?"draw":"winner";else if(m.turn>maxTurns)reason="turn-limit";
 return {seed,actions,turns:m.turn,reason,winner:m.result?.winner??null,error,types,...(profileTiming?{decisionMs:durations}: {})};
}
export function benchmarkAI(module,{games=10,seed=1,profiles={},maxActions=250,maxTurns=40,profileTiming=false}={}){
 if(!Number.isSafeInteger(games)||games<1||games>200)throw Error("Invalid game count");
 const results=[],wins=Object.fromEntries(module.players.map(p=>[p,0])),reasons={},actions={};
 for(let i=0;i<games;i++){
  const r=simulateMatch(module,{seed:seed+i,profiles,maxActions,maxTurns,profileTiming});results.push(r);if(r.winner)wins[r.winner]++;reasons[r.reason]=(reasons[r.reason]??0)+1;for(const [k,v] of Object.entries(r.types))actions[k]=(actions[k]??0)+v;
 }
 const times=results.flatMap(r=>r.decisionMs??[]).sort((a,b)=>a-b);
 return {games,wins,reasons,...(profileTiming?{profiling:{decisions:times.length,meanMs:times.reduce((n,x)=>n+x,0)/Math.max(1,times.length),p95Ms:times[Math.max(0,Math.ceil(times.length*.95)-1)]??0,maxMs:times.at(-1)??0}}:{}),meanActions:results.reduce((n,r)=>n+r.actions,0)/games,meanTurns:results.reduce((n,r)=>n+r.turns,0)/games,actions,results};
}
