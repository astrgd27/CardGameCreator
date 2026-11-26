// A small original demonstration module for the generalized runtime.
// Deterministic setup is intentional: this is a mechanics showcase, not a balanced TCG.
export function demoModule(){
 return {
  name:"Ironwood Duel",schemaVersion:2,
  players:["a","b"],definitions:["sentinel","raider","blade","ward"],
  zones:[
   {id:"field",owner:null,visibility:"public",capacity:12},
   ...["a","b"].flatMap(p=>[
    {id:"hand-"+p,owner:p,visibility:"owner",capacity:8},
    {id:"discard-"+p,owner:p,visibility:"public",capacity:12}
   ])
  ],
  setup:[
   {definition:"sentinel",owner:"a",zone:"field"},
   {definition:"raider",owner:"b",zone:"field"},
   {definition:"blade",owner:"a",zone:"field"},
   {definition:"ward",owner:"b",zone:"field"},
   {definition:"sentinel",owner:"a",zone:"hand-a"},
   {definition:"raider",owner:"b",zone:"hand-b"}
  ],
  resources:[{id:"energy",scope:"player",initial:3,max:6,refresh:2,refreshMode:"add"}],
  effects:{
   musterA:{requiresCard:{id:"c5",zone:"hand-a"},available:true,actors:["a"],costs:[{resource:"energy",amount:2,kind:"spend"}],program:[{type:"move",id:"c5",from:"hand-a",to:"field"}]},
   musterB:{requiresCard:{id:"c6",zone:"hand-b"},available:true,actors:["b"],costs:[{resource:"energy",amount:2,kind:"spend"}],program:[{type:"move",id:"c6",from:"hand-b",to:"field"}]},
   salvageA:{program:[{type:"resource",resource:"energy",delta:1}]},
   salvageB:{program:[{type:"resource",resource:"energy",delta:1}]}
  },
  triggers:[
   {id:"salvageA",actor:"a",effect:"salvageA",event:"combatDefeat",where:{id:"c1"}},
   {id:"salvageB",actor:"b",effect:"salvageB",event:"combatDefeat",where:{id:"c2"}}
  ],
  timing:{order:"lifo"},
  attachment:{zones:["field"],definitions:["blade","ward"],onHostMove:"follow",max:1},
  combat:{zones:["field"],stats:{sentinel:{attack:2,health:5},raider:{attack:3,health:4},blade:{attack:0,health:1},ward:{attack:0,health:2}},defeatZones:{a:"discard-a",b:"discard-b"}}
 };
}
