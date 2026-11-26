import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
import {randomHidden,damageCards} from "../kernel/hidden-zones.js";
function fixture(){const r=demoModule();r.zones.push({id:"deck-a",owner:"a",visibility:"hidden",capacity:10},{id:"life-b",owner:"b",visibility:"hidden",capacity:5});r.setup.push({definition:"blade",owner:"a",zone:"deck-a",face:"down"},{definition:"ward",owner:"a",zone:"deck-a",face:"down"},{definition:"raider",owner:"b",zone:"life-b",face:"down"});return r}
const act=(m,p,a)=>applyMatchAction(m,p,a).match;
test("hidden search exposes labels only to authorized chooser and can reorder/reveal",()=>{
 const r=fixture();r.effects.search={available:true,actors:["a"],program:[{type:"search",name:"found",zone:"deck-a"},{type:"reorder",choice:"found",zone:"deck-a",position:"bottom"},{type:"reveal",choice:"found",audience:"self"}]};
 let m=createMatch(r);m=act(m,"a",{type:"activate",effect:"search"});m=act(m,"a",{type:"pass"});m=act(m,"b",{type:"pass"});
 assert.deepEqual(matchView(m,"a").choice.labels,{c7:"blade",c8:"ward"});assert.equal(matchView(m,"b").choice.options,undefined);
 assert.throws(()=>act(m,"b",{type:"choose",value:"c7"}));
 m=act(m,"a",{type:"choose",value:"c7"});assert.deepEqual(m.state.zones["deck-a"].cards,["c8","c7"]);
 assert.equal(matchView(m,"a").reveals[0].definition,"blade");assert.deepEqual(matchView(m,"b").reveals,[]);
});
test("seeded hidden selection and life exhaustion are deterministic",()=>{
 const m=createMatch(fixture(),{seed:42});assert.deepEqual(randomHidden(m.state,"a",{zone:"deck-a"}),randomHidden(m.state,"a",{zone:"deck-a"}));
 assert.throws(()=>randomHidden(m.state,"b",{zone:"deck-a"}));
 const p={zone:"life-b",destination:"hand-b",emptyLoss:true};const one=damageCards(m.state,"b",p,1);
 assert.ok(one.state.zones["hand-b"].cards.includes("c9"));assert.equal(one.state.ruleLosses,undefined);
 const two=damageCards(one.state,"b",p,1);assert.deepEqual(two.state.ruleLosses,["b"]);
});
test("optional effect can decline and skip its operation",()=>{
 const r=fixture();r.effects.maybe={available:true,program:[{type:"optional",name:"may",skip:1},{type:"counter",id:"c1",counter:"bonus",delta:1}]};
 let m=createMatch(r);m=act(m,"a",{type:"activate",effect:"maybe"});m=act(m,"a",{type:"pass"});m=act(m,"b",{type:"pass"});m=act(m,"a",{type:"choose",value:"decline"});assert.equal(m.state.objects.c1.counters.bonus,undefined);
});
test("required turn draw from empty deck loses",()=>{
 const r=fixture();r.zones.push({id:"deck-b",owner:"b",visibility:"hidden",capacity:10});r.drawPolicies=[{player:"b",deck:"deck-b",hand:"hand-b",perTurn:1,exhaustion:"lose"}];
 let m=createMatch(r);m=act(m,"a",{type:"pass"});m=act(m,"b",{type:"pass"});m=act(m,"a",{type:"endTurn"});assert.equal(m.result.winner,"a");
});
