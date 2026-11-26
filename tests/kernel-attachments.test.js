import test from "node:test";
import assert from "node:assert/strict";
import {createState,addCard} from "../kernel/objects.js";
import {attachCard,detachCard,moveWithAttachments,assertAttachments} from "../kernel/attachments.js";
function setup(capacity=5){
 let s=createState({players:["p"],definitions:["unit","gear"],zones:[
 {id:"field",owner:"p",visibility:"public",capacity:5},
 {id:"discard",owner:"p",visibility:"public",capacity}]});
 for(const definition of ["unit","gear","gear"])s=addCard(s,{definition,owner:"p",zone:"field"}).state;
 return s;
}
test("attach and detach preserve card membership and input state",()=>{
 const s=setup(),a=attachCard(s,{id:"c2",host:"c1",max:1});
 assert.equal(s.attachments,undefined);assert.equal(a.state.attachments.c2.host,"c1");
 assert.throws(()=>attachCard(a.state,{id:"c3",host:"c1",max:1}));
 assert.throws(()=>attachCard(a.state,{id:"c1",host:"c2"}),/cycle/);
 assert.deepEqual(detachCard(a.state,"c2").state.attachments,{});
});
test("host movement follows nested attachments and detaches selected children",()=>{
 let s=attachCard(setup(),{id:"c2",host:"c1",onHostMove:"follow"}).state;
 s=attachCard(s,{id:"c3",host:"c2",onHostMove:"detach"}).state;
 const a=moveWithAttachments(s,{id:"c1",from:"field",to:"discard"});
 assert.deepEqual(a.state.zones.discard.cards,["c1","c2"]);
 assert.deepEqual(a.state.zones.field.cards,["c3"]);
 assert.equal(a.state.attachments.c2.host,"c1");
 assert.equal(a.state.attachments.c3,undefined);
 assert.ok(assertAttachments(a.state));
});
test("capacity and reject policy roll back entire attachment movement",()=>{
 for(const policy of ["follow","reject"]){
  const s=attachCard(setup(1),{id:"c2",host:"c1",onHostMove:policy}).state,before=structuredClone(s);
  assert.throws(()=>moveWithAttachments(s,{id:"c1",from:"field",to:"discard"}));
  assert.deepEqual(s,before);
 }
});
test("moving an attachment independently severs the link",()=>{
 const s=attachCard(setup(),{id:"c2",host:"c1"}).state;
 const a=moveWithAttachments(s,{id:"c2",from:"field",to:"discard"});
 assert.deepEqual(a.state.attachments,{});assert.ok(assertAttachments(a.state));
});
