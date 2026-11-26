import test from "node:test";
import assert from "node:assert/strict";
import {demoModule} from "../kernel/demo-module.js";
import {createMatch,applyMatchAction,matchView} from "../kernel/runtime.js";
import {deriveStatistic} from "../kernel/modifiers.js";
import {validateDeck} from "../kernel/decks.js";
import {changeCardState} from "../kernel/card-state.js";
const act=(m,p,a)=>applyMatchAction(m,p,a).match;
test("conditional public auras stack and expire when source leaves or loses status",()=>{
 const r=demoModule();r.keywordRules={keywords:{},definitions:{},passives:[{sourceDefinition:"blade",sourceZones:["field"],targetZones:["field"],relation:"friendly",stat:"attack",op:"add",value:2,requiresStatus:"charged"}]};
 let m=createMatch(r);const stat=s=>deriveStatistic(s,"c1","attack",2,[],{turn:1}).value;
 assert.equal(stat(m.state),2);
 m.state=changeCardState(m.state,"a","c3",{type:"status",status:"charged",operation:"add"}).state;assert.equal(stat(m.state),4);
 m.state=changeCardState(m.state,"a","c3",{type:"flip",face:"down"}).state;assert.equal(stat(m.state),2);
});
test("keyword restrictions prevent attacks and damage, and target choices exclude protected opponents",()=>{
 const r=demoModule();r.keywordRules={keywords:{warded:{restrictions:["damageImmune","untargetable"]},pacifist:{restrictions:["cannotAttack"]}},definitions:{raider:["warded"],blade:["pacifist"]},passives:[]};
 r.effects.target={available:true,actors:["a"],program:[{type:"target",name:"victim",selector:{controller:"opponent",zones:["field"]}}]};
 let m=createMatch(r);assert.throws(()=>act(m,"a",{type:"attack",attacker:"c3",defender:"c2"}));
 m=act(m,"a",{type:"attack",attacker:"c1",defender:"c2"});assert.equal(m.state.objects.c2.damage,0);
 m=act(m,"a",{type:"activate",effect:"target"});m=act(m,"a",{type:"pass"});m=act(m,"b",{type:"pass"});
 assert.deepEqual(matchView(m,"a").choice.options,["c4"]);
});
test("deck restrictions enforce tags, quotas, required cards and point budgets",()=>{
 const r=demoModule();r.cardPresentation={sentinel:{type:"Unit",tags:["order"],deckPoints:2},blade:{type:"Gear",tags:["order"],deckPoints:1},raider:{tags:["chaos"]}};
 r.deckRules={min:1,max:8,copies:4,copyLimits:{sentinel:1},banned:["raider"],allowedTags:["order"],required:{sentinel:1},quotas:[{kind:"type",value:"Unit",min:1,max:2}],maxPoints:3};
 const deck={name:"test",player:"a",zone:"hand-a",cards:[{definition:"sentinel",count:1},{definition:"blade",count:1}]};
 assert.deepEqual(validateDeck(r,deck),[]);
 deck.cards.push({definition:"raider",count:1});deck.cards[1].count=3;
 const errors=validateDeck(r,deck);assert.ok(errors.some(e=>e.includes("Banned")));assert.ok(errors.some(e=>e.includes("point budget")));
});
