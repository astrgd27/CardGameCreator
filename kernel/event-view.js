// UI/export boundary only. Internal events retain full data for trusted triggers.
// Unknown event fields are never passed through implicitly.
export function projectEvents(events,before,after,viewer){
 const visible=s=>new Set(Object.values(s.zones).filter(z=>z.visibility==="public"||z.visibility==="owner"&&z.owner===viewer).flatMap(z=>z.cards.filter(id=>{const o=s.objects[id];return o&&(o.face==="up"||o.owner===viewer)})));
 const prior=visible(before),now=visible(after);
 return events.map(e=>{
  const out={type:e.type};
  for(const k of ["actor","amount","count","resource","phase","zone","from","to"])if(typeof e[k]==="string"||Number.isSafeInteger(e[k]))out[k]=e[k];
  // A newly concealed card must not retain a trackable ID in the event log.
  if(typeof e.id==="string"&&now.has(e.id)){out.id=e.id;if(prior.has(e.id)||after.objects[e.id]?.face==="up")for(const k of ["definition","face","orientation","counter","status","before","after"])if(typeof e[k]==="string"||Number.isSafeInteger(e[k]))out[k]=e[k]}
  if(typeof e.host==="string"&&now.has(e.host)&&out.id)out.host=e.host;
  return out;
 });
}
