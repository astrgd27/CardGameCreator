import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction} from "../kernel/runtime.js";
import {chooseDemoAction} from "../kernel/demo-ai.js";
test("AI respects priority and returns deterministic legal moves",()=>{
 let m=createMatch(demoModule());
 assert.equal(chooseDemoAction(m,"b"),null);
 m=applyMatchAction(m,"a",{type:"pass"}).match;
 const action=chooseDemoAction(m,"b");
 assert.deepEqual(action,chooseDemoAction(m,"b"));
 assert.deepEqual(action,{type:"activate",effect:"musterB"});
 const before=structuredClone(m);applyMatchAction(m,"b",action);
 assert.deepEqual(m,before);
});
test("two automated demo seats progress through multiple turns without illegal moves",()=>{
 let m=createMatch(demoModule());
 for(let i=0;i<100&&m.turn<6;i++){
  const actor=m.pending?.actor??m.timing.priority;
  const action=chooseDemoAction(m,actor);
  assert.ok(action,"No AI action at turn "+m.turn);
  m=applyMatchAction(m,actor,action).match;
 }
 assert.ok(m.turn>=6);
});
