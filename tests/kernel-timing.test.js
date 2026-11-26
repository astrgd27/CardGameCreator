import test from "node:test";
import assert from "node:assert/strict";
import {createTiming,submitEffect,enqueueTriggers,passPriority,finishResolution,changeActive} from "../kernel/timing.js";
const entry=(actor,effect)=>({actor,effect});
const pass=t=>passPriority(t,t.priority).timing;
test("responses resolve last-in-first-out after consecutive passes",()=>{
 let t=createTiming(["a","b"]);
 t=submitEffect(t,entry("a","first")).timing;t=pass(t);
 t=submitEffect(t,entry("b","reply")).timing;
 assert.equal(t.passes,0);t=pass(pass(t));
 assert.equal(t.resolving.effect,"reply");assert.equal(t.priority,null);
 t=finishResolution(t,t.resolving.id).timing;t=pass(pass(t));
 assert.equal(t.resolving.effect,"first");
});
test("FIFO queues and explicit trigger order are deterministic",()=>{
 let t=createTiming(["a","b"],{order:"fifo"});
 t=enqueueTriggers(t,[entry("b","one"),entry("a","two")]).timing;
 t=pass(pass(t));assert.equal(t.resolving.effect,"one");
 t=finishResolution(t,t.resolving.id).timing;t=pass(pass(t));assert.equal(t.resolving.effect,"two");
});
test("wrong priority, wrong completion and active changes reject without mutation",()=>{
 const t=submitEffect(createTiming(["a","b"]),entry("a","one")).timing,before=structuredClone(t);
 assert.throws(()=>submitEffect(t,entry("b","bad")));
 assert.throws(()=>passPriority(t,"b"));
 assert.throws(()=>changeActive(t,"b"));
 assert.deepEqual(t,before);
 const r=pass(pass(t));assert.throws(()=>finishResolution(r,"wrong"));
 assert.throws(()=>submitEffect(r,entry("a","bad")));
});
test("empty windows close after every seat passes and allow next active seat",()=>{
 let t=createTiming(["a","b","c"]);t=pass(pass(t));
 const r=passPriority(t,"c");assert.deepEqual(r.events,[{type:"windowClosed"}]);
 assert.equal(changeActive(r.timing,"b").priority,"b");
});
test("timing state survives save and resume",()=>{
 let t=submitEffect(createTiming(["a","b"]),{actor:"a",effect:"choose",choices:{target:"c3"}}).timing;
 t=pass(pass(t));const copy=JSON.parse(JSON.stringify(t));
 assert.deepEqual(copy,t);assert.deepEqual(finishResolution(copy,"e1"),finishResolution(t,"e1"));
});
