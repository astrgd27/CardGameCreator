import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
const act=(m,p,a)=>applyMatchAction(m,p,a).match;
const pass=m=>act(act(m,"a",{type:"pass"}),"b",{type:"pass"});
test("alternate sacrifice payments and per-instance limits are enforced",()=>{
 const rules=demoModule();
 rules.effects.power={available:true,sourceDefinition:"sentinel",sourceZones:["field"],limit:{scope:"match",count:1},costs:[{resource:"energy",amount:5,kind:"spend"}],alternatives:[{id:"sacrifice",cardCosts:[{kind:"sacrifice",from:"field",to:"discard-a",count:1}]}],program:[{type:"counter",choice:"source",counter:"power",delta:2}]};
 let m=createMatch(rules);
 const a=matchView(m,"a").activations.find(a=>a.effect==="power");
 assert.equal(a.id,"sacrifice");assert.equal(a.source,"c1");
 assert.throws(()=>act(m,"a",{type:"activate",effect:"power",source:"c1",plan:"sacrifice",cards:["c2"]}));
 assert.equal(m.state.zones.field.cards.length,4);
 m=act(m,"a",{type:"activate",effect:"power",source:"c1",plan:"sacrifice",cards:["c3"]});m=pass(m);
 assert.equal(m.state.objects.c1.counters.power,2);
 assert.ok(m.state.zones["discard-a"].cards.includes("c3"));
 assert.ok(!matchView(m,"a").activations.some(a=>a.effect==="power"));
});
test("discard payments are atomic and temporary statuses expire at turn boundary",()=>{
 const rules=demoModule();
 rules.effects.discard={available:true,actors:["a"],cardCosts:[{kind:"discard",from:"hand-a",to:"discard-a",count:1}],program:[{type:"status",id:"c1",status:"stunned",operation:"add",duration:1}]};
 let m=createMatch(rules);
 assert.throws(()=>act(m,"a",{type:"activate",effect:"discard",cards:["c6"]}));
 m=act(m,"a",{type:"activate",effect:"discard",cards:["c5"]});m=pass(m);
 assert.deepEqual(m.state.objects.c1.statuses,["stunned"]);m=pass(m);m=act(m,"a",{type:"endTurn"});
 assert.deepEqual(m.state.objects.c1.statuses,[]);
});
test("tokens disappear in configured zones and IDs remain monotonic",()=>{
 const rules=demoModule();rules.tokenPolicy={zones:["discard-a"]};
 rules.effects.spawn={available:true,program:[{type:"token",definition:"blade",zone:"discard-a",count:1}]};
 let m=createMatch(rules);m=act(m,"a",{type:"activate",effect:"spawn"});m=pass(m);
 assert.equal(m.state.objects.c7,undefined);assert.equal(m.state.nextId,8);assert.equal(m.state.zones["discard-a"].cards.length,0);
});
