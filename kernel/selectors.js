// Deterministic, bounded selectors for internal rule execution.
const key=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(x)&&!Object.hasOwn(Object.prototype,x);
export function selectCards(state,actor,query={}){
 if(!state.players.includes(actor)||!query||typeof query!=="object"||Array.isArray(query))throw Error("Invalid selector");
 const allowed=["zones","owner","controller","face","orientation","definition","limit"];
 if(Object.keys(query).some(k=>!allowed.includes(k)))throw Error("Unsupported selector field");
 if(query.zones!==undefined&&(!Array.isArray(query.zones)||query.zones.length>100||new Set(query.zones).size!==query.zones.length||query.zones.some(z=>!key(z)||!Object.hasOwn(state.zones,z))))throw Error("Invalid selector zones");
 for(const k of ["owner","controller"])if(query[k]!==undefined&&!["self","opponent","any"].includes(query[k]))throw Error("Invalid seat selector");
 if(query.face!==undefined&&!["up","down"].includes(query.face))throw Error("Invalid face selector");
 if(query.orientation!==undefined&&!["ready","resting","tapped"].includes(query.orientation))throw Error("Invalid orientation selector");
 if(query.definition!==undefined&&!state.definitions.includes(query.definition))throw Error("Invalid definition selector");
 const limit=query.limit??100;
 if(!Number.isSafeInteger(limit)||limit<0||limit>100)throw Error("Invalid selector limit");
 const seat=(rule,value)=>rule===undefined||rule==="any"||(rule==="self"?value===actor:value!==actor);
 if(limit===0)return [];
 const out=[];
 for(const zid of query.zones??Object.keys(state.zones)){
  const zone=state.zones[zid];
  // Choice lists cannot expose identities in concealed zones or face-down
  // opponent cards. Blind/random targeting requires a separate rule.
  if(zone.visibility==="hidden"||(zone.visibility==="owner"&&zone.owner!==actor))continue;
  for(const id of zone.cards){
   const o=state.objects[id];
   if(o.face==="down"&&o.owner!==actor)continue;
   if(seat(query.owner,o.owner)&&seat(query.controller,o.controller)&&
      (query.face===undefined||query.face===o.face)&&
      (query.orientation===undefined||query.orientation===o.orientation)&&
      (query.definition===undefined||query.definition===o.definition))out.push(id);
   if(out.length===limit)return out;
  }
 }
 return limit===0?[]:out.slice(0,limit);
}
