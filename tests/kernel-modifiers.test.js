import test from "node:test";
import assert from "node:assert/strict";
import {createState,addCard,moveCard} from "../kernel/objects.js";
import {deriveStatistic} from "../kernel/modifiers.js";
import {replaceDamage} from "../kernel/replacements.js";
import {resolveCombat} from "../kernel/combat.js";
function setup(){
 let s=createState({players:["a","b"],definitions:["unit","gear"],zones:[{id:"field",owner:null,visibility:"public",capacity:10},{id:"discardA",owner:"a",visibility:"public",capacity:10},{id:"discardB",owner:"b",visibility:"public",capacity:10}]});
 for(const [definition,owner] of [["unit","a"],["unit","b"],["gear","a"],["unit","b"]])s=addCard(s,{definition,owner,zone:"field"}).state;
 return s;
}
const opts={attacker:"c1",defender:"c2",stats:{unit:{attack:2,health:5},gear:{attack:0,health:1}},defeatZones:{a:"discardA",b:"discardB"}};
test("modifiers use deterministic layers, expiration and source zones",()=>{
 const s=setup(),mods=[{id:"multiply",stat:"attack",op:"multiply",value:2},{id:"add",stat:"attack",op:"add",value:1,source:"c3",sourceZones:["field"]},{id:"set",stat:"attack",op:"set",value:4,target:"c1",expires:2}];
 assert.deepEqual(deriveStatistic(s,"c1","attack",2,mods,{turn:1}),{value:10,applied:["set","add","multiply"]});
 assert.equal(deriveStatistic(s,"c1","attack",2,mods,{turn:2}).value,6);
 const moved=moveCard(s,{id:"c3",from:"field",to:"discardA"}).state;
 assert.equal(deriveStatistic(moved,"c1","attack",2,mods,{turn:2}).value,4);
});
test("replacement effects redirect, reduce and prevent in declared order",()=>{
 const s=setup(),e={type:"damageDealt",id:"c2",amount:5};
 const r=replaceDamage(s,e,[{id:"redirect",op:"redirect",target:"c2",to:"c4"},{id:"shield",op:"reduce",target:"c4",amount:2}]);
 assert.deepEqual(r,{event:{type:"damageDealt",id:"c4",amount:3},applied:["redirect","shield"]});
 assert.equal(replaceDamage(s,e,[{id:"immune",op:"prevent",target:"c2"}]).event.amount,0);
 assert.equal(e.amount,5);
});
test("combat uses modifiers and redirected lethal damage",()=>{
 const s=setup(),r=resolveCombat(s,{...opts,retaliate:false,modifiers:[{id:"boost",stat:"attack",op:"add",value:3,target:"c1"}],replacements:[{id:"guard",op:"redirect",target:"c2",to:"c4"}]});
 assert.equal(r.state.objects.c2.damage,0);
 assert.deepEqual(r.state.zones.discardB.cards,["c4"]);
 assert.ok(r.events.some(e=>e.type==="combatDefeat"&&e.id==="c4"));
 assert.deepEqual(s.zones.discardB.cards,[]);
});
test("combat prevents counter damage and rejects invalid replacement atomically",()=>{
 const s=setup(),before=structuredClone(s),r=resolveCombat(s,{...opts,replacements:[{id:"immune",op:"prevent",target:"c1"}]});
 assert.equal(r.state.objects.c1.damage,0);assert.equal(r.state.objects.c2.damage,2);
 assert.throws(()=>resolveCombat(s,{...opts,replacements:[{id:"bad",op:"redirect",to:"missing"}]}));
 assert.deepEqual(s,before);
});
