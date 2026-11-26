import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
import {projectEvents} from "../kernel/event-view.js";
import {moveCard} from "../kernel/objects.js";
import {changeCardState} from "../kernel/card-state.js";
import {revealCard} from "../kernel/hidden-zones.js";
import {stackOptions} from "../kernel/composites.js";
test("opponent events cannot expose concealed identity or arbitrary metadata",()=>{
 const m=createMatch(demoModule()),before=m.state,after=moveCard(before,{id:"c2",from:"field",to:"hand-b"}).state;
 const events=[{type:"cardMoved",id:"c2",from:"field",to:"hand-b",definition:"raider",position:1,secret:"secret"},{type:"counterChanged",id:"c6",counter:"secret",before:1,after:2}];
 const projected=projectEvents(events,before,after,"a");assert.deepEqual(projected,[{type:"cardMoved",from:"field",to:"hand-b"},{type:"counterChanged"}]);assert.equal(projectEvents(events,before,after,"b")[0].id,"c2");
});
test("impossible dynamic minimum is not advertised and failed activation is atomic",()=>{
 const r=demoModule();r.effects.expensive={available:true,dynamicPayment:{variable:{resource:"energy",min:5,max:6}},program:[]};const m=createMatch(r),before=structuredClone(m);
 assert.ok(!matchView(m,"a").activations.some(a=>a.effect==="expensive"));assert.throws(()=>applyMatchAction(m,"a",{type:"activate",effect:"expensive",payment:{x:5}}));assert.deepEqual(m,before);
});
test("token hosts cannot consume physical cards",()=>{
 const r=demoModule();r.stackRules=[{id:"evolve",hostDefinition:"sentinel",materialDefinition:"sentinel",hostZones:["field"],materialZones:["hand-a"]}];const m=createMatch(r);assert.ok(stackOptions(m,"a").length);m.state.objects.c1.token=true;assert.equal(stackOptions(m,"a").length,0);
});
test("transforming away and back does not resurrect reveal grants",()=>{
 const m=createMatch(demoModule());let s=revealCard(m.state,"a","c5",{audience:"all"}).state;s=changeCardState(s,"a","c5",{type:"transform",definition:"blade"}).state;s=changeCardState(s,"a","c5",{type:"transform",definition:"sentinel"}).state;assert.equal(s.reveals.c5,undefined);
});
test("conflicting scheduler policies and malformed dynamic selectors reject at load",()=>{
 const r=demoModule();r.scheduler={mode:"alternate"};r.phases=[{id:"main",actions:["activate"],autoAdvance:true}];assert.throws(()=>createMatch(r),/alternate scheduler/);
 const b=demoModule();b.effects.bad={available:true,dynamicPayment:{targets:[{name:"target",selector:{zones:["missing"]}}]},program:[]};assert.throws(()=>createMatch(b),/dynamic target selector/);
});
test("score victory precedes gauge handoff and refresh",()=>{
 const r=demoModule();r.triggers=[];r.resources.push({id:"gauge",scope:"shared",initial:0,max:3});r.scheduler={mode:"round",gauge:{resource:"gauge",threshold:3,reset:0}};r.objectives={winScore:1};
 r.effects.win={available:true,program:[{type:"resource",resource:"gauge",delta:3},{type:"awardScore",player:"self",amount:1}]};let m=createMatch(r);
 for(const [p,a] of [["a",{type:"activate",effect:"win"}],["a",{type:"pass"}],["b",{type:"pass"}]])m=applyMatchAction(m,p,a).match;
 assert.equal(m.result.winner,"a");assert.equal(m.turn,1);assert.equal(m.state.resourcePools.shared.gauge,3);
});
