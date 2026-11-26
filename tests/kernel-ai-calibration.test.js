import test from "node:test";
import assert from "node:assert/strict";
import {terminalModules} from "../kernel/ai-terminal-modules.js";
import {benchmarkAI} from "../kernel/ai-benchmark.js";
import {createMatch,applyMatchAction} from "../kernel/runtime.js";
import {chooseStrategicAction} from "../kernel/strategic-ai.js";
test("terminal calibration fixtures finish under bounded actions for each difficulty",()=>{
 for(const module of terminalModules())for(const difficulty of ["easy","normal","hard"]){
  const options={games:2,maxActions:120,maxTurns:30,profiles:Object.fromEntries(module.players.map(p=>[p,{difficulty}]))};
  const report=benchmarkAI(module,options);
  assert.equal(report.reasons.error??0,0,module.name);
  assert.equal(report.reasons.stalled??0,0,module.name);
  assert.equal((report.reasons.winner??0)+(report.reasons.draw??0),2,module.name+" "+difficulty);
  assert.deepEqual(report,benchmarkAI(module,options));
 }
});
test("hard public counterattack search is deterministic and legal",()=>{
 const m=createMatch(terminalModules()[0]);const p={difficulty:"hard"};
 const a=chooseStrategicAction(m,"a",p);assert.deepEqual(a,chooseStrategicAction(m,"a",p));assert.doesNotThrow(()=>applyMatchAction(m,"a",a));
});
