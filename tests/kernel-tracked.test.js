import test from "node:test";
import assert from "node:assert/strict";
import {moduleData,validate,act,pass,reveal,attack} from "../engine.js";
import {startTracked,trackedChoices,applyTracked,trackedView} from "../kernel/tracked-legacy.js";
import {assertInvariants} from "../kernel/objects.js";

function step(m,b,a){
 const original=structuredClone(b);
 const expected=structuredClone(b.legacy),p=expected.players[a.actor];
 if(a.type==="play")act(m,expected,a.actor,b.state.zones["base-"+a.actor+"-hand"].cards.indexOf(a.id));
 else if(a.type==="pass")pass(m,expected,a.actor);
 else if(a.type==="reveal"||a.type==="attack"){
  const index=p.field.findIndex((u,i)=>{
   const z=b.tableKeys[a.actor+":"+(u.zone||"field")];
   const local=p.field.slice(0,i).filter(v=>(v.zone||"field")===(u.zone||"field")).length;
   return b.state.zones[z].cards[local]===a.id;
  });
  if(a.type==="reveal")reveal(m,expected,a.actor,index);
  else attack(m,expected,a.actor,index,a.move,a.target);
 }
 const result=applyTracked(m,b,a);
 assert.deepEqual(result.bridge.legacy,expected);
 assert.deepEqual(b,original);
 assert.ok(assertInvariants(result.bridge.state));
 assert.deepEqual(Object.keys(result.bridge.state.objects).sort(),Object.keys(b.state.objects).sort());
 return result;
}
test("persistent identity follows a specifically selected duplicate from hand to discard or field",()=>{
 const m=validate(moduleData());
 const c=m.cards[0];
 for(const card of m.cards)card.copies=1;
 m.decks=[{[c.id]:6},{}];
 for(const card of m.cards.slice(1))m.decks[0][card.id]=0;
 const b=startTracked(m,5),ids=b.state.zones["base-0-hand"].cards;
 assert.equal(ids.length,4);
 const {bridge:n,events}=step(m,b,{type:"play",actor:0,id:ids[2]});
 assert.deepEqual(n.state.zones["base-0-hand"].cards,[ids[0],ids[1],ids[3]]);
 assert.deepEqual(n.state.zones["base-0-discard"].cards,[ids[2]]);
 assert.equal(events[0].id,ids[2]);
});
test("invalid action does not mutate match or identity state",()=>{
 const m=validate(moduleData()),b=startTracked(m,2),before=structuredClone(b);
 for(const a of [{type:"play",actor:0,id:"missing"},{type:"pass",actor:1},{type:"attack",actor:0,id:"missing",move:0,target:-1},{type:"nope",actor:0}])
 assert.throws(()=>applyTracked(m,b,a));
 assert.deepEqual(b,before);
});
test("tracked actions reproduce 20 seeded legacy matches while preserving every identity",()=>{
 for(let seed=0;seed<20;seed++){
  const m=validate(moduleData());
  m.cards[0].timing="reaction";
  let b=startTracked(m,seed),turns=0;
  while(b.legacy.winner===null&&turns++<500){
   const choices=trackedChoices(m,b,b.legacy.actor);
   const a=choices.find(x=>x.type==="reveal")??choices.find(x=>x.type==="attack"&&x.target>=0)??choices.find(x=>x.type==="attack")??choices.find(x=>x.type==="play")??choices[0];
   assert.ok(a);
   b=step(m,b,a).bridge;
  }
  assert.notEqual(b.legacy.winner,null);
 }
});
test("view and action choices do not expose opponent hand IDs",()=>{
 const m=validate(moduleData()),b=startTracked(m,12),v=trackedView(b,0);
 const other=b.state.zones["base-1-hand"].cards;
 assert.equal(v.zones.find(z=>z.id==="base-1-hand").cards,undefined);
 for(const id of other)assert.ok(!JSON.stringify(trackedChoices(m,b,0)).includes('"'+id+'"'));
 assert.deepEqual(trackedChoices(m,b,1),[]);
});
