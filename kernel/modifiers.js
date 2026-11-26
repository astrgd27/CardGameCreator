// Deterministic layered numeric modifiers. Trusted rules provide the definitions.
const check=(ok,m)=>{if(!ok)throw Error(m)};
const key=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(x)&&!Object.hasOwn(Object.prototype,x);
export function deriveStatistic(state,id,stat,base,modifiers,{turn=0}={}){
 check(typeof id==="string"&&Object.hasOwn(state.objects,id)&&key(stat)&&Number.isSafeInteger(base),"Invalid statistic");
 check(Array.isArray(modifiers)&&modifiers.length<=100&&Number.isSafeInteger(turn)&&turn>=0,"Invalid modifier budget");
 const seen=new Set(),active=[];
 for(const m of modifiers){
  check(m&&key(m.id)&&!seen.has(m.id)&&key(m.stat)&&["set","add","multiply"].includes(m.op)&&Number.isSafeInteger(m.value),"Invalid modifier");
  seen.add(m.id);
  check(m.expires===undefined||(Number.isSafeInteger(m.expires)&&m.expires>=0),"Invalid expiration");
  check(m.target===undefined||(typeof m.target==="string"&&Object.hasOwn(state.objects,m.target)),"Invalid target");
  check(m.source===undefined||(typeof m.source==="string"&&Object.hasOwn(state.objects,m.source)&&Array.isArray(m.sourceZones)&&m.sourceZones.every(z=>Object.hasOwn(state.zones,z))),"Invalid source");
  if(m.stat!==stat||(m.target!==undefined&&m.target!==id)||(m.expires!==undefined&&turn>=m.expires))continue;
  if(m.source!==undefined&&!m.sourceZones.some(z=>state.zones[z].cards.includes(m.source)))continue;
  active.push(m);
 }
 let value=base;const applied=[];
 for(const op of ["set","add","multiply"])for(const m of active.filter(m=>m.op===op)){
  value=op==="set"?m.value:op==="add"?value+m.value:value*m.value;
  check(Number.isSafeInteger(value),"Statistic overflow");applied.push(m.id);
 }
 return {value:Math.max(0,value),applied};
}
