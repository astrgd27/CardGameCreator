import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {fixtures} from "../compatibility-fixtures.js";
import * as runtime from "../kernel/runtime.js";
import {packPortable,unpackPortable} from "../portable-modules.js";
const require=createRequire(import.meta.url),module={exports:{}};
// Vendor UMD is evaluated only from the checked-in dependency, never from an imported module.
vm.runInThisContext("(function(module,exports,require){"+readFileSync(new URL("../vendor/jszip.min.js",import.meta.url),"utf8")+"\n})")(module,module.exports,require);
export const Zip=module.exports;
export async function runFixtures(){const results=[];for(const f of fixtures){try{const m=f.make();f.run(m,runtime);const restored=await unpackPortable(await packPortable(m,Zip),Zip);f.run(restored,runtime);results.push({id:f.id,game:f.game,caseId:f.caseId,title:f.title,status:"fixture-pass",note:"Programmatic partial fixture; not a catalog pass"})}catch(e){results.push({id:f.id,game:f.game,caseId:f.caseId,title:f.title,status:"fixture-fail",note:e.message})}}return results}
