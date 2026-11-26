import test from "node:test";
import assert from "node:assert/strict";
import {createState} from "../kernel/objects.js";
import {initializeResources,quotePayment,payResources,changeResource,refreshResources} from "../kernel/resources.js";
const setup=()=>initializeResources(createState({players:["a","b"],definitions:[],zones:[{id:"field",owner:null,visibility:"public",capacity:10}]}),[
 {id:"mana",scope:"player",initial:5,max:10,refresh:3,refreshMode:"add"},
 {id:"action",scope:"player",initial:2,max:2,refresh:2,refreshMode:"set"},
 {id:"market",scope:"shared",initial:4,max:8,refresh:1,refreshMode:"add"}
]);
const cost=(resource,amount,kind="spend")=>({resource,amount,kind});
test("multiple costs aggregate and thresholds do not consume resources",()=>{
 const s=setup(),r=payResources(s,"a",[cost("mana",2),cost("mana",3),cost("mana",5,"threshold"),cost("action",1)]);
 assert.equal(r.state.resourcePools["player-a"].mana,0);
 assert.equal(r.state.resourcePools["player-a"].action,1);
 assert.equal(r.state.resourcePools["player-b"].mana,5);
 assert.equal(s.resourcePools["player-a"].mana,5);
 assert.equal(r.events.length,2);
});
test("unaffordable multi-resource payments reject atomically",()=>{
 const s=setup(),before=structuredClone(s),costs=[cost("mana",2),cost("action",3)];
 assert.equal(quotePayment(s,"a",costs).legal,false);
 assert.throws(()=>payResources(s,"a",costs),/Insufficient/);
 assert.throws(()=>payResources(s,"a",[cost("unknown",1)]));
 assert.throws(()=>payResources(s,"a",[cost("mana",-1)]));
 assert.deepEqual(s,before);
});
test("shared resources are accessible to both players and refresh only explicitly",()=>{
 const s=payResources(setup(),"a",[cost("market",3),cost("action",2)]).state;
 assert.equal(quotePayment(s,"b",[cost("market",2)]).legal,false);
 const r=refreshResources(s,"a").state;
 assert.equal(r.resourcePools.shared.market,1);
 assert.equal(r.resourcePools["player-a"].mana,8);
 assert.equal(r.resourcePools["player-a"].action,2);
 assert.equal(refreshResources(r,"b",{includeShared:true}).state.resourcePools.shared.market,2);
});
test("bounded adjustments clamp or reject and refresh saturates",()=>{
 const s=setup(),r=changeResource(s,"a","mana",100).state;
 assert.equal(r.resourcePools["player-a"].mana,10);
 assert.equal(refreshResources(r,"a").state.resourcePools["player-a"].mana,10);
 assert.throws(()=>changeResource(s,"a","mana",-6,{overflow:"reject"}));
 assert.equal(changeResource(s,"a","mana",-6).state.resourcePools["player-a"].mana,0);
});
