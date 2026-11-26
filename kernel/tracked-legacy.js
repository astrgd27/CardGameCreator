// Transactional bridge for explicit v1 actions. The legacy rules engine still
// decides legality and outcomes. The kernel tracks exact instance movement.
import {act,pass,attack,reveal,reason,legalTargets,validate} from "../engine.js";
import {initializeLegacyBridge,legacySnapshot} from "./legacy-adapter.js";
import {moveCard,assertInvariants,projectState} from "./objects.js";

const base=(i,pile)=>"base-"+i+"-"+pile;
const fieldZone=(bridge,i,u)=>bridge.tableKeys[i+":"+(u.zone||"field")];
const reject=message=>{throw Error(message)};
const indexOK=(n,length)=>Number.isSafeInteger(n)&&n>=0&&n<length;
export function trackedFieldId(bridge,legacy,i,index){
 const u=legacy.players[i].field[index];
 if(!u)reject("Unknown field index");
 const zone=fieldZone(bridge,i,u);
 const local=legacy.players[i].field.slice(0,index).filter(v=>fieldZone(bridge,i,v)===zone).length;
 return bridge.state.zones[zone].cards[local];
}
function fieldIndex(bridge,legacy,i,id){
 return legacy.players[i].field.findIndex((_,index)=>trackedFieldId(bridge,legacy,i,index)===id);
}
export function startTracked(module,seed){
 const m=validate(structuredClone(module));
 return initializeLegacyBridge(m,seed);
}
// Choices are based on legacy legality, with persistent identifiers for owned
// cards. Opposing concealed targets use public field positions, not instance IDs.
export function trackedChoices(module,bridge,actor){
 const m=validate(structuredClone(module)),l=bridge.legacy;
 if(![0,1].includes(actor)||l.actor!==actor||l.winner!==null)return [];
 const p=l.players[actor],out=[{type:"pass",actor}];
 for(const [index] of p.hand.entries()){
  if(!reason(m,l,actor,index))out.push({type:"play",actor,id:bridge.state.zones[base(actor,"hand")].cards[index]});
 }
 if(!l.pending&&l.turn===actor){
  for(const [index,u] of p.field.entries()){
   if(!u.ready)continue;
   const id=trackedFieldId(bridge,l,actor,index);
   if(u.hidden){out.push({type:"reveal",actor,id});continue}
   if(!m.phases[l.phase||0].attack)continue;
   const c=m.cards.find(c=>c.id===u.id);
   for(const [move,a] of c.attacks.entries()){
    if(a.cost>p.energy)continue;
    for(const target of legalTargets(m,l,actor))out.push({type:"attack",actor,id,move,target});
   }
  }
 }
 return out;
}
export function applyTracked(module,bridge,action){
 const m=validate(structuredClone(module)),before=bridge.legacy;
 const {actor:i,type}=action??{};
 if(![0,1].includes(i)||before.actor!==i||before.winner!==null)reject("Action unavailable");
 const l=structuredClone(before);
 let state=structuredClone(bridge.state),events=[];
 const move=(id,from,to,extra={})=>{
  const r=moveCard(state,{id,from,to,...extra});state=r.state;events.push(r.event);
 };
 const hand=base(i,"hand"),pending=state.zones.pending.cards[0];
 let played=null,attacked=null;
 if(type==="play"){
  const index=state.zones[hand].cards.indexOf(action.id);
  if(!indexOK(index,l.players[i].hand.length))reject("Card is not in hand");
  played={id:action.id,owner:i,definition:l.players[i].hand[index]};
  act(m,l,i,index);
 }else if(type==="pass")pass(m,l,i);
 else if(type==="reveal"){
  const index=fieldIndex(bridge,before,i,action.id);
  if(index<0)reject("Card is not in your field");
  reveal(m,l,i,index);
 }else if(type==="attack"){
  const index=fieldIndex(bridge,before,i,action.id);
  if(index<0||!Number.isSafeInteger(action.move)||!Number.isSafeInteger(action.target))reject("Invalid attack choice");
  const target=action.target;
  if(target!==-1&&!indexOK(target,before.players[1-i].field.length))reject("Invalid target");
  if(target!==-1)attacked={id:trackedFieldId(bridge,before,1-i,target),zone:fieldZone(bridge,1-i,before.players[1-i].field[target])};
  attack(m,l,i,index,action.move,target);
 }else reject("Unknown action");

 // Each accepted legacy action removes at most one hand card. Resolve that
 // card and any prior pending card explicitly; draws always take a deck prefix.
 if(played){
  const c=m.cards.find(c=>c.id===played.definition);
  if(l.pending&&l.pending.who===i&&!before.pending){
   move(played.id,hand,"pending");
  }else if(c.kind==="unit"){
   const z=bridge.tableKeys[i+":"+c.zone];
   const hidden=c.entry==="hidden"&&c.timing==="main"&&!before.pending;
   move(played.id,hand,z,{face:hidden?"down":"up"});
  }else move(played.id,hand,base(i,"discard"));
 }
 if(pending&&!l.pending){
  const who=before.pending.who,c=m.cards.find(c=>c.id===before.pending.id);
  // The reaction can end the match before the pending unit resolves.
  const fieldAdded=l.players[who].field.length>before.players[who].field.length;
  if(c.kind==="unit"&&fieldAdded)move(pending,"pending",bridge.tableKeys[who+":"+c.zone]);
  else move(pending,"pending",base(who,"discard"));
 }
 if(attacked&&l.players[1-i].field.length<before.players[1-i].field.length)
  move(attacked.id,attacked.zone,base(1-i,"discard"),{face:"up",reset:true});
 for(const [seat,p] of l.players.entries()){
  const deck=base(seat,"deck"),dest=base(seat,"hand");
  const count=before.players[seat].deck.length-p.deck.length;
  if(count<0)reject("Unsupported deck mutation");
  for(let n=0;n<count;n++)move(state.zones[deck].cards[0],deck,dest);
 }
 // Compare ordered definition sequences against independently converted v1
 // state. Never guess identity from duplicate definitions on mismatch.
 const expected=legacySnapshot(m,l);
 for(const [zone,z] of Object.entries(expected.state.zones)){
  const actual=state.zones[zone];
  if(actual.cards.length!==z.cards.length)reject("Bridge mismatch: "+zone);
  for(const [index,id] of actual.cards.entries()){
   const o=state.objects[id],e=expected.state.objects[z.cards[index]];
   if(o.definition!==e.definition||o.owner!==e.owner)reject("Bridge identity mismatch: "+zone);
   o.face=e.face;o.orientation=e.orientation;o.damage=e.damage;
  }
 }
 assertInvariants(state);
 return {bridge:{legacy:l,state,tableKeys:expected.tableKeys,turn:expected.turn},events};
}
export function trackedView(bridge,actor){
 if(![0,1].includes(actor))reject("Unknown viewer");
 return {...projectState(bridge.state,"p"+actor),turn:structuredClone(bridge.turn)};
}

// Use the existing bot's deterministic choice policy without changing its behavior.
// Compare candidate transitions to its result; identical transitions use the
// first legal choice, since v1 has no distinction between duplicate cards.
export function trackedBot(module,bridge,legacyBot){
 const expected=structuredClone(bridge.legacy);
 legacyBot(module,expected);
 for(const action of trackedChoices(module,bridge,bridge.legacy.actor)){
   const result=applyTracked(module,bridge,action);
   if(JSON.stringify(result.bridge.legacy)===JSON.stringify(expected))return result;
 }
 throw Error("Legacy bot action could not be mapped");
}
