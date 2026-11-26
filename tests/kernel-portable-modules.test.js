import test from "node:test";
import assert from "node:assert/strict";
import {Zip} from "../scripts/compatibility-fixtures.mjs";
import {demoModule} from "../kernel/demo-module.js";
import {packPortable,unpackPortable,migrateModule} from "../portable-modules.js";
test("portable ZIP extracts artwork and restores exact module",async()=>{const m=demoModule();m.cardPresentation.sentinel.art="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";const bytes=await packPortable(m,Zip),z=await Zip.loadAsync(bytes);assert.ok(z.file("assets/cards/sentinel.png"));assert.deepEqual(await unpackPortable(bytes,Zip),m)});
test("rejects undeclared files and unsupported schemas",async()=>{const bytes=await packPortable(demoModule(),Zip),z=await Zip.loadAsync(bytes);z.file("unexpected.txt","x");await assert.rejects(()=>z.generateAsync({type:"uint8array"}).then(b=>unpackPortable(b,Zip)));assert.throws(()=>migrateModule({schemaVersion:99}));const old=demoModule();old.schemaVersion=1;assert.equal(migrateModule(old).schemaVersion,2)});
