// v1 compatibility bridge. The legacy engine remains authoritative.
// Snapshot instance IDs are deterministic within a snapshot, NOT stable across
// separate snapshots: v1 stores indistinguishable definition IDs in piles.
import {createState,assertInvariants} from "./objects.js";
import {validate,start} from "../engine.js";

const seats=["p0","p1"];
const baseZone=(i,name)=>"base-"+i+"-"+name;
const tableZone=(i,id)=>"table-"+i+"-"+id;

// v1 zone IDs may be 80 characters. Kernel IDs have the same bound, so
// use stable numeric zone keys and keep the original IDs in the mapping.
export function legacySnapshot(module,legacy){
  const m=validate(structuredClone(module));
  if(!legacy||!Array.isArray(legacy.players)||legacy.players.length!==2)throw Error("Expected v1 match");
  const specs=[],entries=[];
  const tableKeys=new Map();
  const definitions=new Map(m.cards.map(c=>[c.id,c]));
  const put=(id,owner,visibility,capacity,items)=>{
    if(!Array.isArray(items))throw Error("Invalid legacy pile");
    specs.push({id,owner,visibility,capacity});
    entries.push({id,items});
  };
  const plain=(cards,i)=>cards.map(definition=>({definition,owner:seats[i],face:"up"}));
  for(const [i,p] of legacy.players.entries()){
    // v1 has no fixed runtime capacity on base piles.
    for(const [name,visibility] of [["deck","hidden"],["hand","owner"],["discard","public"]]){
      put(baseZone(i,name),seats[i],visibility,Number.MAX_SAFE_INTEGER,plain(p[name],i));
    }
    for(const [j,z] of m.table.entries()){
      if(z.owner!=="player")continue;
      const id=tableZone(i,j);tableKeys.set(i+":"+z.id,id);
      const items=z.kind==="units"?p.field.filter(u=>(u.zone||"field")===z.id).map(u=>{
        const c=definitions.get(u.id);
        if(!c)throw Error("Unknown legacy unit definition");
        return {definition:u.id,owner:seats[i],face:u.hidden?"down":"up",orientation:u.ready?"ready":"resting",damage:Math.max(0,(u.hidden?2:c.health)-u.hp),legacyHP:u.hp};
      }):plain(p.zones[z.id],i);
      put(id,seats[i],z.visibility,z.capacity,items);
    }
    if(p.field.some(u=>!m.table.some(z=>z.kind==="units"&&z.owner==="player"&&z.id===(u.zone||"field"))))throw Error("Unknown legacy unit zone");
  }
  for(const [j,z] of m.table.entries()){
    if(z.owner!=="shared")continue;
    const id=tableZone("shared",j);tableKeys.set("shared:"+z.id,id);
    // v1 shared setup cards originate exclusively from seat zero's deck.
    // v1 permits owner visibility on shared zones; conservatively conceal.
    put(id,null,z.visibility==="owner"?"hidden":z.visibility,z.capacity,plain(legacy.shared[z.id],0));
  }
  put("pending",null,"public",1,legacy.pending?[{definition:legacy.pending.id,owner:seats[legacy.pending.who],face:"up"}]:[]);
  const state=createState({players:seats,definitions:[...definitions.keys()],zones:specs});
  // Bulk initialization avoids quadratic cloning for large imported decks.
  // The state has not escaped this function, and each entry is validated.
  for(const {id,items} of entries){
    const zone=state.zones[id];
    if(items.length>zone.capacity)throw Error("Legacy zone exceeds capacity: "+id);
    for(const item of items){
      if(!definitions.has(item.definition)||!seats.includes(item.owner))throw Error("Invalid legacy card");
      const objectId="c"+state.nextId++;
      state.objects[objectId]={id:objectId,definition:item.definition,owner:item.owner,controller:item.owner,face:item.face,orientation:item.orientation??"ready",damage:item.damage??0,counters:{}};
      zone.cards.push(objectId);
    }
  }
  assertInvariants(state);
  return {state,tableKeys:Object.fromEntries(tableKeys),turn:{
    phase:legacy.phase,actor:seats[legacy.actor],active:seats[legacy.turn],
    round:legacy.round,winner:legacy.winner===null?null:seats[legacy.winner],
    resources:legacy.players.map(p=>({life:p.life,energy:p.energy}))
  }};
}

export function initializeLegacyBridge(module,seed){
  const m=validate(structuredClone(module));
  const legacy=start(m,seed);
  return {legacy,...legacySnapshot(m,legacy)};
}
