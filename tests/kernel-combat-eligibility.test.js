import test from "node:test";
import assert from "node:assert/strict";
import {referenceModules} from "../reference-modules.js";
import {createMatch,applyMatchAction} from "../kernel/runtime.js";
import {combatOptions} from "../kernel/group-combat.js";
import {addCard} from "../kernel/objects.js";
test("Ringworld ready recruits cannot be targeted but leaders can",()=>{
 const m=createMatch(referenceModules()[3]);
 const added=addCard(m.state,{definition:"recruit-b",owner:"b",zone:"field"});m.state=added.state;
 assert.ok(combatOptions(m,"a").targets.some(t=>t.id==="c2"));
 assert.ok(!combatOptions(m,"a").targets.some(t=>t.id===added.id));
 m.state.objects[added.id].orientation="resting";
 assert.ok(combatOptions(m,"a").targets.some(t=>t.id===added.id));
});
test("Generation Wars cannot block from another battlefield",()=>{
 const m=createMatch(referenceModules()[4]);
 m.state.zones.field.cards=m.state.zones.field.cards.filter(id=>id!=="c1"&&id!=="c2");
 m.state.zones.ridge.cards.push("c1");m.state.zones.crossing.cards.push("c2");
 m.battle={stage:"block",actor:"a",defender:"b",attacks:[{attacker:"c1",kind:"card",target:"c2"}],boosts:{},used:[]};
 assert.deepEqual(combatOptions(m,"b").attackersByBlocker.c2,[]);
 assert.throws(()=>applyMatchAction(m,"b",{type:"block",blocks:[{attacker:"c1",blocker:"c2"}]}));
});
