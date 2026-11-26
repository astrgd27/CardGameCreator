import {benchmarkAI} from "../kernel/ai-benchmark.js";
import {demoModule} from "../kernel/demo-module.js";
import {readFileSync} from "node:fs";
const module=process.argv[2]?JSON.parse(readFileSync(process.argv[2],"utf8")):demoModule();
const games=Number(process.argv[3]??10),results=[];
for(const [a,b] of [["easy","normal"],["normal","hard"],["hard","easy"]])for(const flip of [false,true]){
 const profiles={[module.players[0]]:{difficulty:flip?b:a},[module.players[1]]:{difficulty:flip?a:b}};
 const report=benchmarkAI(module,{games,profiles,profileTiming:true,maxActions:250,maxTurns:40});
 results.push({profiles,...report});
}
console.log(JSON.stringify({note:"Seat-swapped deterministic seeds; demo may not have a terminal win condition. Timing is machine-dependent.",results},null,2));
if(results.some(r=>r.reasons.error||r.reasons.stalled))process.exitCode=1;
