import test from "node:test";
import assert from "node:assert/strict";
import {createState,addCard} from "../kernel/objects.js";
import {attachCard} from "../kernel/attachments.js";
import {initializeResources} from "../kernel/resources.js";
import {selectCards} from "../kernel/selectors.js";
import {resolveCombat,evaluateVictory} from "../kernel/combat.js";
import {createTiming,passPriority} from "../kernel/timing.js";
import {submitChainLink} from "../kernel/chains.js";
function setup(){
 let s=createState({players:["a","b"],definitions:["soldier","gear"],zones:[
 {id:"field",owner:null,visibility:"public",capacity:10},
 {id:"hand",owner:"b",visibility:"owner",capacity:5},
 {id:"deck",owner:"a",visibility:"hidden",capacity:5},
 {id:"discardA",owner:"a",visibility:"public",capacity:5},
 {id:"discardB",owner:"b",visibility:"public",capacity:5}]});
 for(const [definition,owner,zone,face] of [["soldier","a","field","up"],["soldier","b","field","up"],["gear","a","field","up"],["soldier","b","field","down"],["soldier","b","hand","up"],["soldier","a","deck","up"]])
  s=addCard(s,{definition,owner,zone,face}).state;
 return s;
}
test("selectors respect owner, zone order, concealment and zero limit",()=>{
 const s=setup();
 assert.deepEqual(selectCards(s,"a",{zones:["field"],controller:"opponent"}),["c2"]);
 assert.deepEqual(selectCards(s,"a",{definition:"soldier"}),["c1","c2"]);
 assert.deepEqual(selectCards(s,"a",{limit:0}),[]);
 assert.deepEqual(selectCards(s,"a",{limit:1}),["c1"]);
 assert.deepEqual(selectCards(s,"b",{zones:["hand","field"],owner:"self"}),["c5","c2","c4"]);
 assert.throws(()=>selectCards(s,"a",{zones:["missing"]}));
});
test("combat simultaneously defeats both units and follows attachments",()=>{
 const s=attachCard(setup(),{id:"c3",host:"c1",onHostMove:"follow"}).state;
 const r=resolveCombat(s,{attacker:"c1",defender:"c2",stats:{soldier:{attack:3,health:3}},defeatZones:{a:"discardA",b:"discardB"}});
 assert.deepEqual(r.state.zones.discardA.cards,["c1","c3"]);
 assert.deepEqual(r.state.zones.discardB.cards,["c2"]);
 assert.equal(r.events.filter(e=>e.type==="combatDefeat").length,2);
 assert.equal(s.objects.c1.orientation,"ready");
});
test("one-way combat and surviving damage persist; invalid attacks are atomic",()=>{
 const s=setup(),before=structuredClone(s);
 const opts={attacker:"c1",defender:"c2",stats:{soldier:{attack:2,health:5}},defeatZones:{a:"discardA",b:"discardB"}};
 const r=resolveCombat(s,{...opts,retaliate:false});
 assert.equal(r.state.objects.c1.damage,0);assert.equal(r.state.objects.c2.damage,2);
 assert.throws(()=>resolveCombat(r.state,opts));
 assert.throws(()=>resolveCombat(s,{...opts,defender:"c4"}));
 assert.deepEqual(s,before);
});
test("victory conditions support resource losses and simultaneous draws",()=>{
 const s=initializeResources(setup(),[{id:"life",scope:"player",initial:0,max:10}]);
 assert.deepEqual(evaluateVictory(s,[{type:"resourceAtMost",player:"a",resource:"life",amount:0}]),{losers:["a"],winner:"b",draw:false});
 const result=evaluateVictory(s,[{type:"resourceAtMost",player:"a",resource:"life",amount:0},{type:"emptyZone",player:"b",zone:"discardB"}]);
 assert.equal(result.draw,true);assert.equal(result.winner,null);
});
test("chain limits and response speeds enforce configurable restrictions",()=>{
 const policy={maxLinks:2,speedByEffect:{slow:1,fast:2,quick:3},minimumResponseSpeed:2,escalate:true};
 let t=submitChainLink(createTiming(["a","b"]),{actor:"a",effect:"fast"},policy).timing;
 t=passPriority(t,"a").timing;
 assert.throws(()=>submitChainLink(t,{actor:"b",effect:"slow"},policy),/speed/);
 t=submitChainLink(t,{actor:"b",effect:"quick"},policy).timing;
 assert.throws(()=>submitChainLink(t,{actor:"b",effect:"quick"},policy),/limit/);
 assert.equal(t.queue.length,2);
});
