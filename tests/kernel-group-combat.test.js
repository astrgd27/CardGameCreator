import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
const act=(m,p,a)=>applyMatchAction(m,p,a).match;
function fixture(){const r=demoModule();r.combat.group={maxAttackers:3,assignment:"lethal",lifeResource:"energy"};r.combat.stats.sentinel={attack:4,health:3};r.combat.stats.raider={attack:3,health:4};return r}
test("multiple attacks, blockers and direct damage resolve simultaneously",()=>{
 let m=createMatch(fixture());
 m=act(m,"a",{type:"declareCombat",attacks:[{attacker:"c1",kind:"player",target:"b"},{attacker:"c3",kind:"player",target:"b"}]});
 assert.equal(matchView(m,"b").combat.stage,"block");
 assert.throws(()=>act(m,"a",{type:"pass"}));
 m=act(m,"b",{type:"block",blocks:[{blocker:"c2",attacker:"c1"}]});
 assert.ok(m.state.zones["discard-a"].cards.includes("c1"));assert.ok(m.state.zones["discard-b"].cards.includes("c2"));
 assert.equal(m.battle,null);
});
test("unblocked player attacks reduce configured life and can win",()=>{
 const r=fixture();r.victory=[{type:"resourceAtMost",player:"b",resource:"energy",amount:0}];
 let m=createMatch(r);m=act(m,"a",{type:"declareCombat",attacks:[{attacker:"c1",kind:"player",target:"b"}]});
 m=act(m,"b",{type:"block",blocks:[]});assert.equal(m.state.resourcePools["player-b"].energy,0);
 // Demo defeat triggers are not relevant here; victory follows empty queue.
 assert.equal(m.result?.winner,"a");
});
test("active player may reorder simultaneous triggers only by permutation",()=>{
 const r=fixture();r.triggerOrder="player";r.triggers=[{id:"one",actor:"a",effect:"salvageA",event:"combatResolved"},{id:"two",actor:"b",effect:"salvageB",event:"combatResolved"}];
 let m=createMatch(r);m=act(m,"a",{type:"declareCombat",attacks:[{attacker:"c1",kind:"card",target:"c2"}]});m=act(m,"b",{type:"block",blocks:[]});
 const ids=matchView(m,"a").triggerOrder.ids;assert.equal(ids.length,2);
 assert.throws(()=>act(m,"b",{type:"orderTriggers",ids}));
 assert.throws(()=>act(m,"a",{type:"orderTriggers",ids:[ids[0],ids[0]]}));
 m=act(m,"a",{type:"orderTriggers",ids:[...ids].reverse()});assert.deepEqual(m.timing.queue.map(q=>q.id),[...ids].reverse());
});
