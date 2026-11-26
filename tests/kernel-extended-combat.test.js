import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
import {replaceDamage} from "../kernel/replacements.js";
const act=(m,p,a)=>applyMatchAction(m,p,a).match;
function fixture(){const r=demoModule();r.triggers=[];r.combat.stats.sentinel={attack:8,health:8};r.combat.group={assignment:"manual",lifeResource:"energy",overflow:true,damageType:"physical",reactions:[{id:"counter",definition:"raider",zones:["hand-b"],destination:"discard-b",amount:1}]};return r}
test("staged hand defense and manual overflow resolve atomically",()=>{
 let m=createMatch(fixture());m=act(m,"a",{type:"declareCombat",attacks:[{attacker:"c1",kind:"player",target:"b"}]});
 m=act(m,"b",{type:"block",blocks:[{blocker:"c2",attacker:"c1"}]});
 assert.equal(matchView(m,"b").combat.stage,"react");assert.equal(matchView(m,"a").combat,null);
 assert.throws(()=>act(m,"a",{type:"combatReact",id:"c6",rule:"counter",target:"c1"}));
 m=act(m,"b",{type:"combatReact",id:"c6",rule:"counter",target:"c1"});m=act(m,"b",{type:"combatContinue"});
 assert.equal(matchView(m,"a").combat.assignments[0].power,7);
 const before=structuredClone(m);assert.throws(()=>act(m,"a",{type:"assignDamage",assignments:[{attacker:"c1",amounts:[3]}]}));assert.deepEqual(m,before);
 const result=applyMatchAction(m,"a",{type:"assignDamage",assignments:[{attacker:"c1",amounts:[4]}]});m=result.match;
 assert.equal(m.state.resourcePools["player-b"].energy,0);assert.ok(m.state.zones["discard-b"].cards.includes("c2"));assert.ok(m.state.zones["discard-b"].cards.includes("c6"));
 assert.equal(result.events.find(e=>e.type==="combatDefeat").definition,"raider");assert.equal(m.battle,null);
});
test("typed prevention matches only the configured damage type",()=>{
 const m=createMatch(fixture()),rules=[{id:"shield",op:"prevent",target:"c1",damageType:"fire"}];
 assert.equal(replaceDamage(m.state,{type:"damageDealt",id:"c1",amount:2,damageType:"fire"},rules).event.amount,0);
 assert.equal(replaceDamage(m.state,{type:"damageDealt",id:"c1",amount:2,damageType:"physical"},rules).event.amount,2);
});
test("power comparison and turn cleanup",()=>{
 const r=fixture();r.combat.group={comparison:"power",intercept:"direct"};r.combat.damageCleanup="turn";let m=createMatch(r);
 m=act(m,"a",{type:"declareCombat",attacks:[{attacker:"c1",kind:"card",target:"c2"}]});
 assert.throws(()=>act(m,"b",{type:"block",blocks:[{blocker:"c4",attacker:"c1"}]}));
 m=act(m,"b",{type:"block",blocks:[]});assert.ok(m.state.zones["discard-b"].cards.includes("c2"));assert.equal(m.state.objects.c1.damage,0);
 m.state.objects.c1.damage=2;m=act(m,"a",{type:"pass"});m=act(m,"b",{type:"pass"});m=act(m,"a",{type:"endTurn"});assert.equal(m.state.objects.c1.damage,0);
});
