import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
import {moveWithAttachments} from "../kernel/attachments.js";
import {validateDeckGroup,appendDeckGroup} from "../kernel/decks.js";
test("stack preserves identity, inherits abilities and separates physical cards",()=>{
 const r=demoModule();r.stackRules=[{id:"evolve",hostDefinition:"sentinel",materialDefinition:"sentinel",hostZones:["field"],materialZones:["hand-a"],resultDefinition:"raider",inherit:true,preserve:["damage","counters"]}];
 r.effects.inherited={available:true,sourceDefinition:"sentinel",sourceZones:["field"],program:[{type:"counter",choice:"source",counter:"power",delta:1}]};
 let m=createMatch(r);m.state.objects.c1.damage=1;m.state.objects.c1.counters.charge=2;
 const before=structuredClone(m);assert.throws(()=>applyMatchAction(m,"a",{type:"stack",rule:"evolve",host:"c1",material:"c6"}));assert.deepEqual(m,before);
 m=applyMatchAction(m,"a",{type:"stack",rule:"evolve",host:"c1",material:"c5"}).match;
 assert.equal(m.state.objects.c1.definition,"raider");assert.equal(m.state.objects.c1.damage,1);assert.equal(m.state.objects.c1.counters.charge,2);assert.equal(m.state.objects.c5,undefined);
 assert.ok(matchView(m,"a").activations.some(a=>a.effect==="inherited"&&a.source==="c1"));
 const moved=moveWithAttachments(m.state,{id:"c1",from:"field",to:"discard-a",reset:true}).state;
 assert.equal(moved.objects.c1.definition,"sentinel");assert.equal(moved.objects.c5.definition,"sentinel");assert.deepEqual(moved.zones["discard-a"].cards,["c1","c5"]);
});
test("linked decks require roles, shared tags and combined copy limits",()=>{
 const r=demoModule();r.zones.push({id:"extra-a",owner:"a",visibility:"hidden",capacity:10},{id:"main-a",owner:"a",visibility:"hidden",capacity:10});
 r.cardPresentation={sentinel:{tags:["order"]},blade:{tags:["order"]},raider:{tags:["chaos"]}};
 r.deckRoles=[{id:"leader",zones:["extra-a"],required:true,providesTags:true,rules:{min:1,max:1,copies:1}},{id:"main",zones:["main-a"],required:true,requiresProvidedTags:true}];r.linkedDeckRules={combinedCopies:2};
 const decks=[{name:"Leader",player:"a",zone:"extra-a",role:"leader",cards:[{definition:"sentinel",count:1}]},{name:"Main",player:"a",zone:"main-a",role:"main",cards:[{definition:"blade",count:2}]}];
 assert.deepEqual(validateDeckGroup(r,decks,"a"),[]);assert.equal(appendDeckGroup(r,decks,"a").setup.length,9);
 assert.ok(validateDeckGroup(r,decks.slice(1),"a").length);
 decks[1].cards=[{definition:"raider",count:1}];assert.throws(()=>appendDeckGroup(r,decks,"a"));assert.equal(r.setup.length,6);
});
