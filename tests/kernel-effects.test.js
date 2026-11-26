import test from "node:test";
import assert from "node:assert/strict";
import {createState,addCard} from "../kernel/objects.js";
import {initializeResources} from "../kernel/resources.js";
import {createTiming,submitEffect,passPriority} from "../kernel/timing.js";
import {collectTriggers} from "../kernel/triggers.js";
import {beginEffect,resumeEffect,choiceView} from "../kernel/effects.js";
function setup(){
 let s=createState({players:["a","b"],definitions:["unit"],zones:[{id:"field",owner:"a",visibility:"public",capacity:5},{id:"discard",owner:"a",visibility:"public",capacity:5}]});
 s=addCard(s,{definition:"unit",owner:"a",zone:"field"}).state;
 s=addCard(s,{definition:"unit",owner:"a",zone:"field"}).state;
 s=initializeResources(s,[{id:"mana",scope:"player",initial:3,max:5}]);
 let t=submitEffect(createTiming(["a","b"]),{actor:"a",effect:"spell"}).timing;
 t=passPriority(passPriority(t,"a").timing,"b").timing;
 return {s,t};
}
test("configured triggers match typed fields and preserve explicit order",()=>{
 const t=createTiming(["a","b"]);
 const rules=[{id:"r1",event:"cardMoved",effect:"draw",actor:"a",where:{to:"discard"}},{id:"r2",event:"cardMoved",effect:"heal",actor:"b"}];
 const r=collectTriggers(t,rules,[{type:"cardMoved",to:"field"},{type:"cardMoved",to:"discard"}]);
 assert.deepEqual(r.timing.queue.map(e=>e.effect),["heal","draw","heal"]);
 assert.equal(t.queue.length,0);
});
test("effect execution moves cards, changes resources and schedules matching triggers",()=>{
 const {s,t}=setup();
 const r=beginEffect(s,t,[{type:"resource",resource:"mana",delta:-1},{type:"move",id:"c1",from:"field",to:"discard"}],[{id:"r1",event:"cardMoved",effect:"draw",actor:"a",where:{to:"discard"}}]);
 assert.equal(r.state.resourcePools["player-a"].mana,2);
 assert.deepEqual(r.state.zones.discard.cards,["c1"]);
 assert.equal(r.timing.resolving,null);
 assert.equal(r.timing.queue[0].effect,"draw");
 assert.equal(s.resourcePools["player-a"].mana,3);
});
test("choice suspension is serializable and does not commit partial effects",()=>{
 const {s,t}=setup();
 const r=beginEffect(s,t,[{type:"resource",resource:"mana",delta:-1},{type:"choose",name:"target",options:["c1","c2"]},{type:"move",choice:"target",from:"field",to:"discard"}]);
 assert.deepEqual(r.state,s);assert.deepEqual(r.events,[]);
 assert.deepEqual(choiceView(r.pending,"b"),{actor:"a",waiting:true});
 assert.deepEqual(choiceView(r.pending,"a").options,["c1","c2"]);
 assert.throws(()=>resumeEffect(s,t,r.pending,{actor:"b",value:"c1"}));
 assert.throws(()=>resumeEffect(s,t,r.pending,{actor:"a",value:"missing"}));
 const end=resumeEffect(s,t,JSON.parse(JSON.stringify(r.pending)),{actor:"a",value:"c2"});
 assert.deepEqual(end.state.zones.discard.cards,["c2"]);
 assert.equal(end.state.resourcePools["player-a"].mana,2);
 assert.equal(end.pending,null);
});
test("invalid or unaffordable effects fail without mutating input",()=>{
 const {s,t}=setup(),before=structuredClone({s,t});
 assert.throws(()=>beginEffect(s,t,[{type:"resource",resource:"mana",delta:-1},{type:"move",id:"missing",from:"field",to:"discard"}]));
 assert.throws(()=>beginEffect(s,t,[{type:"eval"}]));
 assert.throws(()=>beginEffect(s,t,[{type:"resource",resource:"mana",delta:-4}]));
 assert.deepEqual({s,t},before);
});
test("multiple choices suspend and resume without losing prior selections",()=>{
 const {s,t}=setup();
 const first=beginEffect(s,t,[{type:"choose",name:"one",options:["c1"]},{type:"choose",name:"two",options:["c2"]},{type:"move",choice:"one",from:"field",to:"discard"},{type:"move",choice:"two",from:"field",to:"discard"}]);
 const second=resumeEffect(s,t,first.pending,{actor:"a",value:"c1"});
 assert.equal(second.pending.name,"two");
 const done=resumeEffect(s,t,second.pending,{actor:"a",value:"c2"});
 assert.deepEqual(done.state.zones.discard.cards,["c1","c2"]);
});
