import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {validateDeck,appendDeckToSetup} from "../kernel/decks.js";
test("deck constraints and append preserve original setup IDs and inputs",()=>{
 const m=demoModule();m.deckRules={min:2,max:4,copies:2};
 const d={name:"Guardians",player:"a",zone:"hand-a",cards:[{definition:"sentinel",count:2}]};
 assert.deepEqual(validateDeck(m,d),[]);
 const result=appendDeckToSetup(m,d);
 assert.deepEqual(result.setup.slice(0,m.setup.length),m.setup);
 assert.equal(result.setup.length,m.setup.length+2);
 assert.ok(validateDeck(m,{...d,cards:[{definition:"sentinel",count:3}]}).length);
 assert.ok(validateDeck(m,{...d,zone:"hand-b"}).length);
 assert.equal(m.setup.length,6);
});
