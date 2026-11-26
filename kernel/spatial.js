// Spatial slots are ordinary public zones with explicit graph metadata.
// All movement uses existing zone membership and attachment transactions.
import {moveWithAttachments} from "./attachments.js";
import {quotePayment,payResources} from "./resources.js";
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
export const slotOf=(s,id)=>s.spatial?.slots.find(x=>s.zones[x.zone].cards.includes(id));
export function neighbors(s,zone){
 const p=s.spatial;if(!p)return [];
 const slot=p.slots.find(x=>x.zone===zone);if(!slot)return [];
 return p.slots.filter(x=>x.zone!==zone&&((p.grid&&Math.abs(x.x-slot.x)+Math.abs(x.y-slot.y)===1)||(p.edges??[]).some(e=>e[0]===zone&&e[1]===x.zone||e[1]===zone&&e[0]===x.zone))).map(x=>x.zone);
}
export function distance(s,a,b){if(!s.spatial)return 0;if(!a||!b)return Infinity;
 const seen=new Set([a]),queue=[[a,0]];while(queue.length){const [z,d]=queue.shift();if(z===b)return d;for(const n of neighbors(s,z))if(!seen.has(n)){seen.add(n);queue.push([n,d+1])}}return Infinity;
}
export function inRange(s,a,b,range=s.spatial?.attackRange){return range===undefined||distance(s,slotOf(s,a)?.zone,slotOf(s,b)?.zone)<=range}
function traversable(s,actor,zone,id){
 const slot=s.spatial.slots.find(x=>x.zone===zone),z=s.zones[zone];
 if(!slot||slot.blocked||z.cards.length>=z.capacity||slot.ownerOnly&&z.owner!==actor)return false;
 return !slot.exclusive||z.cards.every(x=>x===id||s.objects[x].controller===actor);
}
export function pathTo(s,actor,id,to){
 const from=slotOf(s,id)?.zone;if(!from||from===to)return null;
 const seen=new Set([from]),queue=[[from]];
 while(queue.length){const path=queue.shift(),z=path.at(-1);if(path.length-1>=(s.spatial.maxSteps??1))continue;
  for(const n of neighbors(s,z))if(!seen.has(n)&&traversable(s,actor,n,id)){const p=[...path,n];if(n===to)return p;seen.add(n);queue.push(p)}
 }return null;
}
export function movementOptions(m,actor){
 const s=m.state,p=s.spatial;if(!p||m.result||m.pending||m.battle||m.triggerOrderPending||m.openingQueue?.length||m.timing.resolving||m.timing.queue.length||m.windowClosed||m.timing.active!==actor||m.timing.priority!==actor||m.rules.phases&&!m.rules.phases[m.phaseIndex].actions.includes("move"))return [];
 const out=[];for(const slot of p.slots)for(const id of s.zones[slot.zone].cards){const o=s.objects[id];if(o.controller!==actor||o.face!=="up"||o.orientation!=="ready"||Object.hasOwn(s.attachments??{},id))continue;
 for(const dest of p.slots){const path=pathTo(s,actor,id,dest.zone);if(!path)continue;const costs=p.resource?[{kind:"spend",resource:p.resource,amount:(p.costPerStep??1)*(path.length-1)}]:[];
 if(!quotePayment(s,actor,costs).legal)continue;
 try{moveWithAttachments(s,{id,from:slot.zone,to:dest.zone});out.push({id,to:dest.zone,path,cost:costs[0]?.amount??0})}catch{}
 if(out.length>=200)return out;
 }}return out;
}
export function moveSpatial(m,actor,action){
 const option=movementOptions(m,actor).find(x=>x.id===action.id&&x.to===action.to);check(option,"Illegal spatial movement");
 const p=m.state.spatial,paid=payResources(m.state,actor,p.resource?[{kind:"spend",resource:p.resource,amount:option.cost}]:[]);
 const moved=moveWithAttachments(paid.state,{id:option.id,from:option.path[0],to:option.to});
 if(p.restOnMove)moved.state.objects[option.id].orientation="resting";
 return {state:moved.state,events:[...paid.events,...moved.events,{type:"spatialMoved",id:option.id,actor,from:option.path[0],to:option.to,steps:option.path.length-1}]};
}
export function locationControl(s){
 return (s.spatial?.slots??[]).map(x=>{const owners=new Set(s.zones[x.zone].cards.filter(id=>!Object.hasOwn(s.attachments??{},id)).map(id=>s.objects[id].controller));return {zone:x.zone,controller:owners.size===1?[...owners][0]:null,contested:owners.size>1}});
}
export function assertSpatial(s){
 if(!s.spatial)return;
 for(const x of s.spatial.slots){const z=s.zones[x.zone];check(!x.blocked||!z.cards.length,"Blocked slot occupied");check(!x.ownerOnly||z.cards.every(id=>s.objects[id].controller===z.owner),"Owner-only slot occupied");check(!x.exclusive||new Set(z.cards.map(id=>s.objects[id].controller)).size<=1,"Exclusive slot contested")}
}
