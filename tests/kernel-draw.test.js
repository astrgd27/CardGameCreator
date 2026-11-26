import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
function fixture(){
 const m=demoModule();
 for(const player of m.players){
  m.zones.push({id:"deck-"+player,owner:player,visibility:"hidden",capacity:12});
  for(const definition of ["sentinel","raider","blade","ward"])m.setup.push({definition,owner:player,zone:"deck-"+player,face:"down"});
 }
 m.drawPolicies=m.players.map(player=>({player,deck:"deck-"+player,hand:"hand-"+player,opening:2,perTurn:1,shuffle:true,mulligans:1,mulliganPenalty:1}));
 return m;
}
test("opening draws and mulligans are deterministic, private and authorized",()=>{
 const rules=fixture();let m=createMatch(rules,{seed:42});
 assert.deepEqual(m,createMatch(rules,{seed:42}));
 assert.equal(m.state.zones["hand-a"].cards.length,3);
 assert.equal(matchView(m,"b").state.zones.find(z=>z.id==="deck-a").cards,undefined);
 assert.throws(()=>applyMatchAction(m,"b",{type:"mulligan"}));
 assert.throws(()=>applyMatchAction(m,"a",{type:"pass"}));
 m=applyMatchAction(m,"a",{type:"mulligan"}).match;
 assert.equal(m.state.zones["hand-a"].cards.length,2);
 assert.ok(m.state.zones["hand-a"].cards.includes("c5"));
 assert.equal(matchView(m,"a").opening.actor,"b");
 m=applyMatchAction(m,"b",{type:"keep"}).match;
 assert.equal(matchView(m,"a").opening,null);
 m=applyMatchAction(m,"a",{type:"pass"}).match;
 m=applyMatchAction(m,"b",{type:"pass"}).match;
 m=applyMatchAction(m,"a",{type:"endTurn"}).match;
 assert.equal(m.state.zones["hand-b"].cards.length,4);
});
test("draw policy rejects public deck and invalid opening size",()=>{
 const rules=fixture();rules.zones.find(z=>z.id==="deck-a").visibility="public";
 assert.throws(()=>createMatch(rules));
 const second=fixture();second.drawPolicies[0].opening=10;assert.throws(()=>createMatch(second));
});
