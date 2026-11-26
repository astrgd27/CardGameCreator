// Structural validation for v2 modules. Runtime validates state-dependent legality.
const key=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(x)&&!Object.hasOwn(Object.prototype,x);
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const record=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
export function validateModuleV2(m){
 const errors=[],require=(ok,path)=>{if(!ok)errors.push(path)};
 if(!record(m))return ["module: expected object"];
 require(m.schemaVersion===2,"schemaVersion: expected 2");
 require(typeof m.name==="string"&&m.name.trim().length>0,"name");
 const list=(x,path,max=100)=>{require(Array.isArray(x)&&x.length<=max,path);return Array.isArray(x)?x.slice(0,max):[]};
 const players=list(m.players,"players",8),defs=list(m.definitions,"definitions",1000);
 require(players.length>=2&&players.every(key)&&new Set(players).size===players.length,"players: invalid seats");
 require(defs.length>0&&defs.every(key)&&new Set(defs).size===defs.length,"definitions: invalid IDs");
 const zones=list(m.zones,"zones"),zids=new Set();
 for(const z of zones){
  if(!record(z)){errors.push("zone: expected object");continue}
  require(key(z.id)&&!zids.has(z.id),"zone: duplicate/invalid ID");zids.add(z.id);
  require((z.owner===null||players.includes(z.owner))&&["public","owner","hidden"].includes(z.visibility)&&integer(z.capacity)&&(z.visibility!=="owner"||z.owner!==null),"zone: invalid configuration");
 }
 const counts=new Map();
 for(const c of list(m.setup??[],"setup",1000)){
  if(!record(c)){errors.push("setup: expected card");continue}
  require(defs.includes(c.definition)&&players.includes(c.owner)&&zids.has(c.zone)&&players.includes(c.controller??c.owner)&&["up","down"].includes(c.face??"up"),"setup: invalid card");
  counts.set(c.zone,(counts.get(c.zone)??0)+1);
 }
 for(const z of zones)if(record(z))require((counts.get(z.id)??0)<=z.capacity,"setup: exceeds capacity "+z.id);
 const resources=new Set();
 for(const r of list(m.resources??[],"resources")){
  if(!record(r)){errors.push("resource: expected object");continue}
  require(key(r.id)&&!resources.has(r.id)&&["player","shared"].includes(r.scope)&&integer(r.initial)&&integer(r.max)&&r.initial<=r.max&&integer(r.refresh??0)&&["none","add","set"].includes(r.refreshMode??"none"),"resource: invalid configuration");resources.add(r.id);
 }
 require(record(m.effects),"effects: expected object");
 const effects=record(m.effects)?m.effects:{};
 require(Object.keys(effects).length<=100,"effects: limit exceeded");
 for(const [id,e] of Object.entries(effects)){
  if(!key(id)||!record(e)){errors.push("effect: invalid definition");continue}
  if(e.requiresCard!==undefined)require(record(e.requiresCard)&&key(e.requiresCard.id)&&zids.has(e.requiresCard.zone),"effect: invalid activation source "+id);
  if(e.actors!==undefined)require(Array.isArray(e.actors)&&e.actors.every(p=>players.includes(p)),"effect: invalid actors "+id);
  for(const c of list(e.costs??[],"costs "+id))require(record(c)&&resources.has(c.resource)&&integer(c.amount)&&["spend","threshold"].includes(c.kind),"effect: invalid cost "+id);
  const choices=new Set();
  for(const op of list(e.program,"program "+id,64)){
   if(!record(op)){errors.push("effect: invalid operation "+id);continue}
   if(op.type==="choose"){require(key(op.name)&&!choices.has(op.name)&&Array.isArray(op.options)&&op.options.length>0&&op.options.length<=100&&op.options.every(key)&&new Set(op.options).size===op.options.length,"effect: invalid choice "+id);choices.add(op.name)}
   else if(op.type==="move")require(zids.has(op.from)&&zids.has(op.to)&&((key(op.id)&&op.choice===undefined)||(op.id===undefined&&choices.has(op.choice))),"effect: invalid move "+id);
   else if(op.type==="resource")require(resources.has(op.resource)&&Number.isSafeInteger(op.delta),"effect: invalid resource operation "+id);
   else errors.push("effect: unsupported operation "+id);
  }
 }
 const triggers=new Set();
 for(const t of list(m.triggers??[],"triggers")){
  require(record(t)&&key(t.id)&&!triggers.has(t.id)&&key(t.event)&&Object.hasOwn(effects,t.effect)&&players.includes(t.actor),"trigger: invalid reference");
  if(record(t))triggers.add(t.id);
 }
 for(const [label,config] of [["combat",m.combat],["attachment",m.attachment]])if(config!==undefined)require(record(config)&&Array.isArray(config.zones)&&config.zones.length>0&&config.zones.every(z=>zids.has(z)),label+": invalid zones");
 if(record(m.combat)){
  require(record(m.combat.stats)&&Object.entries(m.combat.stats).every(([d,s])=>defs.includes(d)&&record(s)&&integer(s.attack)&&integer(s.health)&&s.health>0),"combat: invalid stats");
  require(record(m.combat.defeatZones)&&players.every(p=>zids.has(m.combat.defeatZones[p])),"combat: invalid defeat zones");
 }
 if(record(m.attachment))require(Array.isArray(m.attachment.definitions)&&m.attachment.definitions.every(d=>defs.includes(d))&&["detach","follow","reject"].includes(m.attachment.onHostMove??"detach")&&integer(m.attachment.max??1),"attachment: invalid configuration");
 const drawPlayers=new Set();
 for(const p of list(m.drawPolicies??[],"drawPolicies",8)){
  const deck=zones.find(z=>z?.id===p?.deck),hand=zones.find(z=>z?.id===p?.hand);
  require(record(p)&&players.includes(p.player)&&!drawPlayers.has(p.player)&&deck?.owner===p.player&&hand?.owner===p.player&&deck?.visibility==="hidden"&&hand?.visibility==="owner"&&p.deck!==p.hand&&integer(p.opening??0)&&(p.opening??0)<=100&&integer(p.perTurn??0)&&(p.perTurn??0)<=100&&(p.shuffle===undefined||typeof p.shuffle==="boolean")&&integer(p.mulligans??0)&&(p.mulligans??0)<=10&&integer(p.mulliganPenalty??0)&&(p.mulliganPenalty??0)<=100,"drawPolicies: invalid configuration");
  if(record(p))drawPlayers.add(p.player);
 }
 if(m.battlefield!==undefined){
  require(record(m.battlefield)&&[1,2,3].includes(m.battlefield.columns??1),"battlefield: invalid layout");
  const seen=new Set();
  for(const row of list(m.battlefield?.zones??[],"battlefield zones")){
   require(record(row)&&zids.has(row.zone)&&!seen.has(row.zone)&&typeof (row.label??"")==="string"&&["cards","count"].includes(row.display??"cards")&&[1,2,3].includes(row.span??1),"battlefield: invalid zone presentation");
   if(record(row))seen.add(row.zone);
  }
 }
 return errors;
}
export function assertModuleV2(m){const errors=validateModuleV2(m);if(errors.length)throw Error(errors.join("; "));return m}
