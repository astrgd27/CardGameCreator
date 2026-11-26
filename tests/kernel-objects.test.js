import test from "node:test";
import assert from "node:assert/strict";
import {createState,addCard,moveCard,projectState,assertInvariants} from "../kernel/objects.js";

const setup=()=>createState({players:["p1","p2"],definitions:["wolf","spell"],zones:[
{id:"deck",owner:"p1",visibility:"hidden",capacity:10},
{id:"hand",owner:"p1",visibility:"owner",capacity:5},
{id:"field",owner:"p1",visibility:"public",capacity:2},
{id:"shared",owner:null,visibility:"public",capacity:10}
]});

test("duplicate definitions have independent deterministic instance identities",()=>{
 const a=addCard(setup(),{definition:"wolf",owner:"p1",zone:"deck"});
 const b=addCard(a.state,{definition:"wolf",owner:"p1",zone:"deck"});
 assert.equal(a.id,"c1");assert.equal(b.id,"c2");
 assert.deepEqual(a.state.zones.deck.cards,["c1"]);
 assert.deepEqual(b.state.zones.deck.cards,["c1","c2"]);
 assert.deepEqual(addCard(setup(),{definition:"wolf",owner:"p1",zone:"deck"}),a);
 assert.ok(assertInvariants(b.state));
});

test("moves preserve ownership and identity and can change control",()=>{
 const a=addCard(setup(),{definition:"wolf",owner:"p1",zone:"deck"});
 a.state.objects[a.id].damage=2;
 a.state.objects[a.id].counters.power=3;
 const b=moveCard(a.state,{id:a.id,from:"deck",to:"field",controller:"p2"});
 assert.equal(b.state.objects[a.id].owner,"p1");
 assert.equal(b.state.objects[a.id].controller,"p2");
 assert.equal(b.state.objects[a.id].damage,2);
 assert.equal(b.state.objects[a.id].counters.power,3);
 assert.deepEqual(a.state.zones.deck.cards,[a.id]);
 assert.deepEqual(b.event,{type:"cardMoved",id:a.id,from:"deck",to:"field",position:0});
 const c=moveCard(b.state,{id:a.id,from:"field",to:"deck",reset:true});
 assert.equal(c.state.objects[a.id].damage,0);
 assert.deepEqual(c.state.objects[a.id].counters,{});
 assert.equal(c.state.objects[a.id].controller,"p1");
 assert.ok(assertInvariants(c.state));
});

test("capacity, bad source and bad position reject atomically",()=>{
 let s=setup();
 for(let i=0;i<2;i++)s=addCard(s,{definition:"wolf",owner:"p1",zone:"field"}).state;
 const a=addCard(s,{definition:"spell",owner:"p1",zone:"deck"});
 const before=structuredClone(a.state);
 for(const action of [
 {id:a.id,from:"deck",to:"field"},
 {id:a.id,from:"hand",to:"shared"},
 {id:a.id,from:"deck",to:"shared",position:2},
 {id:a.id,from:"deck",to:"shared",controller:"p3"}
 ])assert.throws(()=>moveCard(a.state,action));
 assert.deepEqual(a.state,before);
 assert.throws(()=>addCard(a.state,{definition:"spell",owner:"p1",zone:"field"}));
});

test("ordered zone moves support reordering at full capacity",()=>{
 const a=addCard(setup(),{definition:"wolf",owner:"p1",zone:"field"});
 const b=addCard(a.state,{definition:"spell",owner:"p1",zone:"field",position:0});
 const c=moveCard(b.state,{id:a.id,from:"field",to:"field",position:0});
 assert.deepEqual(c.state.zones.field.cards,[a.id,b.id]);
 assert.ok(assertInvariants(c.state));
});

test("opponent views omit private identities and hidden card characteristics",()=>{
 let s=setup();
 for(const [zone,face] of [["deck","down"],["hand","up"],["field","down"],["shared","up"]])
 s=addCard(s,{definition:"wolf",owner:"p1",zone,face}).state;
 const p=projectState(s,"p2"),own=projectState(s,"p1");
 assert.equal(p.zones[0].count,1);assert.equal(p.zones[0].cards,undefined);
 assert.equal(p.zones[1].cards,undefined);
 assert.deepEqual(p.zones[2].cards,[{face:"down"}]);
 assert.equal(p.zones[3].cards[0].definition,"wolf");
 assert.equal(own.zones[1].cards[0].id,"c2");
 assert.equal(own.zones[0].cards,undefined);
 assert.ok(!JSON.stringify(p).includes('"c1"'));
 assert.ok(!JSON.stringify(p).includes('"c2"'));
 assert.ok(!JSON.stringify(p).includes('"c3"'));
});

test("invariants detect duplicate and unplaced objects and state survives JSON",()=>{
 const a=addCard(setup(),{definition:"wolf",owner:"p1",zone:"deck"});
 assert.ok(assertInvariants(JSON.parse(JSON.stringify(a.state))));
 const dup=structuredClone(a.state);dup.zones.hand.cards.push(a.id);
 assert.throws(()=>assertInvariants(dup),/Duplicate/);
 const orphan=structuredClone(a.state);orphan.zones.deck.cards=[];
 assert.throws(()=>assertInvariants(orphan),/Unplaced/);
});
