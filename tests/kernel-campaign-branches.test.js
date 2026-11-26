import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction} from "../kernel/runtime.js";
import {validateCampaign,newCampaign,recordEncounter,encounterModule,readProgress,saveProgress} from "../kernel/campaign.js";
function fixture(){
 const m=demoModule();m.zones.push({id:"deck-a",owner:"a",visibility:"hidden",capacity:20});
 m.campaign={id:"branching",player:"a",rewardZone:"deck-a",encounters:["start","forest","keep"].map(id=>({id,name:id,overrides:{victory:[{type:"emptyZone",player:"b",zone:"discard-b"}]}}))};
 m.campaign.encounters[0].routes=[{to:"forest",label:"Forest"},{to:"keep",label:"Keep"}];m.campaign.encounters[0].rewards=[{definition:"sentinel",count:2}];
 return m;
}
test("branch choices and persistent rewards affect subsequent deck setup",()=>{
 const m=fixture();assert.deepEqual(validateCampaign(m),[]);
 const p=newCampaign(m),win={winner:"a"};
 assert.throws(()=>recordEncounter(m,p,0,win));
 assert.throws(()=>recordEncounter(m,p,0,win,"bogus"));
 const next=recordEncounter(m,p,0,win,"keep");
 assert.equal(next.index,2);assert.deepEqual(next.visited,["start"]);
 assert.deepEqual(next.rewards,[{definition:"sentinel",count:2}]);
 const storage={value:null,getItem(){return this.value},setItem(k,v){this.value=v}};
 saveProgress(next,storage);const loaded=readProgress(m,storage);
 const match=createMatch(encounterModule(m,m.campaign.encounters[2],loaded));
 assert.equal(match.state.zones["deck-a"].cards.length,2);
 assert.equal(m.setup.length,6);
 assert.equal(recordEncounter(m,loaded,2,win).complete,true);
});
test("resource and prior choice conditions branch inside effect resolution",()=>{
 const m=demoModule();m.effects.branch={available:true,program:[
 {type:"choose",name:"mode",options:["gain","pass"]},
 {type:"skipUnlessChoice",choice:"mode",value:"gain",skip:1},
 {type:"resource",resource:"energy",delta:1},
 {type:"skipUnlessResource",resource:"energy",comparison:"atLeast",amount:4,skip:1},
 {type:"resource",resource:"energy",delta:1}
 ]};
 for(const value of ["gain","pass"]){
  let match=createMatch(m);
  for(const [actor,action] of [["a",{type:"activate",effect:"branch"}],["a",{type:"pass"}],["b",{type:"pass"}],["a",{type:"choose",value}]])match=applyMatchAction(match,actor,action).match;
  assert.equal(match.state.resourcePools["player-a"].energy,value==="gain"?5:3);
 }
});
