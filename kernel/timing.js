// Serializable timing primitives. Module rules must authorize submissions,
// determine trigger eligibility, and apply effects outside this scheduler.
const requireValue=(ok,message)=>{if(!ok)throw Error(message)};
const validId=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(x)&&!Object.hasOwn(Object.prototype,x);

export function createTiming(players,{order="lifo",active=players?.[0]}={}){
 requireValue(Array.isArray(players)&&players.length>0&&players.every(validId)&&new Set(players).size===players.length,"Invalid seats");
 requireValue(players.includes(active)&&["lifo","fifo"].includes(order),"Invalid timing policy");
 return {players:[...players],active,priority:active,order,passes:0,nextId:1,queue:[],resolving:null};
}
function allocate(t,entry){
 requireValue(entry&&validId(entry.effect)&&t.players.includes(entry.actor),"Invalid effect entry");
 requireValue(Number.isSafeInteger(t.nextId)&&t.nextId<Number.MAX_SAFE_INTEGER,"Effect ID exhausted");
 return {id:"e"+t.nextId++,actor:entry.actor,effect:entry.effect,choices:structuredClone(entry.choices??{})};
}
export function submitEffect(t,entry){
 requireValue(t.resolving===null&&entry?.actor===t.priority,"No priority");
 const next=structuredClone(t),item=allocate(next,entry);
 next.queue.push(item);next.passes=0;
 return {timing:next,events:[{type:"effectQueued",id:item.id,actor:item.actor}]};
}
// Trusted triggers are submitted in an explicit, already adjudicated order.
// Trigger order is not inferred from card names or game-specific assumptions.
export function enqueueTriggers(t,entries){
 requireValue(t.resolving===null&&Array.isArray(entries)&&entries.length<=100,"Invalid trigger batch");
 const next=structuredClone(t),events=[];
 for(const entry of entries){
  const item=allocate(next,entry);next.queue.push(item);
  events.push({type:"triggerQueued",id:item.id,actor:item.actor});
 }
 if(entries.length){next.passes=0;next.priority=next.active;}
 return {timing:next,events};
}
export function passPriority(t,actor){
 requireValue(t.resolving===null&&actor===t.priority,"No priority");
 const next=structuredClone(t);next.passes++;
 if(next.passes<next.players.length){
  next.priority=next.players[(next.players.indexOf(actor)+1)%next.players.length];
  return {timing:next,events:[{type:"priorityChanged",actor:next.priority}]};
 }
 next.passes=0;
 if(!next.queue.length){
  next.priority=next.active;
  return {timing:next,events:[{type:"windowClosed"}]};
 }
 next.resolving=next.order==="lifo"?next.queue.pop():next.queue.shift();
 next.priority=null;
 return {timing:next,events:[{type:"resolutionStarted",id:next.resolving.id}]};
}
// Completing a resolution is an explicit trusted boundary. The caller must
// commit all effects atomically before calling this function.
export function finishResolution(t,id){
 requireValue(t.resolving!==null&&t.resolving.id===id,"Wrong resolving effect");
 const next=structuredClone(t);next.resolving=null;next.priority=next.active;next.passes=0;
 return {timing:next,events:[{type:"resolutionFinished",id}]};
}
export function changeActive(t,actor){
 requireValue(t.players.includes(actor)&&t.resolving===null&&!t.queue.length&&t.passes===0,"Cannot change active player");
 const next=structuredClone(t);next.active=actor;next.priority=actor;return next;
}
