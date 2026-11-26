import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
const act=(m,p,a)=>applyMatchAction(m,p,a).match;
function fixture(){
 const r=demoModule();r.resources.push({id:"red",scope:"player",initial:0,max:10},{id:"blue",scope:"player",initial:1,max:10});
 r.generators=[{id:"forge",definition:"blade",zones:["field"],resource:"red",amount:3}];
 r.effects.cast={available:true,sourceDefinition:"sentinel",sourceZones:["hand-a"],costs:[{resource:"red",amount:2,kind:"spend"}],dynamicPayment:{modes:["strike","deploy"],variable:{resource:"red",min:1,max:3},hybrid:[{resources:["red","blue"],amount:1}],targets:[{name:"victim",selector:{zones:["field"],controller:"opponent",face:"up"}}],modifiers:[{definition:"blade",zones:["field"],resource:"red",delta:-1}]},program:[{type:"move",choice:"source",from:"hand-a",to:"field"},{type:"counter",choice:"victim",counter:"marked",delta:1}]};
 return r;
}
const payment={mode:"deploy",x:1,hybrid:["blue"],targets:{victim:"c2"},generators:[{id:"c3",generator:"forge"}]};
test("dynamic source, colored hybrid variable cost and modifier commit together",()=>{
 let m=createMatch(fixture());const before=structuredClone(m);
 const a=matchView(m,"a").activations.find(a=>a.effect==="cast");
 assert.equal(a.source,"c5");assert.ok(a.dynamic.targets[0].ids.includes("c2"));assert.deepEqual(m,before);
 for(const bad of [{...payment,x:3},{...payment,targets:{victim:"c6"}},{...payment,generators:[payment.generators[0],payment.generators[0]]}]){
  assert.throws(()=>act(m,"a",{type:"activate",effect:"cast",source:"c5",payment:bad}));assert.deepEqual(m,before);
 }
 m=act(m,"a",{type:"activate",effect:"cast",source:"c5",payment});
 assert.equal(m.state.resourcePools["player-a"].red,1);assert.equal(m.state.resourcePools["player-a"].blue,0);assert.equal(m.state.objects.c3.orientation,"resting");
 m=act(m,"a",{type:"pass"});m=act(m,"b",{type:"pass"});
 assert.ok(m.state.zones.field.cards.includes("c5"));assert.equal(m.state.objects.c2.counters.marked,1);
});
test("independent generators cannot be reused while rested",()=>{
 let m=createMatch(fixture());m=act(m,"a",{type:"generate",id:"c3",generator:"forge"});
 assert.equal(m.state.resourcePools["player-a"].red,3);
 assert.throws(()=>act(m,"a",{type:"generate",id:"c3",generator:"forge"}));
 assert.equal(matchView(m,"a").generators.length,0);
});
