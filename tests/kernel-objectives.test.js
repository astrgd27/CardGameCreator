import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
const act=(m,p,a)=>applyMatchAction(m,p,a).match;
function resolve(m,actor,effect){m=act(m,actor,{type:"activate",effect});for(const p of m.timing.players.slice(m.timing.players.indexOf(actor)).concat(m.timing.players.slice(0,m.timing.players.indexOf(actor))))m=act(m,p,{type:"pass"});return m}
test("simultaneous score awards use configured tie policy",()=>{
 const r=demoModule();r.triggers=[];r.objectives={winScore:3,tie:"draw"};r.effects.score={available:true,program:[{type:"awardScore",player:"a",amount:4},{type:"awardScore",player:"b",amount:3}]};
 let m=resolve(createMatch(r),"a","score");assert.equal(m.result.draw,true);
 r.objectives.tie="highest";m=resolve(createMatch(r),"a","score");assert.equal(m.result.winner,"a");
});
test("persistent location capture survives vacancy",()=>{
 const r=demoModule();r.triggers=[];r.zones.push({id:"site",owner:null,visibility:"public",capacity:4},{id:"road",owner:null,visibility:"public",capacity:4});r.setup[0].zone="site";r.spatial={grid:true,slots:[{zone:"site",x:0,y:0},{zone:"road",x:1,y:0}]};r.objectives={locations:[{zone:"site",capturePoints:2,holdPoints:1,persistent:true}]};
 let m=createMatch(r);assert.equal(matchView(m,"a").objectives.scores.a,2);m=act(m,"a",{type:"moveSpatial",id:"c1",to:"road"});assert.equal(matchView(m,"b").objectives.captures.site,"a");assert.equal(m.objectives.scores.a,2);
});
test("four seats use custom order, eliminate seats and aggregate team score",()=>{
 const r=demoModule();r.players.push("c","d");r.triggers=[];r.combat.defeatZones.c="discard-c";r.combat.defeatZones.d="discard-d";for(const p of ["c","d"])r.zones.push({id:"discard-"+p,owner:p,visibility:"public",capacity:8},{id:"life-"+p,owner:p,visibility:"hidden",capacity:1});
 r.multiplayer={order:["a","d","b","c"],teams:{a:"red",c:"red",b:"blue",d:"blue"}};r.objectives={winScore:5};
 r.effects.remove={available:true,program:[{type:"lifeDamage",player:"d",zone:"life-d",destination:"discard-d",count:1}]};
 r.effects.score={available:true,program:[{type:"awardScore",player:"a",amount:2},{type:"awardScore",player:"c",amount:3}]};
 let m=createMatch(r);assert.deepEqual(m.timing.players,["a","d","b","c"]);m=resolve(m,"a","remove");assert.deepEqual(m.timing.players,["a","b","c"]);assert.throws(()=>act(m,"d",{type:"pass"}));m=resolve(m,"a","score");assert.equal(m.result.winningTeam,"red");assert.deepEqual(m.result.winners,["a","c"]);
});
