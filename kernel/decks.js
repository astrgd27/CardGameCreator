// Deck lists are authored separately from a deterministic scenario setup.
// Materialization is explicit because scenario effects may reference fixed instance IDs.
export function validateDeck(module,deck){
 const errors=[],role=(module.deckRoles??[]).find(r=>r.id===deck?.role),rules={...(module.deckRules??{}),...(role?.rules??{})},cards=deck?.cards;
 if(!deck||typeof deck.name!=="string"||!deck.name.trim())errors.push("Deck needs a name");
 if(!module.players.includes(deck?.player))errors.push("Unknown player");
 const zone=module.zones.find(z=>z.id===deck?.zone);
 if(!zone||zone.owner!==deck.player)errors.push("Choose a zone owned by the deck player");
 if(module.deckRoles?.length&&(!role||!role.zones.includes(deck?.zone)))errors.push("Invalid deck role or destination");
 if(!Array.isArray(cards))return [...errors,"Invalid card list"];
 for(const k of ["min","max","copies"])if(rules[k]!==undefined&&(!Number.isSafeInteger(rules[k])||rules[k]<0||rules[k]>1000))errors.push("Invalid deck rule "+k);
 const min=rules.min??1,max=rules.max??100,copies=rules.copies??4;
 if(min>max)errors.push("Minimum exceeds maximum");
 let total=0;const seen=new Set();
 for(const row of cards){
  if(!row||!module.definitions.includes(row.definition)||seen.has(row.definition)||!Number.isSafeInteger(row.count)||row.count<1||row.count>(rules.copyLimits?.[row.definition]??copies)){errors.push("Invalid card count or definition");continue}
  seen.add(row.definition);total+=row.count;
 }
 const rows=cards.filter(r=>r&&module.definitions.includes(r.definition)&&Number.isSafeInteger(r.count)&&r.count>0);
 const tags=id=>module.cardPresentation?.[id]?.tags??[];
 for(const r of rows){
  if(rules.banned?.includes(r.definition))errors.push("Banned card "+r.definition);
  if(rules.allowedTags?.length&&!tags(r.definition).some(t=>rules.allowedTags.includes(t)))errors.push("Disallowed card "+r.definition);
 }
 for(const rule of rules.quotas??[]){
  const n=rows.filter(r=>rule.kind==="type"?module.cardPresentation?.[r.definition]?.type===rule.value:tags(r.definition).includes(rule.value)).reduce((sum,r)=>sum+r.count,0);
  if(n<(rule.min??0)||n>(rule.max??1000))errors.push(rule.kind+" "+rule.value+": "+n+" outside required range");
 }
 for(const [id,n] of Object.entries(rules.required??{}))if((rows.find(r=>r.definition===id)?.count??0)<n)errors.push("Required card "+id);
 if(rules.maxPoints!==undefined){const points=rows.reduce((sum,r)=>sum+r.count*(module.cardPresentation?.[r.definition]?.deckPoints??0),0);if(points>rules.maxPoints)errors.push("Deck point budget exceeded: "+points)}
 if(total<min||total>max)errors.push("Deck size "+total+" outside "+min+"–"+max);
 if(zone&&total>zone.capacity)errors.push("Deck exceeds zone capacity");
 return errors;
}
export function appendDeckToSetup(module,deck){
 const errors=validateDeck(module,deck);if(errors.length)throw Error(errors.join("; "));
 const next=structuredClone(module),zone=next.zones.find(z=>z.id===deck.zone);
 next.setup??=[];
 const occupied=next.setup.filter(c=>c.zone===deck.zone).length;
 const total=deck.cards.reduce((n,c)=>n+c.count,0);
 if(occupied+total>zone.capacity||next.setup.length+total>1000)throw Error("Deck exceeds remaining setup capacity");
 for(const row of deck.cards)for(let i=0;i<row.count;i++)next.setup.push({definition:row.definition,owner:deck.player,zone:deck.zone,face:"up"});
 return next;
}

export function validateDeckGroup(module,decks,player){
 const errors=[],roles=module.deckRoles??[],group=decks.filter(d=>d.player===player);
 for(const d of group)errors.push(...validateDeck(module,d));
 for(const r of roles){const n=group.filter(d=>d.role===r.id).length;if(n<(r.required?1:0)||n>1)errors.push("Deck role "+r.id+" requires "+(r.required?"exactly one":"at most one")+" deck")}
 const copies=new Map(),tags=new Set(),zones=new Set();
 for(const d of group){if(zones.has(d.zone))errors.push("Deck destinations overlap");zones.add(d.zone);for(const c of d.cards??[]){copies.set(c.definition,(copies.get(c.definition)??0)+c.count);if((module.deckRoles??[]).find(r=>r.id===d.role)?.providesTags)for(const t of module.cardPresentation?.[c.definition]?.tags??[])tags.add(t)}}
 const limits=module.linkedDeckRules??{};
 if(limits.combinedCopies!==undefined)for(const [id,n] of copies)if(n>limits.combinedCopies)errors.push("Combined copy limit: "+id);
 for(const d of group)if(roles.find(r=>r.id===d.role)?.requiresProvidedTags)for(const c of d.cards??[])if(!(module.cardPresentation?.[c.definition]?.tags??[]).some(t=>tags.has(t)))errors.push("Missing linked tag: "+c.definition);
 return errors;
}
export function appendDeckGroup(module,decks,player){
 const errors=validateDeckGroup(module,decks,player);if(errors.length)throw Error(errors.join("; "));
 return decks.filter(d=>d.player===player).reduce((m,d)=>appendDeckToSetup(m,d),structuredClone(module));
}
