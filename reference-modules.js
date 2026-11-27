// Original starter games: small, editable, deterministic, not commercial reproductions.
import {demoModule} from "./kernel/demo-module.js";
const base=(name,description)=>{const m=demoModule();m.name=name;m.referenceDescription=description;m.triggers=[];m.effects={};m.cardPresentation={};return m};
const life=m=>{m.resources.push({id:"life",scope:"player",initial:8,max:8});m.victory=m.players.map(player=>({type:"resourceAtMost",player,resource:"life",amount:0}));return m};
function deployment(m){for(const p of m.players)m.effects["deploy"+p]={available:true,actors:[p],sourceDefinition:p==="a"?"sentinel":"raider",sourceZones:["hand-"+p],costs:[{kind:"spend",resource:"energy",amount:1}],program:[{type:"move",choice:"source",from:"hand-"+p,to:"field"}]};return m}
function creatures(){const m=base("Looboo","Raise adorable extraterrestrial creatures from Looboo, evolve them and battle for discovery badges.");m.zones.push(...m.players.map(p=>({id:"active-"+p,owner:p,visibility:"public",capacity:4})));m.setup[0].zone="active-a";m.setup[1].zone="active-b";m.setup[2].zone="active-a";m.setup[3].zone="active-b";m.combat.zones=["active-a","active-b"];m.combat.retaliate=false;m.combat.attackerDefinitions=["sentinel","raider"];m.combat.defenderDefinitions=["sentinel","raider"];m.combat.attachedCosts={sentinel:{blade:1},raider:{ward:1}};m.attachment.zones=m.combat.zones;m.attachment.hostDefinitions=["sentinel","raider"];m.attachment.max=3;m.actionPolicy={limits:{attach:1,stack:1,attack:1},attackEndsTurn:true};m.stackRules=m.players.map(p=>({id:"evolve-"+p,hostDefinition:p==="a"?"sentinel":"raider",materialDefinition:p==="a"?"sentinel":"raider",hostZones:["active-"+p],materialZones:["hand-"+p],preserve:["damage","attachments","controller","orientation","counters"]}));m.victory=m.players.map(player=>({type:"emptyZone",player,zone:"active-"+player}));m.combat.stats.blade.attack=0;m.combat.stats.ward.attack=0;return m}
function spells(){const m=deployment(life(base("Crystal Circuit","Bionic robots battle using five distinct crystal energy sources, rapid responses and tactical combat.")));m.combat.group={lifeResource:"life",maxAttackers:3,assignment:"lethal"};m.combat.damageCleanup="turn";m.generators=[{id:"channel",definition:"blade",zones:["field"],resource:"energy",amount:1},{id:"ward-channel",definition:"ward",zones:["field"],resource:"energy",amount:1}];m.phases=[{id:"main",actions:["activate","attach"]},{id:"combat",actions:["attack","activate"]},{id:"second-main",actions:["activate","attach"]}];m.effects.bolt={available:true,costs:[{kind:"spend",resource:"energy",amount:1}],program:[{type:"resource",resource:"life",delta:1,overflow:"clamp"}]};return m}
function chains(){const m=deployment(life(base("Taste Dimension","Rival chefs summon dish monsters, sacrifice ingredients and fuse impossible culinary creations.")));m.chain={maxLinks:5,minimumResponseSpeed:2,escalate:true,speedByEffect:{deploya:1,deployb:1,ritual:1,ward:2}};m.combat.group={lifeResource:"life",maxAttackers:2};m.zones.push(...m.players.map(p=>({id:"reserve-"+p,owner:p,visibility:"hidden",capacity:5})));m.effects.ritual={available:true,actors:["a"],cardCosts:[{kind:"sacrifice",from:"field",to:"discard-a",count:1}],program:[{type:"move",id:"c5",from:"hand-a",to:"field"}]};m.effects.ward={available:true,program:[{type:"resource",resource:"life",delta:1,overflow:"clamp"}]};return m}
function crews(){const m=deployment(base("Ringworld Rumble","Transported to a shonen world of professional wrestling, rival captains assemble teams and fight for the championship."));m.zones.push(...m.players.map(p=>({id:"life-"+p,owner:p,visibility:"hidden",capacity:3})));for(const p of m.players)for(let i=0;i<3;i++)m.setup.push({definition:p==="a"?"blade":"ward",owner:p,zone:"life-"+p,face:"down"});m.combat.group={maxAttackers:2,intercept:"direct",lifeCards:Object.fromEntries(m.players.map(p=>[p,{zone:"life-"+p,destination:"hand-"+p,perAttack:true,emptyLoss:true}])),reactions:[{id:"shield",definition:"ward",zones:["hand-b"],destination:"discard-b",amount:1}]};return m}
function domains(){const m=deployment(base("Generation Wars","Satirical champions of Boomers, Gen X, Millennials, Gen Z and the Silent Generation contest cultural battlefields."));m.zones.push({id:"ridge",owner:null,visibility:"public",capacity:5},{id:"crossing",owner:null,visibility:"public",capacity:5});m.spatial={grid:true,slots:[{zone:"field",x:0,y:0},{zone:"ridge",x:1,y:0},{zone:"crossing",x:0,y:1}],maxSteps:1,resource:"energy",costPerStep:1,attackRange:1};m.combat.zones=["field","ridge","crossing"];m.objectives={winScore:5,locations:["ridge","crossing"].map(zone=>({zone,capturePoints:1,holdPoints:1,persistent:true}))};return m}
const card=(name,type,frame,text,tags=[])=>({name,type,frame,text,tags});
const skins=[
 {sentinel:card("Pufflump","Looboo creature · Spore","verdant","A round, waddling alien with translucent ears that glow when it feels safe.",["spore","basic"]),raider:card("Zibbler","Looboo creature · Spark","gold","This six-legged little ball of static collects shiny pebbles for its nest.",["spark","basic"]),blade:card("Spore Nutrient","Nutrient","verdant","Nourishes a Spore creature.",["energy","spore"]),ward:card("Spark Nutrient","Nutrient","gold","Nourishes a Spark creature.",["energy","spark"])},
 {sentinel:card("Bastion R-12","Bionic defender","steel","Ceramic armor and redundant servos keep this guardian operational.",["azure","robot"]),raider:card("Furnace EX","Bionic assault unit","crimson","A close-range combat chassis powered by volatile ruby crystals.",["ruby","robot"]),blade:card("Azure Crystal Array","Crystal source","arcane","Channels azure energy.",["azure","crystal"]),ward:card("Ruby Crystal Reactor","Crystal source","crimson","Channels ruby energy.",["ruby","crystal"])},
 {sentinel:card("Dumpling Golem","Dish monster · Steamed","gold","A hulking dumpling warrior whose bamboo armor holds in fragrant steam.",["steamed","monster"]),raider:card("Inferno Noodle Hydra","Dish monster · Spicy","crimson","Each severed noodle head grows back coated in hotter chili oil.",["spicy","monster"]),blade:card("Master Stock","Ingredient","verdant","A concentrated broth from the Taste Dimension.",["ingredient"]),ward:card("Emergency Mise en Place","Kitchen technique","neutral","A chef's practiced response to a culinary catastrophe.",["technique"])},
 {sentinel:card("The Meteor Mask","Wrestler · Hero","gold","A fearless high-flyer who landed in Ringworld after a freak tournament accident.",["hero","wrestler"]),raider:card("Baron Backbreaker","Wrestler · Heel","crimson","A theatrical villain who treats every match like the final battle of an anime saga.",["heel","wrestler"]),blade:card("Second Wind","Momentum","verdant","The crowd roars as a fallen wrestler rises again.",["momentum"]),ward:card("Last-Second Kickout","Counter","steel","A desperate escape from a seemingly inevitable defeat.",["counter"])},
 {sentinel:card("The Mortgage Paladin","Boomer champion","gold","Wields the legendary deed to a three-bedroom house purchased for a handshake and a nickel.",["boomer","champion"]),raider:card("The Latchkey Ronin","Gen X champion","steel","Armed with a mixtape, a house key and the uncanny ability to disappear from demographic discourse.",["genx","champion"]),blade:card("Compound Interest","Cultural resource","gold","The power of getting in early.",["boomer","resource"]),ward:card("Whatever","Cultural resource","neutral","A devastating display of cultivated indifference.",["genx","resource"])}
];
function expand(m,i){
 if(i===0){for(const [p,b,e,n,frame] of [["a","sentinel","puffbloom","Puffbloom","verdant"],["b","raider","zibbolt","Zibbolt","gold"]]){m.definitions.push(e);m.setup[p==="a"?4:5].definition=e;m.stackRules.find(r=>r.id==="evolve-"+p).materialDefinition=e;m.combat.stats[e]={attack:4,health:8};for(const k of ["attackerDefinitions","defenderDefinitions"])m.combat[k].push(e);m.attachment.hostDefinitions.push(e);m.combat.attachedCosts[e]={[p==="a"?"blade":"ward"]:1};m.cardPresentation[e]=card(n,"Looboo creature · Stage 1",frame,"Evolved from "+(p==="a"?"Pufflump":"Zibbler")+".",["stage1"])}}
 if(i===1){for(const color of ["azure","ruby","jade","ivory","obsidian"])m.resources.push({id:color,scope:"player",initial:0,max:20,refresh:0});m.generators[0].resource="azure";m.generators[1].resource="ruby";m.effects.deploya.costs[0].resource="azure";m.effects.deployb.costs[0].resource="ruby";for(const [color,name,frame] of [["jade","Jade Growth Matrix","verdant"],["ivory","Ivory Relay","gold"],["obsidian","Obsidian Reclaimer","neutral"]]){const d=color+"-source";m.definitions.push(d);m.cardPresentation[d]=card(name,"Crystal source",frame,"Channels "+color+" energy.",[color,"crystal"]);m.generators.push({id:color+"-channel",definition:d,zones:["field"],resource:color,amount:1});m.setup.push({definition:d,owner:color==="ivory"?"b":"a",zone:"field"});m.combat.stats[d]={attack:0,health:1}}}
 if(i===2){m.definitions.push("broth-titan");m.cardPresentation["broth-titan"]=card("Imperial Broth Titan","Dish monster · Fusion","gold","A towering creation of concentrated stock and steamed dough.",["fusion","monster"]);m.combat.stats["broth-titan"]={attack:6,health:7};m.setup.push({definition:"broth-titan",owner:"a",zone:"reserve-a",face:"up"});m.effects.fusion={available:true,actors:["a"],cardCosts:[{kind:"sacrifice",from:"field",to:"discard-a",count:2}],program:[{type:"move",id:"c7",from:"reserve-a",to:"field"}]};m.chain.speedByEffect.fusion=1}
 if(i===3){m.resources.push({id:"momentum",scope:"player",initial:1,max:10,refresh:2,refreshMode:"add"});for(const p of m.players)m.effects["deploy"+p].costs[0].resource="momentum"}
 if(i===4){m.resources.push({id:"rune",scope:"player",initial:2,max:10,refresh:2,refreshMode:"add"});m.spatial.resource="rune";for(const p of m.players)m.effects["deploy"+p].costs[0].resource="rune"}
 if(i===0){for(const p of m.players){const d=p==="a"?"sentinel":"raider";m.zones.push({id:"bench-"+p,owner:p,visibility:"public",capacity:5});m.setup.push({definition:d,owner:p,zone:"bench-"+p});m.effects["retreat"+p]={available:true,actors:[p],sourceDefinition:d,sourceZones:["active-"+p],costs:[{kind:"spend",resource:"energy",amount:1}],dynamicPayment:{targets:[{name:"replacement",selector:{zones:["bench-"+p],controller:"self",face:"up",definition:d}}]},program:[{type:"target",name:"replacement",selector:{zones:["bench-"+p],controller:"self",face:"up",definition:d}},{type:"move",choice:"source",from:"active-"+p,to:"bench-"+p},{type:"move",choice:"replacement",from:"bench-"+p,to:"active-"+p}]}}}
 if(i===1){m.effects.bolt.costs=[{kind:"spend",resource:"azure",amount:1},{kind:"spend",resource:"ruby",amount:1}];m.effects.bolt.program=[{type:"resource",resource:"life",delta:2,overflow:"clamp"}]}
 if(i===2){m.attributes={...(m.attributes??{}),sentinel:{level:4,material:"dish"},raider:{level:4,material:"dish"},blade:{level:2,material:"ingredient"},ward:{level:2,material:"ingredient"},"broth-titan":{level:6,material:"fusion"}};m.effects.fusion.requiresCard={id:"c7",zone:"reserve-a"};m.effects.fusion.cardCosts=["sentinel","blade"].map(definition=>({kind:"sacrifice",from:"field",to:"discard-a",count:1,definition}));m.effects.fusion.alternatives=[{id:"level-six",cardCosts:[{kind:"sacrifice",from:"field",to:"discard-a",count:2,totalLevel:6}]}]}
 if(i===3||i===4){const resource=i===3?"momentum":"rune";for(const p of m.players){const d=resource+"-card";if(!m.definitions.includes(d)){m.definitions.push(d);m.cardPresentation[d]=card(i===3?"Crowd Momentum":"Cultural Rune","Resource","arcane","Channel one "+resource+".",[resource])}m.zones.push({id:resource+"-deck-"+p,owner:p,visibility:"hidden",capacity:8},{id:resource+"-pool-"+p,owner:p,visibility:"public",capacity:8});for(let j=0;j<3;j++)m.setup.push({definition:d,owner:p,zone:resource+"-deck-"+p,face:"down"});m.setup.push({definition:d,owner:p,zone:resource+"-pool-"+p});m.resourceDrawPolicies??=[];m.resourceDrawPolicies.push({player:p,deck:resource+"-deck-"+p,pool:resource+"-pool-"+p,perTurn:1});m.generators??=[];m.generators.push({id:resource+"-"+p,definition:d,zones:[resource+"-pool-"+p],resource,amount:1})}}
 if(i===4){m.combat.group={maxAttackers:3,sameBattlefield:["ridge","crossing"]};m.spatial.blockRange=0}
 if(i===3){for(const p of m.resourceDrawPolicies)p.returnAssigned="momentum-card";m.attachment={zones:["field",...m.players.map(p=>"momentum-pool-"+p)],definitions:["momentum-card"],hostDefinitions:["sentinel","raider"],onHostMove:"detach",max:5};m.combat.modifiers=[{id:"momentum-bonus",attachmentDefinition:"momentum-card",stat:"attack",op:"add",value:1}]}
 return m;
}

const recruits=[
 [["Mossnook","Spore creature","verdant"],["Voltkit","Spark creature","gold"]],
 [["Jade Surveyor","Bionic scout","verdant"],["Obsidian Marauder","Bionic assault unit","neutral"]],
 [["Tempura Knight","Dish monster","gold"],["Pepper Kraken","Dish monster","crimson"]],
 [["Comet Kid","Wrestler · Hero","steel"],["The Iron Heel","Wrestler · Heel","crimson"]],
 [["The Pension Oracle","Boomer champion","gold"],["The Mixtape Mystic","Gen X champion","steel"]]
];
function buildDecks(m,i){
 for(const [j,p] of m.players.entries()){
  const base=j===0?"sentinel":"raider",support=j===0?"blade":"ward",id="recruit-"+p;
  const [name,type,frame]=recruits[i][j];m.definitions.push(id);m.cardPresentation[id]=card(name,type,frame,"A recruit ready to join the contest.",["recruit"]);m.combat.stats[id]={attack:2+j,health:4};
  const deck="deck-"+p,hand="hand-"+p,discard="discard-"+p;
  m.zones.find(z=>z.id===discard).capacity=80;m.zones.find(z=>z.id===hand).capacity=12;
  m.zones.push({id:deck,owner:p,visibility:"hidden",capacity:80});
  const cards=i===0?[base,id,support,j===0?"puffbloom":"zibbolt"]:[base,id,support];
  for(let k=0;k<[60,60,40,50,40][i];k++)m.setup.push({definition:cards[k%cards.length],owner:p,zone:deck,face:"down"});
  m.drawPolicies??=[];m.drawPolicies.push({player:p,deck,hand,opening:[6,6,4,4,3][i],perTurn:1,shuffle:true,exhaustion:"lose"});
  const destination=i===0?"bench-"+p:"field",resource=i===1?(j===0?"azure":"ruby"):i===3?"momentum":i===4?"rune":"energy";
  for(const d of [id,...(i===0?[base]:[])])m.effects["recruit-"+d+"-"+p]={available:true,actors:[p],sourceDefinition:d,sourceZones:[hand],costs:[{kind:"spend",resource,amount:1}],program:[{type:"move",choice:"source",from:hand,to:destination}]};
  if(i===0){m.combat.attackerDefinitions.push(id);m.combat.defenderDefinitions.push(id);m.attachment.hostDefinitions.push(id);m.combat.attachedCosts[id]={[support]:1};m.attachment.zones.push(hand,"bench-"+p);m.effects["retreat"+p].dynamicPayment.targets[0].selector={zones:["bench-"+p],controller:"self",face:"up"};m.effects["retreat"+p].program[0].selector={zones:["bench-"+p],controller:"self",face:"up"}}
  if(i===1){m.effects["channel-"+p]={available:true,actors:[p],sourceDefinition:support,sourceZones:[hand],program:[{type:"move",choice:"source",from:hand,to:"field"}]}}
  if(i===2){m.chain.speedByEffect["recruit-"+id+"-"+p]=1}
  if(i===3)m.attachment.hostDefinitions.push(id);
 }
 m.deckRoles=[{id:"main",zones:m.players.map(p=>"deck-"+p),required:true,rules:{min:[60,60,40,50,40][i],max:[60,60,40,50,40][i],copies:20}}];
 const labels=[["Active creature","Bench","Nutrients"],["Combat field","Reserve","Crystals"],["Monster field","Extra deck","Ingredients"],["Wrestling ring","Life","Momentum"],["Home base","Battlefield","Runes"]][i];
 m.battlefield={columns:2,zones:m.zones.map(z=>({zone:z.id,label:z.id.startsWith("active-")?labels[0]+" "+z.owner:z.id.startsWith("bench-")?labels[1]+" "+z.owner:z.id==="field"?labels[0]:z.id.startsWith("reserve-")?labels[1]+" "+z.owner:z.id.startsWith("life-")?"Life "+z.owner:z.id.startsWith("deck-")?"Draw deck "+z.owner:z.id.startsWith("hand-")?"Hand "+z.owner:z.id.startsWith("discard-")?"Discard "+z.owner:z.id.replaceAll("-"," "),display:z.visibility==="hidden"||z.id.startsWith("discard-")?"count":"cards",span:z.id==="field"||z.id.startsWith("hand-")?2:1}))};
 return m;
}


const tactics=[
 [["Spore Nursery","Nutrient search"],["Static Nest","Nutrient search"]],
 [["Emergency Reboot","Crystal technique"],["Thermal Overclock","Crystal technique"]],
 [["Steam Basket Offering","Tribute technique"],["Chili Cauldron Offering","Tribute technique"]],
 [["Crowd Favorite","Ring action"],["Heel's Encore","Ring action"]],
 [["Neighborhood Coalition","Cultural action"],["Mixtape Revival","Cultural action"]]
];
function addTactics(m,i){
 for(const [j,p] of m.players.entries()){
 const id="tactic-"+p,hand="hand-"+p,deck="deck-"+p,discard="discard-"+p,base=j===0?"sentinel":"raider",support=j===0?"blade":"ward";
 const [name,type]=tactics[i][j];m.definitions.push(id);
 const resource=i===1?(j===0?"azure":"ruby"):i===3?"momentum":i===4?"rune":"energy";
 const program=[{type:"move",choice:"source",from:hand,to:discard}];
 const e={available:true,actors:[p],sourceDefinition:id,sourceZones:[hand],costs:[{kind:"spend",resource,amount:1}],program};
 let description;
 if(i===0){program.push({type:"draw",from:deck,to:hand,count:2});description="Spend 1 energy. Discard this card and draw two cards."}
 if(i===1){program.push({type:"resource",resource:"life",delta:2,overflow:"clamp"});description="Spend 1 "+resource+". Restore 2 life."}
 if(i===2){e.cardCosts=[{kind:"sacrifice",from:"field",to:discard,count:1,definition:support}];program.push({type:"target",name:"dish",selector:{zones:[hand],controller:"self",definition:base,face:"up"}},{type:"move",choice:"dish",from:hand,to:"field"});m.chain.speedByEffect[id]=1;description="Sacrifice your ingredient to summon a dish from hand."}
 if(i===3){program.push({type:"resource",resource:"momentum",delta:3,overflow:"clamp"});description="Spend 1 momentum. Gain 3 momentum."}
 if(i===4){program.push({type:"skipUnless",selector:{zones:["ridge","crossing"],controller:"self",definition:base},minimum:1,skip:1},{type:"awardScore",player:"self",amount:1});description="Spend 1 rune. Score 1 if your champion occupies a battlefield."}
 m.effects[id]=e;m.cardPresentation[id]=card(name,type,j===0?"arcane":"crimson",description,["tactic",resource]);
 const pile=m.setup.filter(c=>c.zone===deck);for(let k=0;k<Math.min(4,pile.length);k++)pile[pile.length-1-k].definition=id;
 }
 return m;
}

function advanced(m,i){
 for(const [j,p] of m.players.entries()){
 const enemy=m.players[1-j],base=j===0?"sentinel":"raider",support=j===0?"blade":"ward",hand="hand-"+p,deck="deck-"+p,discard="discard-"+p;
 if(i===0){m.combat.attackProfiles??={};m.combat.attackProfiles[base]=[{id:"quick-strike",damage:m.combat.stats[base].attack,attachedCosts:{[support]:1}},{id:"charged-strike",damage:5,attachedCosts:{[support]:2}}];const prize="prize-"+p;m.replacementPolicies??=[];m.replacementPolicies.push({player:p,active:"active-"+p,reserve:"bench-"+p,choose:true,definitions:[base,"recruit-"+p,j===0?"puffbloom":"zibbolt"]});m.victory.push({type:"emptyZone",player:enemy,zone:prize});m.zones.push({id:prize,owner:p,visibility:"hidden",capacity:6});for(let k=0;k<6;k++)m.setup.push({definition:support,owner:p,zone:prize,face:"down"});m.effects["prize-"+p]={program:[{type:"draw",from:prize,to:hand,count:1}]};m.triggers.push({id:"prize-"+p,actor:p,event:"combatDefeat",where:{owner:enemy,from:"active-"+enemy},effect:"prize-"+p});}
 if(i===1){m.combat.modifiers??=[];m.combat.modifiers.push({id:"crystal-aura-"+p,auraDefinition:support,auraZones:["field"],auraController:"self",stat:"attack",op:"add",value:1});m.effects["tactic-"+p].alternatives=[{id:"mixed-crystals",costs:[{kind:"spend",resource:"jade",amount:1},{kind:"spend",resource:"ivory",amount:1}]}];}
 if(i===2){const id="banquet-"+p;m.definitions.push(id);m.cardPresentation[id]=card(j===0?"Grand Banquet Colossus":"Volcanic Feast Dragon","Dish monster · Tribute","gold","Sacrifice a dish to summon this monster.",["monster","tribute"]);m.combat.stats[id]={attack:5,health:6};m.effects[id]={available:true,actors:[p],sourceDefinition:id,sourceZones:[hand],cardCosts:[{kind:"sacrifice",from:"field",to:discard,count:1,definition:base}],program:[{type:"move",choice:"source",from:hand,to:"field"}]};m.chain.speedByEffect[id]=1;const pile=m.setup.filter(c=>c.zone===deck&&c.definition===base);for(const c of pile.slice(0,3))c.definition=id;}
 if(i===3){m.combat.group.lifeCards[p].triggers={[support]:"life-trigger-"+p};m.effects["life-trigger-"+p]={sourceDefinition:support,sourceZones:[hand],program:[{type:"move",choice:"source",from:hand,to:discard},{type:"resource",resource:"momentum",delta:2,overflow:"clamp"}]};m.combat.group.unitDefinitions=["sentinel","raider","recruit-a","recruit-b"];m.effects["encore-"+p]={program:[{type:"resource",resource:"momentum",delta:1,overflow:"clamp"}]};m.triggers.push({id:"encore-"+p,actor:p,event:"combatDefeat",where:{owner:enemy},effect:"encore-"+p});}
 if(i===4){m.combat.group.twoSidedReactions=true;m.combat.group.unitDefinitions=["sentinel","raider","recruit-a","recruit-b"];m.combat.group.reactions??=[];m.combat.group.reactions.push({id:"showdown-"+p,definition:"tactic-"+p,zones:[hand],destination:discard,amount:1});m.effects["showdown-"+p]={available:true,actors:[p],sourceDefinition:base,sourceZones:["ridge","crossing"],costs:[{kind:"spend",resource:"rune",amount:1}],program:[{type:"orient",choice:"source",orientation:"ready"}]};}
 }
 for(const [id,c] of Object.entries(m.cardPresentation)){if(c.tags.includes("spore"))c.symbol="✿";else if(c.tags.includes("spark"))c.symbol="ϟ";else if(c.tags.includes("momentum"))c.symbol="★";else if(c.tags.includes("rune"))c.symbol="◇";}
 return m;
}
function scaleDeployment(m){
 for(const p of m.players){
  const hand="hand-"+p,deck="deck-"+p,scales=["scale-low-"+p,"scale-high-"+p];
  for(const [i,z] of scales.entries()){
   const id=z;
   m.zones.push({id:z,owner:p,visibility:"public",capacity:1});
   m.battlefield.zones.push({zone:z,label:(i?"High":"Low")+" scale "+p,display:"cards",span:1});
   m.definitions.push(id);m.attributes[id]={scale:i?8:1,level:3};
   m.cardPresentation[id]=card(i?"Blazing Wok":"Frosted Ladle","Dish monster · Scale "+(i?8:1),"arcane","Place in its scale zone to enable scale deployment.",["monster","scale"]);
   m.combat.stats[id]={attack:2,health:3};
   const pile=m.setup.filter(c=>c.zone===deck);
   for(const c of pile.slice(4+i*2,6+i*2))c.definition=id;
   m.effects[id]={available:true,actors:[p],sourceDefinition:id,sourceZones:[hand],program:[{type:"move",choice:"source",from:hand,to:z}]};
   m.chain.speedByEffect[id]=1;
  }
  const extra="scale-reserve-"+p;
  m.zones.push({id:extra,owner:p,visibility:"public",capacity:40});
  m.battlefield.zones.push({zone:extra,label:"Face-up reserve "+p,display:"cards",span:1});
  m.moveReplacements??=[];
  for(const from of ["field",...scales])m.moveReplacements.push({owner:p,from,to:"discard-"+p,destination:extra,definitions:scales});
  m.attributes["recruit-"+p]={level:3};
  const id="scale-deploy-"+p;
  m.effects[id]={available:true,actors:[p],limit:{scope:"turn",count:1},cardCosts:[{kind:"deploy",from:hand,to:"field",count:1,scaleZones:scales}],alternatives:[{id:"two",cardCosts:[{kind:"deploy",from:hand,to:"field",count:2,scaleZones:scales}]}],program:[]};
  m.effects[id].alternatives.push({id:"reserve",cardCosts:[{kind:"deploy",from:extra,to:"field",count:1,scaleZones:scales}]},{id:"mixed",cardCosts:[{kind:"deploy",from:hand,to:"field",count:1,scaleZones:scales},{kind:"deploy",from:extra,to:"field",count:1,scaleZones:scales}]});
  m.chain.speedByEffect[id]=1;
 }
 return m;
}
export function referenceModules(){return [creatures(),spells(),chains(),crews(),domains()].map((m,i)=>{m.cardPresentation=structuredClone(skins[i]);const result=advanced(addTactics(buildDecks(expand(m,i),i),i),i);return i===2?scaleDeployment(result):result})}

