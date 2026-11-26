import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
import {aiProfile,evaluatePosition,chooseStrategicAction,decisionActor} from "../kernel/strategic-ai.js";
import {benchmarkAI} from "../kernel/ai-benchmark.js";
test("strategic profiles are bounded and choose deterministic legal actions",()=>{
 const m=createMatch(demoModule());
 assert.equal(aiProfile({weights:{board:100}}).weights.board,5);
 for(const difficulty of ["easy","normal","hard"])for(const personality of ["balanced","aggressive","defensive","economic"]){
  const p={difficulty,personality},a=chooseStrategicAction(m,"a",p);
  assert.deepEqual(a,chooseStrategicAction(m,"a",p));assert.doesNotThrow(()=>applyMatchAction(m,"a",a));
 }
 assert.equal(chooseStrategicAction(m,"b"),null);
});
test("hidden opponent card identities do not change evaluation or decisions",()=>{
 const r=demoModule(),m=createMatch(r),other=structuredClone(m);other.state.objects.c6.definition="blade";
 assert.equal(evaluatePosition(matchView(m,"a"),r,"a"),evaluatePosition(matchView(other,"a"),r,"a"));
 assert.deepEqual(chooseStrategicAction(m,"a"),chooseStrategicAction(other,"a"));
});
test("bounded AI simulations are reproducible and report action budgets",()=>{
 const options={games:2,maxActions:30,maxTurns:5,profiles:{a:{difficulty:"hard"},b:{difficulty:"easy"}}};
 const a=benchmarkAI(demoModule(),options),b=benchmarkAI(demoModule(),options);
 assert.deepEqual(a,b);assert.equal(a.games,2);assert.ok(a.results.every(r=>r.actions<=30));assert.equal(a.reasons.error??0,0);assert.equal(a.reasons.stalled??0,0);
});
