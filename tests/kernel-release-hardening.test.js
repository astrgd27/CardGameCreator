import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {terminalModules} from "../kernel/ai-terminal-modules.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
import {chooseStrategicAction,decisionActor} from "../kernel/strategic-ai.js";
import {assertInvariants} from "../kernel/objects.js";
import {assertAttachments} from "../kernel/attachments.js";
import {assertSpatial} from "../kernel/spatial.js";
import {validateModuleV2} from "../kernel/module-v2.js";
import {Zip} from "../scripts/compatibility-fixtures.mjs";
import {packPortable,unpackPortable} from "../portable-modules.js";
test("failed initial resolution rolls back state changes and releases priority",()=>{
 const r=demoModule();r.triggers=[];r.effects.risk={available:true,costs:[{kind:"spend",resource:"energy",amount:1}],program:[{type:"counter",id:"c1",counter:"mark",delta:1},{type:"resource",resource:"energy",delta:-5}]};
 let m=createMatch(r);for(const [p,a] of [["a",{type:"activate",effect:"risk"}],["a",{type:"pass"}]])m=applyMatchAction(m,p,a).match;
 const before=structuredClone(m),out=applyMatchAction(m,"b",{type:"pass"});assert.deepEqual(m,before);assert.equal(out.match.state.objects.c1.counters.mark,undefined);assert.equal(out.match.state.resourcePools["player-a"].energy,2);assert.equal(out.match.timing.resolving,null);assert.ok(out.events.some(e=>e.type==="effectFizzled"));
});
test("malformed nested schema never escapes validator as an exception",()=>{
 const mutations=[m=>m.triggers={},m=>m.triggers=[null],m=>m.effects.musterA.dynamicPayment={targets:[null]},m=>m.spatial={slots:[null]},m=>m.scheduler={mode:"alternate",gauge:true},m=>m.objectives={locations:[null]},m=>m.resources=[null],m=>m.combat={group:{reactions:[null]}}];
 for(const mutate of mutations){const m=demoModule();mutate(m);const errors=validateModuleV2(m);assert.ok(Array.isArray(errors)&&errors.length,JSON.stringify(m));assert.throws(()=>createMatch(m))}
});
test("malformed archives reject corrupted bytes, unsafe paths and duplicate asset declarations",async()=>{
 const bytes=await packPortable(demoModule(),Zip);for(const n of [0,1,10,bytes.length-20])await assert.rejects(()=>unpackPortable(bytes.slice(0,n),Zip));
 const z=await Zip.loadAsync(bytes);z.file("../rogue.txt","x");await assert.rejects(async()=>unpackPortable(await z.generateAsync({type:"uint8array"}),Zip));
 const a=await Zip.loadAsync(bytes);a.file("manifest.json",JSON.stringify({format:"card-game-creator",version:2,module:"module.json",assets:["assets/cards/a.png","assets/cards/a.png"]}));await assert.rejects(async()=>unpackPortable(await a.generateAsync({type:"uint8array"}),Zip));
});
test("seeded cross-module matches preserve invariants across legal and rejected actions",()=>{
 const spatial=demoModule();spatial.triggers=[];spatial.zones.push({id:"site",owner:null,visibility:"public",capacity:8});spatial.spatial={grid:true,slots:[{zone:"field",x:0,y:0},{zone:"site",x:1,y:0}]};spatial.objectives={winScore:5,locations:[{zone:"site",capturePoints:2,holdPoints:1,persistent:true}]};
 for(const r of [...terminalModules(),spatial])for(let seed=1;seed<=4;seed++){let m=createMatch(r,{seed});for(let i=0;i<40&&!m.result;i++){const p=decisionActor(m),before=structuredClone(m);assert.throws(()=>applyMatchAction(m,p,{type:"invalid"}));assert.deepEqual(m,before);const a=chooseStrategicAction(m,p,{difficulty:["easy","normal","hard"][(seed+i)%3]});assert.ok(a,"AI stalled: "+r.name);m=applyMatchAction(m,p,a).match;assertInvariants(m.state);assertAttachments(m.state);assertSpatial(m.state)}} 
});
test("opponent projection hides pending hidden-search labels across different deck contents",()=>{
 const r=demoModule();r.zones.push({id:"deck-a",owner:"a",visibility:"hidden",capacity:5});r.setup.push({definition:"blade",owner:"a",zone:"deck-a"},{definition:"ward",owner:"a",zone:"deck-a"});r.effects.search={available:true,program:[{type:"search",name:"found",zone:"deck-a"}]};
 let m=createMatch(r),n=structuredClone(m);n.state.objects.c7.definition="raider";n.state.zones["deck-a"].cards.reverse();
 for(const [p,a] of [["a",{type:"activate",effect:"search"}],["a",{type:"pass"}],["b",{type:"pass"}]]){m=applyMatchAction(m,p,a).match;n=applyMatchAction(n,p,a).match}
 assert.deepEqual(matchView(m,"b"),matchView(n,"b"));assert.notDeepEqual(matchView(m,"a").choice.labels,matchView(n,"a").choice.labels);
});
