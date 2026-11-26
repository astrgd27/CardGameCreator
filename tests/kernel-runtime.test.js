import test from "node:test";
import assert from "node:assert/strict";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
const module=()=>({
 players:["a","b"],definitions:["unit","gear"],zones:[
 {id:"field",owner:null,visibility:"public",capacity:10},
 {id:"discardA",owner:"a",visibility:"public",capacity:10},
 {id:"discardB",owner:"b",visibility:"public",capacity:10},
 {id:"handB",owner:"b",visibility:"owner",capacity:10}],
 setup:[{definition:"unit",owner:"a",zone:"field"},{definition:"unit",owner:"b",zone:"field"},{definition:"gear",owner:"a",zone:"field"},{definition:"unit",owner:"b",zone:"handB"}],
 resources:[{id:"mana",scope:"player",initial:3,max:5,refreshMode:"add",refresh:1}],
 effects:{
  spell:{available:true,actors:["a"],costs:[{resource:"mana",kind:"spend",amount:2}],program:[{type:"choose",name:"target",options:["c2"]},{type:"move",choice:"target",from:"field",to:"discardB"}]},
  reward:{program:[{type:"resource",resource:"mana",delta:1}]}
 },
 triggers:[{id:"rewardMove",event:"cardMoved",where:{to:"discardB"},effect:"reward",actor:"a"}],
 combat:{zones:["field"],stats:{unit:{attack:2,health:5},gear:{attack:0,health:1}},defeatZones:{a:"discardA",b:"discardB"}},
 attachment:{zones:["field"],definitions:["gear"],onHostMove:"follow",max:1}
});
const act=(m,actor,type,extra={})=>applyMatchAction(m,actor,{type,...extra}).match;
const passes=m=>act(act(m,"a","pass"),"b","pass");
test("paid activation, priority, suspended choice and triggered reward share one runtime",()=>{
 let m=createMatch(module());
 assert.deepEqual(matchView(m,"a").available,["spell"]);
 m=act(m,"a","activate",{effect:"spell",costs:[]});
 assert.equal(m.state.resourcePools["player-a"].mana,1);
 m=passes(m);assert.ok(m.pending);
 assert.deepEqual(matchView(m,"b").choice,{actor:"a",waiting:true});
 assert.throws(()=>act(m,"b","choose",{value:"c2"}));
 m=act(JSON.parse(JSON.stringify(m)),"a","choose",{value:"c2"});
 assert.deepEqual(m.state.zones.discardB.cards,["c2"]);
 assert.equal(m.timing.queue[0].effect,"reward");
 m=passes(m);assert.equal(m.state.resourcePools["player-a"].mana,2);
 assert.equal(m.timing.queue.length,0);
});
test("combat, equipment and turns share state and reject out-of-turn actions",()=>{
 let m=createMatch(module());
 m=act(m,"a","attach",{id:"c3",host:"c1"});
 m=act(m,"a","attack",{attacker:"c1",defender:"c2"});
 assert.equal(m.state.objects.c1.orientation,"resting");
 assert.equal(m.state.objects.c2.damage,2);
 assert.equal(m.state.attachments.c3.host,"c1");
 assert.throws(()=>act(m,"a","attack",{attacker:"c1",defender:"c4"}));
 m=passes(m);m=act(m,"a","endTurn");
 assert.equal(m.timing.active,"b");assert.equal(m.state.resourcePools["player-b"].mana,4);
 m=act(act(m,"b","pass"),"a","pass");m=act(m,"b","endTurn");
 assert.equal(m.state.objects.c1.orientation,"ready");
});
test("unauthorized actions and invalid targets cannot mutate match state",()=>{
 const m=createMatch(module()),before=structuredClone(m);
 assert.throws(()=>act(m,"b","activate",{effect:"spell"}));
 assert.throws(()=>act(m,"a","activate",{effect:"reward"}));
 assert.throws(()=>act(m,"a","attack",{attacker:"c1",defender:"c4"}));
 assert.throws(()=>act(m,"a","endTurn"));
 assert.deepEqual(m,before);
 assert.equal(matchView(m,"a").state.zones.find(z=>z.id==="handB").cards,undefined);
});
test("victory evaluated at setup and blocks subsequent actions",()=>{
 const config=module();config.victory=[{type:"emptyZone",player:"b",zone:"discardB"}];
 const m=createMatch(config);assert.equal(m.result.winner,"a");
 assert.throws(()=>act(m,"a","pass"));
});
