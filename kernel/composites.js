// Composite cards keep the host instance ID; consumed physical components retain their own IDs.
import {selectCards} from "./selectors.js";
import {assertInvariants} from "./objects.js";
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const zoneOf=(s,id)=>Object.values(s.zones).find(z=>z.cards.includes(id));
export function stackOptions(m,actor){
 if(m.result||m.pending||m.battle||m.triggerOrderPending||m.openingQueue?.length||m.timing.priority!==actor||m.timing.active!==actor||m.timing.queue.length||m.windowClosed)return [];
 if(m.rules.phases&&!m.rules.phases[m.phaseIndex].actions.includes("activate"))return [];
 const out=[];
 for(const r of m.rules.stackRules??[]){
  if(r.minimumTurn!==undefined&&m.turn<r.minimumTurn)continue;
  const hosts=selectCards(m.state,actor,{zones:r.hostZones,controller:"self",definition:r.hostDefinition,face:"up"});
  const materials=selectCards(m.state,actor,{zones:r.materialZones,controller:"self",definition:r.materialDefinition,face:"up"});
  for(const host of hosts)for(const material of materials)if(host!==material&&!m.state.objects[host].token&&!m.state.objects[material].components?.length&&!m.state.objects[material].token&&!Object.hasOwn(m.state.attachments??{},material)&&!Object.values(m.state.attachments??{}).some(l=>l.host===material)&&(m.state.objects[host].components?.length??0)<20)out.push({rule:r.id,host,material});
 }
 return out.slice(0,200);
}
export function stackCard(m,actor,action){
 check(stackOptions(m,actor).some(o=>o.rule===action.rule&&o.host===action.host&&o.material===action.material),"Illegal stack action");
 const r=m.rules.stackRules.find(x=>x.id===action.rule),s=structuredClone(m.state),h=s.objects[action.host],c=s.objects[action.material];
 const z=zoneOf(s,c.id);z.cards=z.cards.filter(id=>id!==c.id);
 h.components??=[];
 h.baseDefinition??=h.definition;
 h.components.push({id:c.id,definition:h.definition,physicalDefinition:c.definition,owner:c.owner,inherit:r.inherit===true});
 h.definition=r.resultDefinition??c.definition;
 delete s.objects[c.id];if(s.reveals){delete s.reveals[c.id];delete s.reveals[h.id]}
 const preserve=new Set(r.preserve??["damage","counters","statuses","orientation","controller","attachments"]);
 if(!preserve.has("damage"))h.damage=0;
 if(!preserve.has("counters"))h.counters={};
 if(!preserve.has("statuses")){delete h.statuses;delete h.statusDurations}
 if(!preserve.has("orientation"))h.orientation="ready";
 if(!preserve.has("controller"))h.controller=h.owner;
 const events=[];
 if(!preserve.has("attachments"))for(const [id,l] of Object.entries(s.attachments??{}))if(l.host===h.id){delete s.attachments[id];events.push({type:"detached",id,host:h.id})}
 assertInvariants(s);return {state:s,events:[...events,{type:"cardStacked",id:h.id,material:c.id,actor}]};
}
export function inheritedDefinition(o,definition){return o?.definition===definition||o?.components?.some(c=>c.inherit&&c.definition===definition)}
