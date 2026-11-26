import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction} from "../kernel/runtime.js";
import {legalCardTargets} from "../kernel/legal-targets.js";
import {normalizeSettings,saveSettings,readSettings,animationDuration} from "../tabletop-settings.js";
test("target previews are legal, visible and phase-aware",()=>{
 const m=createMatch(demoModule());
 const targets=legalCardTargets(m,"a","c1");
 assert.ok(targets.some(t=>t.id==="c2"&&t.action.type==="attack"));
 assert.ok(!targets.some(t=>t.id==="c6"));
 for(const t of targets)assert.doesNotThrow(()=>applyMatchAction(m,"a",t.action));
 assert.deepEqual(legalCardTargets(m,"b","c2"),[]);
 const rules=demoModule();rules.phases=[{id:"prepare",actions:["activate"]}];
 assert.deepEqual(legalCardTargets(createMatch(rules),"a","c1"),[]);
});
test("settings normalize invalid values and persist valid choices",()=>{
 const storage={v:null,getItem(){return this.v},setItem(k,v){this.v=v}};
 assert.equal(normalizeSettings({speed:"bad"}).speed,"normal");
 saveSettings({speed:"off",scale:"large",opponentPreview:false},storage);
 assert.deepEqual(readSettings(storage),{speed:"off",scale:"large",opponentPreview:false});
 assert.equal(animationDuration(readSettings(storage)),0);
});
