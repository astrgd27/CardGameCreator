import {readFileSync} from "node:fs";
import {demoModule} from "../kernel/demo-module.js";
import {benchmarkAI} from "../kernel/ai-benchmark.js";
const module=process.argv[2]?JSON.parse(readFileSync(process.argv[2],"utf8")):demoModule();
const games=Number(process.argv[3]??10);
const results=benchmarkAI(module,{games,profiles:{[module.players[0]]:{difficulty:"hard",personality:"aggressive"},[module.players[1]]:{difficulty:"normal",personality:"defensive"}}});
console.log(JSON.stringify(results,null,2));
if(results.reasons.error||results.reasons.stalled)process.exitCode=1;
