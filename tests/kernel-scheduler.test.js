import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
const act=(m,p,a)=>applyMatchAction(m,p,a).match;
const pass=m=>act(act(m,m.timing.priority,{type:"pass"}),m.state.players.find(p=>p!==m.timing.priority),{type:"pass"});
test("alternate actions hand over after resolution; initiative starts next round",()=>{
 const r=demoModule();r.scheduler={mode:"alternate",initiative:true};
 let m=createMatch(r);const before=structuredClone(m);assert.equal(matchView(m,"a").scheduler.canClaim,true);assert.deepEqual(m,before);
 m=act(m,"a",{type:"activate",effect:"musterA"});assert.equal(m.timing.active,"a");
 m=pass(m);assert.equal(m.timing.active,"b");assert.equal(m.turn,1);
 m=act(m,"b",{type:"claimInitiative"});assert.equal(m.timing.active,"a");
 assert.deepEqual(matchView(m,"a").scheduler.passed,["b"]);
 m=act(m,"a",{type:"passOut"});assert.equal(m.turn,2);assert.equal(m.timing.active,"b");assert.deepEqual(matchView(m,"b").scheduler.passed,[]);
});
test("shared gauge transfers only after queued effect resolves",()=>{
 const r=demoModule();r.resources.push({id:"gauge",scope:"shared",initial:0,max:10});
 r.scheduler={mode:"round",gauge:{resource:"gauge",threshold:3,reset:0}};
 r.effects.advance={available:true,program:[{type:"resource",resource:"gauge",delta:3}]};
 let m=createMatch(r);m=act(m,"a",{type:"activate",effect:"advance"});assert.equal(m.timing.active,"a");
 m=pass(m);assert.equal(m.timing.active,"b");assert.equal(m.turn,2);assert.equal(m.state.resourcePools.shared.gauge,0);
});
test("automatic phase advancement and named ability windows",()=>{
 const r=demoModule();r.phases=[{id:"prepare",window:"prep",actions:["activate"],autoAdvance:true},{id:"main",window:"main",actions:["activate","attack"]}];
 r.effects.musterA.windows=["main"];let m=createMatch(r);assert.ok(!matchView(m,"a").available.includes("musterA"));
 m=pass(m);assert.equal(matchView(m,"a").phase,"main");assert.ok(matchView(m,"a").available.includes("musterA"));
});
test("extra turns and skipped seats are committed from effect events",()=>{
 const r=demoModule();r.effects.schedule={available:true,program:[{type:"scheduleTurn",kind:"extra",player:"self",count:1},{type:"scheduleTurn",kind:"skip",player:"b",count:1}]};
 let m=createMatch(r);m=act(m,"a",{type:"activate",effect:"schedule"});m=pass(m);m=pass(m);m=act(m,"a",{type:"endTurn"});assert.equal(m.timing.active,"a");assert.equal(m.turn,2);
 m=pass(m);m=act(m,"a",{type:"endTurn"});assert.equal(m.timing.active,"a");assert.equal(m.turn,3);
 m=pass(m);m=act(m,"a",{type:"endTurn"});assert.equal(m.timing.active,"b");
});
test("simultaneous trigger ordering is owned by each player",()=>{
 const r=demoModule();r.triggerOrder="owner";r.triggers=[{id:"a1",actor:"a",event:"cardMoved",effect:"salvageA"},{id:"a2",actor:"a",event:"cardMoved",effect:"salvageA"},{id:"b1",actor:"b",event:"cardMoved",effect:"salvageB"},{id:"b2",actor:"b",event:"cardMoved",effect:"salvageB"}];
 let m=createMatch(r);m=act(m,"a",{type:"activate",effect:"musterA"});m=pass(m);
 const ids=matchView(m,"a").triggerOrder.ids;assert.equal(ids.length,2);assert.equal(matchView(m,"b").triggerOrder.ids,undefined);
 assert.throws(()=>act(m,"b",{type:"orderTriggers",ids}));
 m=act(m,"a",{type:"orderTriggers",ids:[...ids].reverse()});
 assert.equal(matchView(m,"b").triggerOrder.actor,"b");m=act(m,"b",{type:"orderTriggers",ids:matchView(m,"b").triggerOrder.ids});assert.equal(m.triggerOrderPending,null);
});
