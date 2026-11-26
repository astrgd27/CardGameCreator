import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
import {assertInvariants,moveCard} from "../kernel/objects.js";
import {assertAttachments,moveWithAttachments} from "../kernel/attachments.js";
import {solveDynamic} from "../kernel/dynamic-payments.js";
import {chooseStrategicAction,decisionActor} from "../kernel/strategic-ai.js";
import {projectEvents} from "../kernel/event-view.js";
test("bounded payment solver distinguishes impossible, unknown and witnessed hybrid payments",()=>{
 const r=demoModule();r.resources.push({id:"spare",scope:"player",initial:0,max:6});r.effects.cast={available:true,dynamicPayment:{hybrid:[{resources:["energy","spare"],amount:4}]},program:[]};let m=createMatch(r);
 assert.equal(solveDynamic(m,"a",r.effects.cast,undefined,{id:"default",costs:[]}).status,"impossible");
 r.generators=[{id:"forge",definition:"blade",zones:["field"],resource:"energy",amount:2}];m=createMatch(r);
 const p={id:"default",costs:[]},w=solveDynamic(m,"a",r.effects.cast,undefined,p);
 assert.equal(w.status,"payable");assert.equal(solveDynamic(m,"a",r.effects.cast,undefined,p,1).status,"unknown");
 assert.doesNotThrow(()=>applyMatchAction(m,"a",{type:"activate",effect:"cast",...w.action}));
});
test("authorized failing pending choice rolls back work but not activation costs",()=>{
 const r=demoModule();r.triggers=[];r.effects.risk={available:true,costs:[{kind:"spend",resource:"energy",amount:1}],program:[{type:"counter",id:"c1",counter:"mark",delta:1},{type:"choose",name:"decision",options:["yes"]},{type:"resource",resource:"energy",delta:-5}]};let m=createMatch(r);
 for(const [p,a] of [["a",{type:"activate",effect:"risk"}],["a",{type:"pass"}],["b",{type:"pass"}]])m=applyMatchAction(m,p,a).match;
 assert.ok(m.pending);const before=structuredClone(m);assert.throws(()=>applyMatchAction(m,"b",{type:"choose",value:"yes"}));assert.throws(()=>applyMatchAction(m,"a",{type:"choose",value:"no"}));assert.deepEqual(m,before);
 const out=applyMatchAction(m,"a",{type:"choose",value:"yes"});assert.equal(out.match.pending,null);assert.equal(out.match.state.objects.c1.counters.mark,undefined);assert.equal(out.match.state.resourcePools["player-a"].energy,2);assert.ok(out.events.some(e=>e.type==="effectFizzled"));
});
test("composite separation with follower capacity failure is atomic",()=>{
 const r=demoModule();r.stackRules=[{id:"evolve",hostDefinition:"sentinel",materialDefinition:"sentinel",hostZones:["field"],materialZones:["hand-a"]}];let m=createMatch(r);
 m=applyMatchAction(m,"a",{type:"attach",id:"c3",host:"c1"}).match;m=applyMatchAction(m,"a",{type:"stack",rule:"evolve",host:"c1",material:"c5"}).match;
 const s=structuredClone(m.state);s.zones["discard-a"].capacity=2;const before=structuredClone(s);assert.throws(()=>moveWithAttachments(s,{id:"c1",from:"field",to:"discard-a",reset:true}));assert.deepEqual(s,before);
 s.zones["discard-a"].capacity=3;const done=moveWithAttachments(s,{id:"c1",from:"field",to:"discard-a",reset:true,face:"down"}).state;assert.deepEqual(done.zones["discard-a"].cards,["c1","c5","c3"]);assert.equal(done.objects.c5.face,"down");assertAttachments(done);
});
test("differential hidden deck identities and order preserve opponent projection",()=>{
 const r=demoModule();r.zones.push({id:"deck-b",owner:"b",visibility:"hidden",capacity:10});r.setup.push({definition:"blade",owner:"b",zone:"deck-b",face:"down"},{definition:"ward",owner:"b",zone:"deck-b",face:"down"});const m=createMatch(r),other=structuredClone(m);other.state.zones["deck-b"].cards.reverse();other.state.objects.c7.definition="raider";
 assert.deepEqual(matchView(m,"a"),matchView(other,"a"));assert.deepEqual(chooseStrategicAction(m,"a"),chooseStrategicAction(other,"a"));assert.deepEqual(projectEvents([{type:"cardMoved",id:"c7",definition:"blade",to:"deck-b"}],m.state,m.state,"a"),projectEvents([{type:"cardMoved",id:"c8",definition:"ward",to:"deck-b"}],other.state,other.state,"a"));
});
test("seeded mixed legal and illegal action sequences preserve invariants and input",()=>{
 for(let seed=1;seed<=12;seed++){let m=createMatch(demoModule(),{seed}),rng=seed;
 for(let i=0;i<35&&!m.result;i++){const actor=decisionActor(m),before=structuredClone(m);rng=(Math.imul(rng,1664525)+1013904223)>>>0;
 assert.throws(()=>applyMatchAction(m,actor,{type:"unknown-action",id:"__proto__"}));assert.deepEqual(m,before);
 const action=chooseStrategicAction(m,actor,{difficulty:["easy","normal","hard"][rng%3]});if(!action)break;
 const next=applyMatchAction(m,actor,action).match;assert.deepEqual(m,before);assertInvariants(next.state);assertAttachments(next.state);m=next;
 }}
});
