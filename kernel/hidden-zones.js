// Trusted effect instructions authorize access; ordinary selectors never inspect hidden zones.
import {moveWithAttachments} from "./attachments.js";
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
export function hiddenOptions(state,actor,op){
 const z=state.zones[op.zone];check(z&&z.owner===actor,"Hidden search requires owned zone");
 const ids=z.cards.slice(0,op.top??100).filter(id=>!op.definition||state.objects[id].definition===op.definition);
 return ids.slice(0,100);
}
export function randomHidden(state,actor,op){
 const ids=hiddenOptions(state,actor,op);if(!ids.length)return {state,id:null,events:[]};
 const next=structuredClone(state);next.hiddenSeed=(Math.imul(next.hiddenSeed??1,1664525)+1013904223)>>>0;
 return {state:next,id:ids[Math.floor(next.hiddenSeed/4294967296*ids.length)],events:[]};
}
export function revealCard(state,actor,id,op){
 check(Object.hasOwn(state.objects,id),"Unknown revealed card");
 const z=Object.values(state.zones).find(z=>z.cards.includes(id));check(z?.owner===actor,"Reveal requires owned zone");
 const next=structuredClone(state);next.reveals??={};
 next.reveals[id]={zone:z.id,viewers:op.audience==="all"?[...state.players]:[actor],definition:state.objects[id].definition};
 return {state:next,events:[{type:"cardRevealed",actor}]};
}
export function reorderCard(state,actor,id,op){
 const z=state.zones[op.zone];check(z?.owner===actor&&z.cards.includes(id),"Invalid reorder");
 const next=structuredClone(state),cards=next.zones[z.id].cards;cards.splice(cards.indexOf(id),1);
 if(op.position==="top")cards.unshift(id);else cards.push(id);
 return {state:next,events:[{type:"zoneReordered",actor,zone:z.id}]};
}
export function damageCards(state,player,policy,count){
 let next=state;const events=[];check(Number.isSafeInteger(count)&&count>=0&&count<=100,"Invalid damage count");
 const from=policy.zone,to=policy.destination;
 check(state.zones[from]?.owner===player&&state.zones[to]?.owner===player&&from!==to,"Invalid life zones");
 for(let i=0;i<count;i++){
  const id=next.zones[from].cards[0];
  if(!id){next=structuredClone(next);next.ruleLosses??=[];if(policy.emptyLoss!==false&&!next.ruleLosses.includes(player))next.ruleLosses.push(player);events.push({type:"lifeExhausted",actor:player});break}
  const definition=next.objects[id].definition,r=moveWithAttachments(next,{id,from,to,face:"up"});next=r.state;
  if(policy.triggers?.[definition]){next.lifeDecisions??=[];next.lifeDecisions.push({actor:player,id,definition,effect:policy.triggers[definition],zone:to})}
  events.push(...r.events,{type:"lifeCardTaken",actor:player,...(next.zones[to].visibility==="public"?{id,definition}:{})});
 }
 return {state:next,events};
}
