import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction} from "../kernel/runtime.js";
import {validateCampaign,newCampaign,recordEncounter,saveProgress,readProgress,encounterModule} from "../kernel/campaign.js";
function fixture(){
 const m=demoModule();m.campaign={id:"trial",player:"a",encounters:["first","second"].map(id=>({id,name:id,overrides:{victory:[{type:"emptyZone",player:"b",zone:"discard-b"}]}}))};return m;
}
test("campaign progression survives storage and rejects stale victories",()=>{
 const m=fixture(),data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 assert.deepEqual(validateCampaign(m),[]);
 assert.equal(encounterModule(m,m.campaign.encounters[0]).campaign,undefined);
 let p=newCampaign(m);
 p=recordEncounter(m,p,0,{winner:"b",draw:false});assert.equal(p.index,0);assert.equal(p.losses,1);
 p=recordEncounter(m,p,0,{winner:"a",draw:false});saveProgress(p,storage);
 p=readProgress(m,storage);assert.equal(p.index,1);
 assert.throws(()=>recordEncounter(m,p,0,{winner:"a"}));
 p=recordEncounter(m,p,1,{winner:"a"});assert.equal(p.complete,true);
});
test("conditional scripting skips exactly the specified operations",()=>{
 for(const minimum of [1,3]){
  const m=demoModule();m.effects.conditional={available:true,program:[{type:"skipUnless",selector:{zones:["field"],controller:"self"},minimum,skip:1},{type:"resource",resource:"energy",delta:1},{type:"resource",resource:"energy",delta:1}]};
  let match=createMatch(m);for(const [p,a] of [["a",{type:"activate",effect:"conditional"}],["a",{type:"pass"}],["b",{type:"pass"}]])match=applyMatchAction(match,p,a).match;
  assert.equal(match.state.resourcePools["player-a"].energy,minimum===1?5:4);
 }
});
