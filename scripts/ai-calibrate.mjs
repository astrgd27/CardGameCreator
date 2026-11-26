import {benchmarkAI} from "../kernel/ai-benchmark.js";
import {terminalModules} from "../kernel/ai-terminal-modules.js";
const games=Number(process.argv[2]??8),reports=[];
for(const m of terminalModules())for(const pair of [["easy","normal"],["normal","hard"],["easy","hard"]]){
 const rows=[];for(const flip of [false,true]){const levels=flip?[...pair].reverse():pair;const profiles=Object.fromEntries(m.players.map((p,i)=>[p,{difficulty:levels[i]}]));const r=benchmarkAI(m,{games,profiles,maxActions:120,maxTurns:30,profileTiming:true});rows.push({levels,...r})}
 const wins=Object.fromEntries(pair.map(p=>[p,0]));for(const r of rows)for(const [i,p] of m.players.entries())wins[r.levels[i]]+=r.wins[p];
 const total=games*2;reports.push({module:m.name,pair,wins,total,terminal:rows.reduce((n,r)=>n+(r.reasons.winner??0)+(r.reasons.draw??0),0),rows});
}
console.log(JSON.stringify(reports,null,2));if(reports.some(r=>r.rows.some(x=>x.reasons.error||x.reasons.stalled)))process.exitCode=1;
