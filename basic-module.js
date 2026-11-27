// Compile guided two-seat duels into the same canonical format as imported games.
export function makeBasic(name, template){
 const players=["a","b"];
 const lanes=template==="lanes"?["left","right"]:["field"];
 const definitions=template==="blank"?[]:["scout","guardian","charger"];
 const cardPresentation={
  scout:{name:"Mosswing Scout",type:"Unit",symbol:"✦",text:"A swift pathfinder."},
  guardian:{name:"Briar Guardian",type:"Unit",symbol:"⬢",text:"Holds the line."},
  charger:{name:"Amberhorn Charger",type:"Unit",symbol:"✹",text:"Leads the charge."}
 };
 const zones=players.flatMap(player=>[
  {id:"deck-"+player,owner:player,visibility:"hidden",capacity:100},
  {id:"hand-"+player,owner:player,visibility:"owner",capacity:12},
  {id:"discard-"+player,owner:player,visibility:"public",capacity:100},
  ...lanes.map(lane=>({id:lane+"-"+player,owner:player,visibility:"public",capacity:4}))
 ]);
 return {
  schemaVersion:2,name,description:"Build a force and break through your rival’s defenses.",players,definitions,zones,
  cardPresentation:definitions.length?cardPresentation:{},setup:[],effects:{},timing:{order:"lifo"},
  resources:[{id:"life",scope:"player",initial:12,max:12},{id:"energy",scope:"player",initial:3,max:10,refresh:3,refreshMode:"set"}],
  drawPolicies:players.map(player=>({player,deck:"deck-"+player,hand:"hand-"+player,opening:3,perTurn:1,shuffle:true,mulligans:1,exhaustion:"lose"})),
  deckRules:{min:3,max:60,copies:12},
  decks:players.map((player,i)=>({name:i?"Rival starter":"Your starter",player,zone:"deck-"+player,cards:definitions.map(definition=>({definition,count:4}))})),
  combat:{zones:players.flatMap(p=>lanes.map(l=>l+"-"+p)),stats:definitions.length?{scout:{attack:2,health:2},guardian:{attack:1,health:5},charger:{attack:4,health:3}}:{},defeatZones:{a:"discard-a",b:"discard-b"},group:{lifeResource:"life",maxAttackers:5}},
  victory:players.map(player=>({type:"resourceAtMost",player,resource:"life",amount:0})),
  battlefield:{columns:lanes.length,zones:zones.map(z=>({zone:z.id,label:z.id.startsWith("discard")?"Discard":z.id.startsWith("deck")?"Deck":z.id.startsWith("hand")?"Hand":z.id.startsWith("left")?"West lane":z.id.startsWith("right")?"East lane":"Battlefield",display:/^(deck|discard)/.test(z.id)?"count":"cards"}))},
  ...(lanes.length>1?{spatial:{grid:false,attackRange:1,blockRange:1,slots:players.flatMap((p,y)=>lanes.map((lane,x)=>({zone:lane+"-"+p,x,y,ownerOnly:true}))),edges:lanes.map(lane=>[lane+"-a",lane+"-b"])}}:{}),
  basicDuel:{lanes,costs:definitions.length?{scout:1,guardian:2,charger:3}:{}}
 };
}

export function compileBasic(draft){
 const module=structuredClone(draft);
 if(!module.basicDuel)return module;
 const basic=module.basicDuel;
 if(!Array.isArray(basic.lanes)||!basic.lanes.length||basic.lanes.length>2||basic.lanes.some(lane=>!["field","left","right"].includes(lane))||!basic.costs||typeof basic.costs!=="object")throw Error("Invalid guided Workshop configuration.");
 for(const definition of module.definitions)for(const player of module.players)for(const lane of basic.lanes){
  const hand="hand-"+player, destination=lane+"-"+player;
  const id="deploy-"+definition+"-"+destination;
  const perk=basic.perks?.[definition]??"none";
  const cost=basic.costs[definition]??1;
  const signature=cost+":"+perk;
  if(module.effects[id]?.workshopSignature===signature)continue;
  const extra=perk==="draw"?[{type:"draw",from:"deck-"+player,to:hand,count:1}]:perk==="heal"?[{type:"resource",resource:"life",delta:2,overflow:"clamp"}]:[];
  module.effects[id]={
   workshopSignature:signature,
   label:module.basicDuel.lanes.length>1?"Deploy to "+(lane==="left"?"west lane":"east lane"):"Deploy unit",
   available:true,activeOnly:true,roomInZone:destination,actors:[player],windows:["main"],sourceDefinition:definition,sourceZones:[hand],
   costs:[{kind:"spend",resource:"energy",amount:cost}],
   program:[{type:"move",choice:"source",from:hand,to:destination},...extra]
  };
 }
 return module;
}
