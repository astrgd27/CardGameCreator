import test from "node:test";
import assert from "node:assert/strict";
import {referenceModules} from "../reference-modules.js";
import {createMatch,applyMatchAction} from "../kernel/runtime.js";
import {generate} from "../kernel/dynamic-payments.js";
test("moving into enemy battlefield opens showdown and resolves simultaneous Might",()=>{
 let m=createMatch(referenceModules()[4]);
 m.state.zones.field.cards=m.state.zones.field.cards.filter(id=>id!=="c2");m.state.zones.ridge.cards.push("c2");
 m=applyMatchAction(m,"a",{type:"moveSpatial",id:"c1",to:"ridge"}).match;
 assert.equal(m.battle.showdown.zone,"ridge");assert.equal(m.battle.reactionActor,"a");
 m=applyMatchAction(m,"a",{type:"combatContinue"}).match;
 m=applyMatchAction(m,"b",{type:"combatContinue"}).match;
 assert.equal(m.battle,null);assert.ok(m.state.zones["discard-a"].cards.includes("c1"));assert.ok(m.state.zones.ridge.cards.includes("c2"));
});
test("distinct rune definitions generate distinct power",()=>{
 let m=createMatch(referenceModules()[4]);const id=m.state.zones["rune-pool-a"].cards[0],alt=m.state.objects[id].definition!=="rune-card";
 m.state=generate(m,"a",{id,generator:alt?"power-alt-a":"power-a"}).state;
 assert.equal(m.state.resourcePools["player-a"][alt?"power-alt-a":"power-a"],1);
 assert.equal(m.state.resourcePools["player-a"][alt?"power-a":"power-alt-a"],0);
});
