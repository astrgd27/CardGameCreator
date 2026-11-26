// Internal attachment primitives. Rule definitions decide whether a player may attach.
import {assertInvariants,moveCard} from "./objects.js";

function requireObject(s,id){
 if(typeof id!=="string"||!Object.hasOwn(s.objects,id))throw Error("Unknown object");
 return s.objects[id];
}
function zoneOf(s,id){
 const z=Object.values(s.zones).find(z=>z.cards.includes(id));
 if(!z)throw Error("Missing zone membership");
 return z;
}
export function assertAttachments(s){
 assertInvariants(s);
 const links=s.attachments??{};
 for(const [id,link] of Object.entries(links)){
  requireObject(s,id);requireObject(s,link.host);
  if(id===link.host)throw Error("Self attachment");
  if(!["detach","follow","reject"].includes(link.onHostMove))throw Error("Invalid attachment policy");
  if(zoneOf(s,id).id!==zoneOf(s,link.host).id)throw Error("Attachment and host must share a zone");
  const seen=new Set([id]);let cursor=link.host;
  while(cursor!==undefined){
   if(seen.has(cursor))throw Error("Attachment cycle");
   seen.add(cursor);cursor=Object.hasOwn(links,cursor)?links[cursor].host:undefined;
  }
 }
 return true;
}
export function attachCard(s,{id,host,onHostMove="detach",max=Number.MAX_SAFE_INTEGER}){
 assertAttachments(s);
 requireObject(s,id);requireObject(s,host);
 if(id===host||Object.hasOwn(s.attachments??{},id))throw Error("Invalid attachment");
 if(!Number.isSafeInteger(max)||max<0)throw Error("Invalid attachment limit");
 if(Object.values(s.attachments??{}).filter(x=>x.host===host).length>=max)throw Error("Attachment limit reached");
 const next=structuredClone(s);next.attachments??={};
 next.attachments[id]={host,onHostMove};assertAttachments(next);
 return {state:next,events:[{type:"attached",id,host}]};
}
export function detachCard(s,id){
 assertAttachments(s);
 if(!Object.hasOwn(s.attachments??{},id))throw Error("Card is not attached");
 const next=structuredClone(s),host=next.attachments[id].host;
 delete next.attachments[id];
 return {state:next,events:[{type:"detached",id,host}]};
}
// Move a tree atomically. A rejected descendant or capacity error leaves input intact.
// Follow uses destination defaults, not the host's face/controller/reset policy.
export function moveWithAttachments(s,action){
 assertAttachments(s);
 let next=structuredClone(s);const events=[];
 const move=(a)=>{
  const children=Object.entries(next.attachments??{}).filter(([,link])=>link.host===a.id);
  if(a.from!==a.to){
   for(const [id,link] of children){
    if(link.onHostMove==="reject")throw Error("Host movement blocked by attachment");
    if(link.onHostMove==="detach"){delete next.attachments[id];events.push({type:"detached",id,host:a.id});}
   }
   if(Object.hasOwn(next.attachments??{},a.id)){
    const host=next.attachments[a.id].host;
    if(zoneOf(next,host).id!==a.to){delete next.attachments[a.id];events.push({type:"detached",id:a.id,host});}
   }
  }
  const components=next.objects[a.id].components;
  const r=moveCard(next,a);next=r.state;events.push(r.event);
  if(a.from!==a.to&&a.reset&&components?.length){const host=next.objects[a.id],dst=next.zones[a.to];if(dst.cards.length+components.length>dst.capacity)throw Error("Stack separation exceeds capacity");host.definition=host.baseDefinition;delete host.baseDefinition;delete host.components;for(const c of components){next.objects[c.id]={id:c.id,definition:c.physicalDefinition,owner:c.owner,controller:c.owner,face:"up",orientation:"ready",damage:0,counters:{}};dst.cards.push(c.id);events.push({type:"componentSeparated",id:c.id,host:a.id,to:a.to})}}
  if(a.from!==a.to)for(const [id,link] of children)if(link.onHostMove==="follow")move({id,from:a.from,to:a.to});
 };
 move(action);assertAttachments(next);return {state:next,events};
}
