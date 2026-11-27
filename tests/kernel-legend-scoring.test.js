import test from "node:test";
import assert from "node:assert/strict";
import {referenceModules} from "../reference-modules.js";
import {createMatch} from "../kernel/runtime.js";
import {scoreObjectives} from "../kernel/objectives.js";
import {validateDeckGroup} from "../kernel/decks.js";
test("capture cannot award final point but holding can",()=>{
 const m=createMatch(referenceModules()[4]);m.objectives.scores.a=7;
 m.state.zones.field.cards=m.state.zones.field.cards.filter(id=>id!=="c1");m.state.zones.ridge.cards.push("c1");
 scoreObjectives(m,[]);assert.equal(m.objectives.scores.a,7);
 m.turn++;scoreObjectives(m,[{type:"turnStarted",actor:"a"}]);assert.equal(m.objectives.scores.a,8);
});
test("legend rejects chosen champion outside its domain",()=>{
 const m=referenceModules()[4],d=(role,zone,definition,count)=>({name:role,role,zone,player:"a",cards:[{definition,count}]});
 const errors=validateDeckGroup(m,[d("legend","legend-a","legend-a",1),d("champion","champion-a","champion-b",1),d("runes","rune-deck-a","rune-card",12)],"a");
 assert.ok(errors.includes("Missing linked tag: champion-b"));
});
