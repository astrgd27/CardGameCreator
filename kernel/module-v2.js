import {validateExpression} from "./expressions.js";
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
  if(e.sourceDefinition!==undefined)require(defs.includes(e.sourceDefinition)&&Array.isArray(e.sourceZones)&&e.sourceZones.length>0&&e.sourceZones.every(z=>zids.has(z)),"effect: invalid source definition "+id);
  if(e.limit!==undefined)require(record(e.limit)&&["turn","match"].includes(e.limit.scope)&&integer(e.limit.count)&&e.limit.count>=1&&e.limit.count<=100,"effect: invalid usage limit "+id);
  const validateCardCosts=costs=>{let total=0;for(const c of list(costs??[],"card costs "+id,10)){require(record(c)&&["discard","sacrifice"].includes(c.kind)&&zids.has(c.from)&&zids.has(c.to)&&c.from!==c.to&&integer(c.count)&&c.count>=1&&c.count<=10,"effect: invalid card cost "+id);total+=c?.count??0}require(total<=20,"effect: payment card limit "+id)};
  validateCardCosts(e.cardCosts);
  const planIds=new Set(["default"]);
  for(const p of list(e.alternatives??[],"alternative costs "+id,10)){
   if(!record(p)){errors.push("Invalid payment plan");continue}
   require(key(p.id)&&!planIds.has(p.id),"effect: invalid payment plan "+id);planIds.add(p.id);
   for(const c of list(p.costs??[],"alternative resource costs "+id))require(record(c)&&resources.has(c.resource)&&integer(c.amount)&&["spend","threshold"].includes(c.kind),"effect: invalid alternative cost "+id);
   validateCardCosts(p.cardCosts);
  }
  const choices=new Set([...(e.sourceDefinition?["source"]:[]),...(m.triggers??[]).filter(t=>t.effect===id).flatMap(t=>Object.keys(t.bindings??{}))]);
  if(e.dynamicPayment!==undefined){
   const d=e.dynamicPayment;require(record(d),"dynamic payment: expected object");
   if(record(d)){
    choices.add("mode");choices.add("x");
    if(d.modes!==undefined)require(Array.isArray(d.modes)&&d.modes.length>0&&d.modes.length<=20&&d.modes.every(key)&&new Set(d.modes).size===d.modes.length,"dynamic modes");
    if(d.variable!==undefined)require(record(d.variable)&&resources.has(d.variable.resource)&&integer(d.variable.min)&&integer(d.variable.max)&&d.variable.min<=d.variable.max&&d.variable.max<=100,"variable payment");
    for(const h of list(d.hybrid??[],"hybrid costs",20))require(record(h)&&Array.isArray(h.resources)&&h.resources.length>=2&&h.resources.length<=10&&h.resources.every(r=>resources.has(r))&&integer(h.amount)&&h.amount<=100,"hybrid cost");
    for(const t of list(d.targets??[],"precommit targets",10)){
     require(record(t)&&key(t.name)&&!choices.has(t.name)&&record(t.selector),"precommit target");if(record(t))choices.add(t.name);
    }
    for(const mod of list(d.modifiers??[],"cost modifiers",20))require(record(mod)&&defs.includes(mod.definition)&&Array.isArray(mod.zones)&&mod.zones.every(z=>zids.has(z))&&resources.has(mod.resource)&&Number.isSafeInteger(mod.delta)&&Math.abs(mod.delta)<=100,"cost modifier");
   }
  }
  for(const op of list(e.program,"program "+id,64)){
   if(!record(op)){errors.push("effect: invalid operation "+id);continue}
   if(["skipUnlessExpr","eachCounter","resourceExpr"].includes(op.type)){try{validateExpression(op.expression)}catch(e){errors.push(e.message)}require(op.type==="skipUnlessExpr"?integer(op.skip)&&op.skip>=1&&op.skip<=64:op.type==="eachCounter"?record(op.selector)&&key(op.counter):resources.has(op.resource),"invalid expression operation")}
   else if(op.type==="scheduleTurn")require(["extra","skip"].includes(op.kind)&&(op.player==="self"||players.includes(op.player))&&integer(op.count)&&op.count>=1&&op.count<=10,"invalid scheduled turn");
   else if(["search","randomHidden"].includes(op.type)){require(key(op.name)&&!choices.has(op.name)&&zids.has(op.zone)&&(op.top===undefined||integer(op.top)&&op.top>=1&&op.top<=100)&&(op.definition===undefined||defs.includes(op.definition)),"invalid hidden selection");choices.add(op.name)}
   else if(op.type==="optional"){require(key(op.name)&&!choices.has(op.name)&&integer(op.skip)&&op.skip>=1&&op.skip<=64,"invalid optional choice");choices.add(op.name)}
   else if(op.type==="reveal")require(choices.has(op.choice)&&["self","all"].includes(op.audience),"invalid reveal");
   else if(op.type==="reorder")require(choices.has(op.choice)&&zids.has(op.zone)&&["top","bottom"].includes(op.position),"invalid reorder");
   else if(op.type==="lifeDamage")require((op.player==="self"||players.includes(op.player))&&zids.has(op.zone)&&zids.has(op.destination)&&op.zone!==op.destination&&integer(op.count)&&op.count<=100&&(op.emptyLoss===undefined||typeof op.emptyLoss==="boolean"),"invalid life damage");
   else if(op.type==="choose"){require(key(op.name)&&!choices.has(op.name)&&Array.isArray(op.options)&&op.options.length>0&&op.options.length<=100&&op.options.every(key)&&new Set(op.options).size===op.options.length,"effect: invalid choice "+id);choices.add(op.name)}
   else if(op.type==="skipUnlessResource")require(resources.has(op.resource)&&["atLeast","atMost","equal"].includes(op.comparison)&&integer(op.amount)&&integer(op.skip)&&op.skip>=1&&op.skip<=64,"effect: invalid resource condition "+id);
   else if(op.type==="skipUnlessChoice")require(choices.has(op.choice)&&key(op.value)&&integer(op.skip)&&op.skip>=1&&op.skip<=64,"effect: invalid choice condition "+id);
   else if(op.type==="skipUnless"){require(record(op.selector)&&integer(op.minimum)&&op.minimum<=100&&integer(op.skip)&&op.skip>=1&&op.skip<=64,"effect: invalid condition "+id)}
   else if(op.type==="target"){const q=op.selector;require(key(op.name)&&!choices.has(op.name)&&record(q)&&Object.keys(q).every(k=>["zones","owner","controller","face","orientation","definition","limit","keyword","targetable","near","range"].includes(k))&&(!q.zones||(Array.isArray(q.zones)&&q.zones.every(z=>zids.has(z))))&&["owner","controller"].every(k=>q[k]===undefined||["self","opponent","any"].includes(q[k]))&&(q.definition===undefined||defs.includes(q.definition))&&(q.face===undefined||["up","down"].includes(q.face))&&(q.orientation===undefined||["ready","resting","tapped"].includes(q.orientation))&&(q.limit===undefined||(integer(q.limit)&&q.limit<=100)),"effect: invalid selector "+id);choices.add(op.name)}
   else if(op.type==="token")require(defs.includes(op.definition)&&zids.has(op.zone)&&integer(op.count)&&op.count>=1&&op.count<=20&&["up","down"].includes(op.face??"up"),"effect: invalid token "+id);
   else if(["counter","status","transform","flip","control","orient"].includes(op.type)){
    require((key(op.id)&&op.choice===undefined)||(op.id===undefined&&choices.has(op.choice)),"effect: invalid state target "+id);
    const ok=op.type==="counter"?key(op.counter)&&Number.isSafeInteger(op.delta)&&Math.abs(op.delta)<=10000:op.type==="status"?key(op.status)&&["add","remove"].includes(op.operation)&&(op.duration===undefined||(integer(op.duration)&&op.duration<=100)):op.type==="transform"?defs.includes(op.definition):op.type==="flip"?["up","down","toggle"].includes(op.face):op.type==="control"?op.player==="self"||players.includes(op.player):["ready","resting","tapped"].includes(op.orientation);
    require(ok,"effect: invalid state operation "+id);
   }
   else if(op.type==="draw")require(zids.has(op.from)&&zids.has(op.to)&&op.from!==op.to&&integer(op.count)&&op.count<=100,"effect: invalid draw "+id);
   else if(op.type==="move")require(zids.has(op.from)&&zids.has(op.to)&&((key(op.id)&&op.choice===undefined)||(op.id===undefined&&choices.has(op.choice))),"effect: invalid move "+id);
   else if(op.type==="resource")require(resources.has(op.resource)&&Number.isSafeInteger(op.delta)&&(op.overflow===undefined||["reject","clamp"].includes(op.overflow)),"effect: invalid resource operation "+id);
   else errors.push("effect: unsupported operation "+id);
  }
 }
 if(m.phases!==undefined){
  const phases=list(m.phases,"phases",20),ids=new Set();
  require(phases.length>0,"phases: empty");
  for(const p of phases){require(record(p)&&key(p.id)&&!ids.has(p.id)&&Array.isArray(p.actions)&&p.actions.every(a=>["activate","attack","attach","move"].includes(a)),"phase: invalid");if(record(p))ids.add(p.id)}
  for(const e of Object.values(effects))if(e?.phases!==undefined)require(Array.isArray(e.phases)&&e.phases.every(id=>ids.has(id)),"effect: invalid phase restriction");
 }
 if(m.triggerOrder!==undefined)require(["fixed","player","owner"].includes(m.triggerOrder),"invalid trigger ordering");
 const generatorIds=new Set();for(const g of list(m.generators??[],"generators",100)){require(record(g)&&key(g.id)&&!generatorIds.has(g.id)&&defs.includes(g.definition)&&Array.isArray(g.zones)&&g.zones.length>0&&g.zones.every(z=>zids.has(z))&&resources.has(g.resource)&&integer(g.amount)&&g.amount>=1&&g.amount<=100,"invalid resource generator");if(record(g))generatorIds.add(g.id)}
 const triggers=new Set();
 for(const t of list(m.triggers??[],"triggers")){
  require(record(t)&&key(t.id)&&!triggers.has(t.id)&&key(t.event)&&Object.hasOwn(effects,t.effect)&&players.includes(t.actor),"trigger: invalid reference");
  if(record(t))triggers.add(t.id);
 }
 for(const [label,config] of [["combat",m.combat],["attachment",m.attachment]])if(config!==undefined)require(record(config)&&Array.isArray(config.zones)&&config.zones.length>0&&config.zones.every(z=>zids.has(z)),label+": invalid zones");
 if(record(m.combat)){
  require(record(m.combat.stats)&&Object.entries(m.combat.stats).every(([d,s])=>defs.includes(d)&&record(s)&&integer(s.attack)&&integer(s.health)&&s.health>0),"combat: invalid stats");
  if(m.combat.group!==undefined){const g=m.combat.group;require(record(g)&&players.length===2&&integer(g.maxAttackers??10)&&(g.maxAttackers??10)>=1&&(g.maxAttackers??10)<=10&&["lethal","even","manual"].includes(g.assignment??"lethal")&&(g.guardStatus===undefined||key(g.guardStatus))&&(g.readyBlockers===undefined||typeof g.readyBlockers==="boolean")&&(g.lifeResource===undefined||(m.resources??[]).some(r=>r.id===g.lifeResource&&r.scope==="player")),"combat: invalid group policy")}
  require(record(m.combat.defeatZones)&&players.every(p=>zids.has(m.combat.defeatZones[p])),"combat: invalid defeat zones");
 }
 if(record(m.attachment))require(Array.isArray(m.attachment.definitions)&&m.attachment.definitions.every(d=>defs.includes(d))&&["detach","follow","reject"].includes(m.attachment.onHostMove??"detach")&&integer(m.attachment.max??1),"attachment: invalid configuration");
 const drawPlayers=new Set();
 for(const p of list(m.drawPolicies??[],"drawPolicies",8)){
  const deck=zones.find(z=>z?.id===p?.deck),hand=zones.find(z=>z?.id===p?.hand);
  require(record(p)&&players.includes(p.player)&&!drawPlayers.has(p.player)&&deck?.owner===p.player&&hand?.owner===p.player&&deck?.visibility==="hidden"&&hand?.visibility==="owner"&&p.deck!==p.hand&&integer(p.opening??0)&&(p.opening??0)<=100&&integer(p.perTurn??0)&&(p.perTurn??0)<=100&&(p.shuffle===undefined||typeof p.shuffle==="boolean")&&integer(p.mulligans??0)&&(p.mulligans??0)<=10&&integer(p.mulliganPenalty??0)&&(p.mulliganPenalty??0)<=100&&(p.exhaustion===undefined||["ignore","lose"].includes(p.exhaustion)),"drawPolicies: invalid configuration");
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
 if(m.tokenPolicy!==undefined)require(record(m.tokenPolicy)&&Array.isArray(m.tokenPolicy.zones)&&m.tokenPolicy.zones.every(z=>zids.has(z)),"tokenPolicy: invalid cleanup zones");
 if(m.ai!==undefined)require(record(m.ai)&&(m.ai.difficulty===undefined||["easy","normal","hard"].includes(m.ai.difficulty))&&(m.ai.personality===undefined||["balanced","aggressive","defensive","economic"].includes(m.ai.personality))&&(m.ai.weights===undefined||(record(m.ai.weights)&&Object.entries(m.ai.weights).every(([k,n])=>["board","life","resource","hand","pressure"].includes(k)&&Number.isFinite(n)&&n>=0&&n<=5))),"AI: invalid configuration");
 if(m.keywordRules!==undefined){
  const k=m.keywordRules;require(record(k),"keywordRules: expected object");
  if(record(k)){
   require(record(k.keywords??{})&&Object.entries(k.keywords??{}).every(([id,r])=>key(id)&&record(r)&&Array.isArray(r.restrictions)&&r.restrictions.every(x=>["cannotAttack","cannotBlock","cannotBeAttacked","cannotActivate","untargetable","damageImmune"].includes(x))),"keywordRules: invalid keywords");
   require(record(k.definitions??{})&&Object.entries(k.definitions??{}).every(([id,t])=>defs.includes(id)&&Array.isArray(t)&&t.every(x=>Object.hasOwn(k.keywords??{},x))),"keywordRules: invalid definition tags");
   for(const p of list(k.passives??[],"passives",100))require(record(p)&&defs.includes(p.sourceDefinition)&&Array.isArray(p.sourceZones)&&p.sourceZones.every(z=>zids.has(z))&&Array.isArray(p.targetZones)&&p.targetZones.every(z=>zids.has(z))&&["self","friendly","enemy","all"].includes(p.relation)&&["attack","health"].includes(p.stat)&&["set","add","multiply"].includes(p.op)&&Number.isSafeInteger(p.value)&&(p.targetDefinition===undefined||defs.includes(p.targetDefinition))&&(p.targetKeyword===undefined||key(p.targetKeyword))&&(p.requiresStatus===undefined||key(p.requiresStatus))&&(p.minimumTurn===undefined||integer(p.minimumTurn))&&(p.minimumCounter===undefined||(record(p.minimumCounter)&&key(p.minimumCounter.name)&&integer(p.minimumCounter.amount))),"passives: invalid rule");
  }
 }
 if(m.deckRules!==undefined){const d=m.deckRules;require(record(d),"deckRules: invalid");if(record(d)){
  for(const k of ["min","max","copies","maxPoints"])if(d[k]!==undefined)require(integer(d[k])&&d[k]<=1000,"deckRules: "+k);
  for(const k of ["copyLimits","required"])if(d[k]!==undefined)require(record(d[k])&&Object.entries(d[k]).every(([id,n])=>defs.includes(id)&&integer(n)&&n<=1000),"deckRules: "+k);
  if(d.banned!==undefined)require(Array.isArray(d.banned)&&d.banned.every(id=>defs.includes(id)),"deckRules: banned");
  if(d.allowedTags!==undefined)require(Array.isArray(d.allowedTags)&&d.allowedTags.every(key),"deckRules: allowedTags");
  for(const q of list(d.quotas??[],"deck quotas",100))require(record(q)&&["type","tag"].includes(q.kind)&&typeof q.value==="string"&&integer(q.min??0)&&integer(q.max??1000)&&(q.min??0)<=(q.max??1000),"deckRules: invalid quota");
 }}
 const stackIds=new Set();
 for(const r of list(m.stackRules??[],"stack rules",100)){
  require(record(r)&&key(r.id)&&!stackIds.has(r.id)&&defs.includes(r.hostDefinition)&&defs.includes(r.materialDefinition)&&(r.resultDefinition===undefined||defs.includes(r.resultDefinition))&&Array.isArray(r.hostZones)&&r.hostZones.length>0&&r.hostZones.every(z=>zids.has(z))&&Array.isArray(r.materialZones)&&r.materialZones.length>0&&r.materialZones.every(z=>zids.has(z))&&(r.inherit===undefined||typeof r.inherit==="boolean")&&(r.preserve===undefined||Array.isArray(r.preserve)&&r.preserve.every(x=>["damage","counters","statuses","orientation","controller","attachments"].includes(x))),"stack rule: invalid");if(record(r))stackIds.add(r.id);
 }
 const roleIds=new Set();
 for(const r of list(m.deckRoles??[],"deck roles",20)){
  require(record(r)&&key(r.id)&&!roleIds.has(r.id)&&Array.isArray(r.zones)&&r.zones.length>0&&r.zones.every(z=>zids.has(z))&&["required","providesTags","requiresProvidedTags"].every(k=>r[k]===undefined||typeof r[k]==="boolean")&&(r.rules===undefined||record(r.rules)&&["min","max","copies"].every(k=>r.rules[k]===undefined||integer(r.rules[k])&&r.rules[k]<=1000)),"deck role: invalid");if(record(r))roleIds.add(r.id);
 }
 if(m.linkedDeckRules!==undefined)require(record(m.linkedDeckRules)&&(m.linkedDeckRules.combinedCopies===undefined||integer(m.linkedDeckRules.combinedCopies)&&m.linkedDeckRules.combinedCopies<=1000),"linked deck rules: invalid");
 for(const [player,p] of Object.entries(m.combat?.group?.lifeCards??{}))require(players.includes(player)&&record(p)&&zids.has(p.zone)&&zids.has(p.destination)&&p.zone!==p.destination&&m.zones.find(z=>z.id===p.zone)?.owner===player&&m.zones.find(z=>z.id===p.destination)?.owner===player&&(p.emptyLoss===undefined||typeof p.emptyLoss==="boolean")&&(p.perAttack===undefined||typeof p.perAttack==="boolean"),"invalid combat life card policy");
 if(m.scheduler!==undefined){const p=m.scheduler;require(record(p)&&["round","alternate"].includes(p.mode??"round")&&(p.initiative===undefined||typeof p.initiative==="boolean")&&(p.responseWindow===undefined||key(p.responseWindow)),"invalid scheduler");if(record(p)&&p.gauge!==undefined){const g=p.gauge,r=m.resources?.find(x=>x.id===g?.resource);require(record(g)&&r?.scope==="shared"&&integer(g.threshold)&&g.threshold>0&&g.threshold<=r.max&&integer(g.reset??0)&&(g.reset??0)<g.threshold,"invalid turn gauge")}}
 for(const p of m.phases??[])require((p.window===undefined||key(p.window))&&(p.autoAdvance===undefined||typeof p.autoAdvance==="boolean"),"invalid phase window");
 for(const e of Object.values(effects))if(e.windows!==undefined)require(Array.isArray(e.windows)&&e.windows.length>0&&e.windows.every(key),"invalid effect windows");
 const g=m.combat?.group;
 if(g){require((g.comparison===undefined||["damage","power"].includes(g.comparison))&&(g.overflow===undefined||typeof g.overflow==="boolean")&&(g.intercept===undefined||["all","direct"].includes(g.intercept))&&(g.damageType===undefined||key(g.damageType)),"invalid extended combat policy");
 const ids=new Set();for(const r of list(g.reactions??[],"combat reactions",20)){require(record(r)&&key(r.id)&&!ids.has(r.id)&&defs.includes(r.definition)&&Array.isArray(r.zones)&&r.zones.length>0&&r.zones.every(z=>zids.has(z))&&zids.has(r.destination)&&!r.zones.includes(r.destination)&&integer(r.amount)&&r.amount<=100,"invalid combat reaction");if(record(r))ids.add(r.id)}
 }
 if(m.combat?.damageCleanup!==undefined)require(["turn","persistent"].includes(m.combat.damageCleanup),"invalid damage cleanup");
 const expr=e=>{try{validateExpression(e);return true}catch{return false}};
 if(m.attributes!==undefined)require(record(m.attributes)&&Object.entries(m.attributes).every(([id,a])=>defs.includes(id)&&record(a)&&Object.entries(a).every(([k,v])=>key(k)&&(typeof v==="boolean"||typeof v==="string"&&v.length<=200||Number.isSafeInteger(v)))),"invalid typed attributes");
 for(const r of list(m.permissionRules??[],"permission rules",100))require(record(r)&&["cannotAttack","cannotBlock","cannotBeAttacked","cannotActivate","untargetable","damageImmune"].includes(r.rule)&&expr(r.when),"invalid conditional permission");
 for(const r of [...(m.combat?.modifiers??[]),...(m.keywordRules?.passives??[])])require((r.when===undefined||expr(r.when))&&(r.layer===undefined||integer(r.layer)&&r.layer<=100),"invalid modifier layer or condition");
 for(const r of list(m.eventReplacements??[],"event replacements",100))require(record(r)&&key(r.id)&&r.event==="draw"&&["prevent","reduce","redirect"].includes(r.op)&&(r.from===undefined||zids.has(r.from))&&(r.order===undefined||integer(r.order)&&r.order<=100)&&(r.when===undefined||expr(r.when))&&(r.op!=="reduce"||integer(r.amount)&&r.amount<=100)&&(r.op!=="redirect"||zids.has(r.to)&&r.to!==r.from),"invalid draw replacement");
 if(m.stabilization!==undefined){require(record(m.stabilization),"invalid stabilization");if(record(m.stabilization))for(const r of list(m.stabilization.moves??[],"state moves",100))require(record(r)&&zids.has(r.from)&&zids.has(r.to)&&r.from!==r.to&&expr(r.when),"invalid state-based move")}
 for(const t of m.triggers??[])if(t.bindings!==undefined)require(record(t.bindings)&&Object.entries(t.bindings).every(([k,v])=>key(k)&&key(v)),"invalid trigger bindings");
 if(m.spatial!==undefined){const p=m.spatial;require(record(p),"invalid spatial board");if(record(p)){
 const slots=new Set(),coords=new Set();
 for(const x of list(p.slots,"spatial slots",100)){require(record(x)&&zids.has(x.zone)&&!slots.has(x.zone)&&m.zones.find(z=>z.id===x.zone)?.visibility==="public"&&integer(x.x)&&x.x<=19&&integer(x.y)&&x.y<=19&&!coords.has(x.x+","+x.y)&&["blocked","exclusive","ownerOnly"].every(k=>x[k]===undefined||typeof x[k]==="boolean"),"invalid spatial slot");if(record(x)){slots.add(x.zone);coords.add(x.x+","+x.y)}}
 require((p.grid===undefined||typeof p.grid==="boolean")&&(p.restOnMove===undefined||typeof p.restOnMove==="boolean")&&["maxSteps","attackRange","blockRange","costPerStep"].every(k=>p[k]===undefined||integer(p[k])&&p[k]<=100)&&(p.resource===undefined||resources.has(p.resource)),"invalid spatial movement policy");
 for(const e of list(p.edges??[],"spatial edges",300))require(Array.isArray(e)&&e.length===2&&e[0]!==e[1]&&e.every(z=>slots.has(z)),"invalid spatial edge");
 }}
 return errors;
}
export function assertModuleV2(m){const errors=validateModuleV2(m);if(errors.length)throw Error(errors.join("; "));return m}
