import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
import {changeCardState,createTokens} from "../kernel/card-state.js";
test("card state changes preserve identity and conceal flipped opponents",()=>{
 const rules=demoModule();
 rules.effects.state={available:true,actors:["a"],program:[
 {type:"token",definition:"blade",zone:"field",count:2},
 {type:"counter",id:"c1",counter:"charge",delta:3},
 {type:"status",id:"c1",status:"stunned",operation:"add"},
 {type:"transform",id:"c1",definition:"raider"},
 {type:"control",id:"c1",player:"b"},
 {type:"orient",id:"c1",orientation:"tapped"},
 {type:"flip",id:"c1",face:"down"}
 ]};
 let m=createMatch(rules);
 for(const [p,a] of [["a",{type:"activate",effect:"state"}],["a",{type:"pass"}],["b",{type:"pass"}]])m=applyMatchAction(m,p,a).match;
 const c=m.state.objects.c1;
 assert.equal(c.definition,"raider");assert.equal(c.owner,"a");assert.equal(c.controller,"b");assert.equal(c.orientation,"tapped");assert.equal(c.face,"down");assert.equal(c.counters.charge,3);assert.deepEqual(c.statuses,["stunned"]);
 assert.equal(m.state.objects.c7.token,true);assert.equal(m.state.objects.c8.token,true);
 assert.deepEqual(matchView(m,"b").state.zones.find(z=>z.id==="field").cards[0],{face:"down"});
});
test("state operations are immutable and bounded",()=>{
 const m=createMatch(demoModule()),s=m.state;
 const r=changeCardState(s,"a","c1",{type:"counter",counter:"charge",delta:3});
 assert.equal(s.objects.c1.counters.charge,undefined);
 assert.deepEqual(changeCardState(r.state,"a","c1",{type:"counter",counter:"charge",delta:-4}).state.objects.c1.counters,{});
 assert.throws(()=>createTokens(s,"a",{definition:"blade",zone:"field",count:20}));
 assert.equal(s.zones.field.cards.length,4);
 assert.throws(()=>changeCardState(s,"a","c1",{type:"control",player:"unknown"}));
 assert.throws(()=>changeCardState(s,"a","c1",{type:"counter",counter:"__proto__",delta:1}));
});
