import test from "node:test";
import assert from "node:assert/strict";
import {moduleData,validate,act,pass,attack,reason,bot} from "../engine.js";
import {initializeLegacyBridge,legacySnapshot} from "../kernel/legacy-adapter.js";
import {assertInvariants,projectState} from "../kernel/objects.js";

const defs=(s,z)=>s.zones[z].cards.map(id=>s.objects[id].definition);
function compare(m,l,b){
 const {state:s,tableKeys,turn}=b;
 assert.ok(assertInvariants(s));
 for(const [i,p] of l.players.entries()){
  for(const pile of ["deck","hand","discard"])assert.deepEqual(defs(s,"base-"+i+"-"+pile),p[pile]);
  for(const z of m.table.filter(z=>z.owner==="player")){
   const key=tableKeys[i+":"+z.id];
   if(z.kind==="cards")assert.deepEqual(defs(s,key),p.zones[z.id]);
   else {
    const units=p.field.filter(u=>(u.zone||"field")===z.id);
    assert.deepEqual(defs(s,key),units.map(u=>u.id));
    for(const [n,u] of units.entries()){
     const o=s.objects[s.zones[key].cards[n]],c=m.cards.find(c=>c.id===u.id);
     assert.equal(o.face,u.hidden?"down":"up");assert.equal(o.orientation,u.ready?"ready":"resting");
     assert.equal(o.damage,Math.max(0,(u.hidden?2:c.health)-u.hp));
    }
   }
  }
 }
 for(const z of m.table.filter(z=>z.owner==="shared"))assert.deepEqual(defs(s,tableKeys["shared:"+z.id]),l.shared[z.id]);
 assert.deepEqual(defs(s,"pending"),l.pending?[l.pending.id]:[]);
 assert.deepEqual(turn.resources,l.players.map(p=>({life:p.life,energy:p.energy})));
 assert.equal(turn.active,"p"+l.turn);assert.equal(turn.actor,"p"+l.actor);
 assert.equal(turn.winner,l.winner===null?null:"p"+l.winner);
 assert.equal(turn.round,l.round);assert.equal(turn.phase,l.phase);
}
test("bridge initializes legacy modules deterministically without mutating the source",()=>{
 const m=moduleData(),before=structuredClone(m);
 const a=initializeLegacyBridge(m,42),b=initializeLegacyBridge(m,42);
 assert.deepEqual(a,b);assert.deepEqual(m,before);
 compare(validate(structuredClone(m)),a.legacy,a);
});
test("setup piles, shared ownership, custom unit zones and hidden projections survive conversion",()=>{
 const m=validate(moduleData());
 m.table.push({id:"x".repeat(80),name:"Reserve",owner:"player",visibility:"public",capacity:5,start:0,kind:"units",x:0,y:0,w:20,h:20});
 m.table.push({id:"prizes",name:"Prizes",owner:"player",visibility:"hidden",capacity:6,start:3,kind:"cards",x:0,y:0,w:20,h:20});
 m.table.push({id:"market",name:"Market",owner:"shared",visibility:"public",capacity:5,start:2,kind:"cards",x:0,y:0,w:20,h:20});
 m.cards[1].zone=m.table[1].id;
 const {legacy:l}=initializeLegacyBridge(m,4);
 l.players[0].hand=[m.cards[1].id];act(m,l,0,0);
 const b=legacySnapshot(m,l);compare(m,l,b);
 const {state:s,tableKeys:k}=b;
 assert.equal(s.objects[s.zones[k["shared:market"]].cards[0]].owner,"p0");
 const view=projectState(s,"p1");
 assert.equal(view.zones.find(z=>z.id===k["0:prizes"]).cards,undefined);
 assert.deepEqual(view.zones.find(z=>z.id===k["0:"+m.table[1].id]).cards,[{face:"down"}]);
});
test("pending responses preserve the in-flight card and active player",()=>{
 const m=validate(moduleData()),[a,b]=m.cards;
 b.timing="reaction";
 const {legacy:l}=initializeLegacyBridge(m,2);
 l.players[0].hand=[a.id];l.players[1].hand=[b.id];act(m,l,0,0);
 const bridge=legacySnapshot(m,l);compare(m,l,bridge);
 assert.equal(bridge.turn.actor,"p1");
 assert.equal(bridge.state.zones.pending.cards.length,1);
 act(m,l,1,0);compare(m,l,legacySnapshot(m,l));
});
test("seeded legacy duels can be represented after every accepted action",()=>{
 for(let seed=0;seed<12;seed++){
  const m=validate(moduleData()),{legacy:l}=initializeLegacyBridge(m,seed);
  let n=0;
  while(l.winner===null&&n++<500){
   if(l.actor===1)bot(m,l);
   else {
    const j=l.players[0].hand.findIndex((_,i)=>!reason(m,l,0,i));
    if(j>=0)act(m,l,0,j);else pass(m,l,0);
   }
   compare(m,l,legacySnapshot(m,l));
  }
  assert.notEqual(l.winner,null);
 }
});
