import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
import {assertInvariants} from "../kernel/objects.js";
import {assertAttachments} from "../kernel/attachments.js";
import {assertSpatial} from "../kernel/spatial.js";
import {decisionActor,chooseStrategicAction} from "../kernel/strategic-ai.js";
import {scoreObjectives} from "../kernel/objectives.js";
const act=(m,p,a)=>applyMatchAction(m,p,a).match;
test("group declaration after elimination selects living opponent",()=>{
 const r=demoModule();r.players.push("c");r.zones.push({id:"discard-c",owner:"c",visibility:"public",capacity:10});r.combat.defeatZones.c="discard-c";r.multiplayer={};r.combat.group={lifeResource:"energy"};
 const m=createMatch(r);assert.equal(matchView(m,"a").combat,null);m.objectives.eliminated=["b"];m.timing.players=["a","c"];
 const n=act(m,"a",{type:"declareCombat",attacks:[{attacker:"c1",kind:"player",target:"c"}]});assert.equal(n.battle.defender,"c");assert.doesNotThrow(()=>act(n,"c",{type:"block",blocks:[]}));
});
test("allied occupants transferring capture do not earn another capture award",()=>{
 const r=demoModule();r.multiplayer={teams:{a:"red",b:"red"}};r.zones.push({id:"site",owner:null,visibility:"public",capacity:8});r.spatial={slots:[{zone:"site",x:0,y:0}]};r.setup[0].zone="site";r.setup[1].zone="site";r.objectives={locations:[{zone:"site",capturePoints:2,persistent:true}]};
 const m=createMatch(r);assert.equal(m.objectives.scores.a,2);m.state.zones.site.cards=["c2"];m.state.zones.field.cards.push("c1");scoreObjectives(m,[]);assert.equal(m.objectives.captures.site,"b");assert.equal(m.objectives.scores.b,0);assertInvariants(m.state);
});
test("seeded combinations of scheduler, spatial movement, composite cards, costs and scoring preserve state",()=>{
 let executed=0;for(let seed=1;seed<=8;seed++){
 const r=demoModule();r.triggers=[];r.zones.push({id:"site",owner:null,visibility:"public",capacity:8});r.spatial={grid:true,slots:[{zone:"field",x:0,y:0},{zone:"site",x:1,y:0}],resource:"energy",costPerStep:1};r.objectives={winScore:8,locations:[{zone:"site",capturePoints:1,holdPoints:1,persistent:true}]};r.stackRules=[{id:"evolve",hostDefinition:"sentinel",materialDefinition:"sentinel",hostZones:["field"],materialZones:["hand-a"]}];r.scheduler={mode:seed%2?"round":"alternate"};r.effects.score={available:true,limit:{scope:"turn",count:1},dynamicPayment:{variable:{resource:"energy",min:1,max:2}},program:[{type:"awardScore",player:"self",amount:1}]};
 let m=createMatch(r,{seed});for(let i=0;i<40&&!m.result;i++){const p=decisionActor(m),before=structuredClone(m);assert.throws(()=>act(m,p,{type:"invalid"}));assert.deepEqual(m,before);const action=chooseStrategicAction(m,p,{difficulty:["easy","normal","hard"][(i+seed)%3]});assert.ok(action);const n=act(m,p,action);assert.deepEqual(m,before);assertInvariants(n.state);assertAttachments(n.state);assertSpatial(n.state);m=n;executed++}
 }
 console.log("cross-mechanic executed actions:",executed);
});
