import test from "node:test";
import assert from "node:assert/strict";
import {referenceModules} from "../reference-modules.js";
import {createMatch,applyMatchAction} from "../kernel/runtime.js";
import {combatOptions} from "../kernel/group-combat.js";
import {addCard} from "../kernel/objects.js";
test("paid defender counter is unavailable without momentum and spends on use",()=>{
 let m=createMatch(referenceModules()[3]);
 const a=addCard(m.state,{definition:"ward",owner:"b",zone:"hand-b"});m.state=a.state;
 m.battle={stage:"react",actor:"a",defender:"b",reactionActor:"b",attacks:[{attacker:"c1",kind:"player",target:"b"}],blocks:[],boosts:{},used:[]};
 m.state.resourcePools["player-b"].momentum=0;
 assert.ok(!combatOptions(m,"b").reactions.some(r=>r.rule==="counter-b"));
 m.state.resourcePools["player-b"].momentum=1;
 assert.ok(combatOptions(m,"b").reactions.some(r=>r.rule==="counter-b"&&r.id===a.id));
 m=applyMatchAction(m,"b",{type:"combatReact",rule:"counter-b",id:a.id,target:"c1"}).match;
 assert.equal(m.state.resourcePools["player-b"].momentum,0);
 assert.equal(m.battle.boosts.c1,-2);
 assert.ok(m.state.zones["discard-b"].cards.includes(a.id));
});
function nextTurn(m){for(let i=0;i<10;i++){if(m.windowClosed)return applyMatchAction(m,m.timing.active,{type:"endTurn"}).match;m=applyMatchAction(m,m.timing.priority,{type:"pass"}).match}throw Error("Turn did not close")}
test("runes channel two then three, exhaust independently and recycle voluntarily",async()=>{
 const {generate}=await import("../kernel/dynamic-payments.js");
 let m=createMatch(referenceModules()[4]);assert.equal(m.state.zones["rune-pool-a"].cards.length,2);
 assert.equal(m.state.zones["rune-pool-b"].cards.length,0);
 const id=m.state.zones["rune-pool-a"].cards[0],alt=m.state.objects[id].definition!=="rune-card";
 m.state=generate(m,"a",{id,generator:alt?"energy-alt-a":"rune-a"}).state;
 assert.equal(m.state.objects[id].orientation,"resting");
 m.state=generate(m,"a",{id,generator:alt?"power-alt-a":"power-a"}).state;
 assert.equal(m.state.zones["rune-deck-a"].cards.at(-1),id);
 assert.equal(m.state.resourcePools["player-a"][alt?"power-alt-a":"power-a"],1);
 m=nextTurn(m);assert.equal(m.state.zones["rune-pool-b"].cards.length,3);
});
test("assigned momentum returns to pool and loses attachment at owner turn",()=>{
 let m=createMatch(referenceModules()[3]);const id=m.state.zones["momentum-pool-a"].cards[0];
 m=applyMatchAction(m,"a",{type:"attach",id,host:"c1"}).match;
 m=nextTurn(nextTurn(m));assert.ok(m.state.zones["momentum-pool-a"].cards.includes(id));assert.equal(m.state.attachments[id],undefined);
});
