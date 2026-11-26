import test from "node:test";
import assert from "node:assert/strict";
import {runFixtures} from "../scripts/compatibility-fixtures.mjs";
test("ten primary TCG micro-fixtures pass before and after portable ZIP round-trip",async()=>{const r=await runFixtures();assert.equal(r.length,5);for(const x of r)assert.equal(x.status,"fixture-pass",x.id+": "+x.note)});
