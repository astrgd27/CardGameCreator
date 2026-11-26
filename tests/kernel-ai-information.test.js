import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
import {chooseStrategicAction,candidates} from "../kernel/strategic-ai.js";
import {paymentCandidates} from "../kernel/ai-information.js";
import {benchmarkAI} from "../kernel/ai-benchmark.js";
test("dynamic payment enumeration includes generators and respects budget",()=>{
 const a={effect:"cast",id:"default",groups:[],dynamic:{targets:[{name:"victim",ids:["c2","c4"]}],hybrid:[{resources:["red","blue"]}],modes:["default"],xMin:1,xMax:3,generators:[{id:"c3",generator:"forge"}]}};
 const rows=paymentCandidates(a,32);assert.ok(rows.length<=32);assert.ok(rows.some(r=>r.payment.generators.length));assert.ok(rows.some(r=>r.payment.hybrid.includes("blue")));assert.ok(rows.some(r=>r.payment.x===3));
});
test("spatial objective movement uses authorized candidates",()=>{
 const r=demoModule();r.triggers=[];r.zones.push({id:"site",owner:null,visibility:"public",capacity:3});r.spatial={grid:true,slots:[{zone:"field",x:0,y:0},{zone:"site",x:1,y:0}]};r.objectives={locations:[{zone:"site",capturePoints:5}]};const m=createMatch(r);
 const a=chooseStrategicAction(m,"a",{difficulty:"hard"});assert.equal(a.type,"moveSpatial");assert.equal(a.to,"site");assert.doesNotThrow(()=>applyMatchAction(m,"a",a));
});
test("concealed deck order does not affect action selection",()=>{
 const r=demoModule();r.zones.push({id:"deck-b",owner:"b",visibility:"hidden",capacity:10});r.setup.push({definition:"blade",owner:"b",zone:"deck-b"},{definition:"ward",owner:"b",zone:"deck-b"});const m=createMatch(r),other=structuredClone(m);other.state.zones["deck-b"].cards.reverse();other.state.objects.c7.definition="sentinel";for(const difficulty of ["easy","normal","hard"])assert.deepEqual(chooseStrategicAction(m,"a",{difficulty}),chooseStrategicAction(other,"a",{difficulty}));
});
test("profiling is opt-in and reports bounded nonnegative latency",()=>{
 const r=benchmarkAI(demoModule(),{games:1,maxActions:10,profileTiming:true});assert.ok(r.profiling.decisions<=10);assert.ok(r.profiling.p95Ms>=0);assert.equal(r.reasons.error??0,0);
});
