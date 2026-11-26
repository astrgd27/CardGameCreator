import {demoModule} from "./demo-module.js";
// Original symmetric terminal scenarios; these are calibration fixtures, not full games.
export function terminalModules(){
 const duel=demoModule();duel.name="Calibration: attrition";duel.triggers=[];duel.effects={};duel.setup=duel.setup.slice(0,2);duel.setup[1].definition="sentinel";delete duel.attachment;
 duel.victory=[{type:"emptyZone",player:"a",zone:"front-a"},{type:"emptyZone",player:"b",zone:"front-b"}];
 for(const p of duel.players)duel.zones.push({id:"front-"+p,owner:p,visibility:"public",capacity:5});duel.setup.forEach(c=>c.zone="front-"+c.owner);duel.combat.zones=["front-a","front-b"];duel.combat.retaliate=false;duel.combat.stats.sentinel={attack:3,health:5};
 const race=demoModule();race.name="Calibration: score race";race.triggers=[];race.effects={};race.objectives={winScore:3};delete race.combat;delete race.attachment;
 for(const p of race.players)race.effects["score"+p]={available:true,actors:[p],limit:{scope:"turn",count:1},costs:[{kind:"spend",resource:"energy",amount:1}],program:[{type:"awardScore",player:p,amount:1}]};
 return [duel,race];
}
