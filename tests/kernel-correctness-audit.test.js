import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
import {moveCard} from "../kernel/objects.js";
import {shuffleZone} from "../kernel/draw.js";
import {revealCard} from "../kernel/hidden-zones.js";
test("reveal grants expire when a card leaves and returns or its pile is shuffled",()=>{
 const r=demoModule(),m=createMatch(r);let s=revealCard(m.state,"a","c5",{audience:"all"}).state;
 assert.ok(s.reveals.c5);s=moveCard(s,{id:"c5",from:"hand-a",to:"discard-a"}).state;s=moveCard(s,{id:"c5",from:"discard-a",to:"hand-a"}).state;assert.equal(s.reveals.c5,undefined);
 s=revealCard(s,"a","c5",{audience:"all"}).state;s=shuffleZone(s,"hand-a",42).state;assert.equal(s.reveals.c5,undefined);
});
test("closed priority cannot reopen through activation and exposes no activation options",()=>{
 let m=createMatch(demoModule());m=applyMatchAction(m,"a",{type:"pass"}).match;m=applyMatchAction(m,"b",{type:"pass"}).match;assert.equal(m.windowClosed,true);const before=structuredClone(m);
 assert.throws(()=>applyMatchAction(m,"a",{type:"activate",effect:"musterA"}),/closed/);assert.deepEqual(m,before);assert.deepEqual(matchView(m,"a").activations,[]);
});
test("precommitted targets resolve without duplicate choice and stale targets fizzle",()=>{
 const r=demoModule();r.triggers=[];const selector={zones:["field"],controller:"opponent",definition:"raider"};
 r.effects.mark={available:true,dynamicPayment:{targets:[{name:"victim",selector}]},program:[{type:"target",name:"victim",selector},{type:"counter",choice:"victim",counter:"marked",delta:1}]};
 const initial=createMatch(r);const queued=applyMatchAction(initial,"a",{type:"activate",effect:"mark",payment:{targets:{victim:"c2"}}}).match;
 const resolve=m=>applyMatchAction(applyMatchAction(m,"a",{type:"pass"}).match,"b",{type:"pass"});
 const good=resolve(queued);assert.equal(good.match.pending,null);assert.equal(good.match.state.objects.c2.counters.marked,1);
 const stale=structuredClone(queued);stale.state=moveCard(stale.state,{id:"c2",from:"field",to:"discard-b"}).state;const bad=resolve(stale);assert.ok(bad.events.some(e=>e.type==="effectFizzled"));assert.equal(bad.match.pending,null);assert.equal(bad.match.state.objects.c2.counters.marked,undefined);
});
