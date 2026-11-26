import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
import {evaluate,validateExpression} from "../kernel/expressions.js";
import {deriveStatistic} from "../kernel/modifiers.js";
const act=(m,p,a)=>applyMatchAction(m,p,a).match;
test("bounded expressions and multi-target counter operation",()=>{
 const r=demoModule();r.triggers=[];r.attributes={sentinel:{rank:3},blade:{rank:1}};
 r.effects.mark={available:true,program:[{type:"eachCounter",selector:{zones:["field"],controller:"self"},counter:"rank",expression:{ref:"attribute",key:"rank"}}]};
 let m=createMatch(r);assert.equal(evaluate({op:"mul",args:[2,3]},m.state),6);assert.throws(()=>validateExpression({op:"eval",args:[]}));assert.throws(()=>evaluate({op:"mul",args:[Number.MAX_SAFE_INTEGER,2]},m.state));
 m=act(m,"a",{type:"activate",effect:"mark"});m=act(m,"a",{type:"pass"});m=act(m,"b",{type:"pass"});assert.equal(m.state.objects.c1.counters.rank,3);assert.equal(m.state.objects.c3.counters.rank,1);
});
test("typed attributes restrict actions and conditional layers apply in declared order",()=>{
 const r=demoModule();r.attributes={sentinel:{pacifist:true}};r.permissionRules=[{rule:"cannotAttack",when:{ref:"attribute",key:"pacifist"}}];
 const m=createMatch(r);assert.throws(()=>act(m,"a",{type:"attack",attacker:"c1",defender:"c2"}));
 assert.equal(deriveStatistic(m.state,"c1","attack",2,[{id:"double",stat:"attack",op:"multiply",value:2,layer:0},{id:"plus",stat:"attack",op:"add",value:3,layer:1,when:{ref:"attribute",key:"pacifist"}}]).value,7);
});
test("state-based checks stabilize and cycles reject transaction",()=>{
 const r=demoModule();r.stabilization={moves:[{from:"field",to:"discard-a",when:{op:"eq",args:[{ref:"attribute",key:"fragile"},true]}}]};r.attributes={blade:{fragile:true}};
 const m=createMatch(r);assert.ok(m.state.zones["discard-a"].cards.includes("c3"));
 r.stabilization.moves.push({from:"discard-a",to:"field",when:true});assert.throws(()=>createMatch(r),/cycle|budget/);
});
test("ordered non-damage replacements and event bindings",()=>{
 const r=demoModule();r.zones.push({id:"deck-a",owner:"a",visibility:"hidden",capacity:5});r.setup.push({definition:"blade",owner:"a",zone:"deck-a"},{definition:"ward",owner:"a",zone:"deck-a"});
 r.effects.draw={available:true,program:[{type:"draw",from:"deck-a",to:"hand-a",count:2}]};r.effects.mark={program:[{type:"counter",choice:"moved",counter:"seen",delta:1}]};
 r.triggers=[{id:"mark",actor:"a",effect:"mark",event:"cardMoved",bindings:{moved:"id"}}];r.eventReplacements=[{id:"less",event:"draw",op:"reduce",amount:1,order:0},{id:"redirect",event:"draw",op:"redirect",to:"discard-a",order:1}];
 let m=createMatch(r);m=act(m,"a",{type:"activate",effect:"draw"});m=act(m,"a",{type:"pass"});m=act(m,"b",{type:"pass"});assert.deepEqual(m.state.zones["discard-a"].cards,["c7"]);m=act(m,"a",{type:"pass"});m=act(m,"b",{type:"pass"});assert.equal(m.state.objects.c7.counters.seen,1);
});
