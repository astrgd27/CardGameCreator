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
test("exhausted rune returns face down to resource deck at next owner turn",()=>{
 let m=createMatch(referenceModules()[4]);const id=m.state.zones["rune-pool-b"].cards[0];m.state.objects[id].orientation="resting";
 m=nextTurn(m);assert.ok(m.state.zones["rune-deck-b"].cards.includes(id));assert.equal(m.state.objects[id].face,"down");
});
test("assigned momentum returns to pool and loses attachment at owner turn",()=>{
 let m=createMatch(referenceModules()[3]);const id=m.state.zones["momentum-pool-a"].cards[0];
 m=applyMatchAction(m,"a",{type:"attach",id,host:"c1"}).match;
 m=nextTurn(nextTurn(m));assert.ok(m.state.zones["momentum-pool-a"].cards.includes(id));assert.equal(m.state.attachments[id],undefined);
});
