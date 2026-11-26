// Deck lists are authored separately from a deterministic scenario setup.
// Materialization is explicit because scenario effects may reference fixed instance IDs.
export function validateDeck(module,deck){
 const errors=[],rules=module.deckRules??{},cards=deck?.cards;
 if(!deck||typeof deck.name!=="string"||!deck.name.trim())errors.push("Deck needs a name");
 if(!module.players.includes(deck?.player))errors.push("Unknown player");
 const zone=module.zones.find(z=>z.id===deck?.zone);
 if(!zone||zone.owner!==deck.player)errors.push("Choose a zone owned by the deck player");
 if(!Array.isArray(cards))return [...errors,"Invalid card list"];
 for(const k of ["min","max","copies"])if(rules[k]!==undefined&&(!Number.isSafeInteger(rules[k])||rules[k]<0||rules[k]>1000))errors.push("Invalid deck rule "+k);
 const min=rules.min??1,max=rules.max??100,copies=rules.copies??4;
 if(min>max)errors.push("Minimum exceeds maximum");
 let total=0;const seen=new Set();
 for(const row of cards){
  if(!row||!module.definitions.includes(row.definition)||seen.has(row.definition)||!Number.isSafeInteger(row.count)||row.count<1||row.count>copies){errors.push("Invalid card count or definition");continue}
  seen.add(row.definition);total+=row.count;
 }
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
