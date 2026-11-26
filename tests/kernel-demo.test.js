import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {validateModuleV2} from "../kernel/module-v2.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
const act=(m,p,type,extra={})=>applyMatchAction(m,p,{type,...extra}).match;
test("Ironwood validates and deploys a hand card exactly once",()=>{
 const rules=demoModule();assert.deepEqual(validateModuleV2(rules),[]);
 let m=createMatch(rules);
 assert.deepEqual(matchView(m,"a").available,["musterA"]);
 m=act(m,"a","activate",{effect:"musterA"});
 m=act(act(m,"a","pass"),"b","pass");
 assert.ok(m.state.zones.field.cards.includes("c5"));
 assert.equal(m.state.resourcePools["player-a"].energy,1);
 assert.deepEqual(matchView(m,"a").available,[]);
 assert.throws(()=>act(m,"a","activate",{effect:"musterA"}));
});
test("schema rejects invalid references and costs before match starts",()=>{
 const rules=demoModule();rules.effects.musterA.costs[0].resource="missing";
 assert.ok(validateModuleV2(rules).length);
 assert.throws(()=>createMatch(rules));
});
test("demo attachment and combat work in same match",()=>{
 let m=createMatch(demoModule());
 m=act(m,"a","attach",{id:"c3",host:"c1"});
 m=act(m,"a","attack",{attacker:"c1",defender:"c2"});
 assert.equal(m.state.attachments.c3.host,"c1");
 assert.equal(m.state.objects.c2.damage,2);
 assert.equal(m.state.objects.c1.damage,3);
});
