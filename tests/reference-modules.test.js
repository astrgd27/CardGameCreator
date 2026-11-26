import test from "node:test";
import assert from "node:assert/strict";
import {referenceModules} from "../reference-modules.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
import {chooseStrategicAction,decisionActor} from "../kernel/strategic-ai.js";
import {packPortable,unpackPortable} from "../portable-modules.js";
import {Zip} from "../scripts/compatibility-fixtures.mjs";
test("five starter games validate, roundtrip and execute legal AI actions",async()=>{const modules=referenceModules();assert.equal(modules.length,5);for(const r of modules){const restored=await unpackPortable(await packPortable(r,Zip),Zip);let m=createMatch(restored);for(let i=0;i<30&&!m.result;i++){const p=decisionActor(m),a=chooseStrategicAction(m,p,{difficulty:"normal"});assert.ok(a,r.name+" stalled");m=applyMatchAction(m,p,a).match}}});
test("turn attachment limit and host filter are authoritative",()=>{const r=referenceModules()[0];let m=createMatch(r);assert.throws(()=>applyMatchAction(m,"a",{type:"attach",id:"c3",host:"c3"}));m=applyMatchAction(m,"a",{type:"attach",id:"c3",host:"c1"}).match;assert.equal(matchView(m,"a").actionUses.attach,1);assert.ok(!matchView(m,"a").phaseActions.includes("attach"));assert.throws(()=>applyMatchAction(m,"a",{type:"attach",id:"c3",host:"c1"}))});
