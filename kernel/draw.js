// Seeded zone shuffling and bounded drawing, independent of presentation.
import {moveWithAttachments} from "./attachments.js";
export function shuffleZone(state,zone,seed){
 if(!Object.hasOwn(state.zones,zone)||!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw Error("Invalid shuffle");
 const next=structuredClone(state),cards=next.zones[zone].cards;
 if(next.reveals)for(const id of cards)delete next.reveals[id];
 let x=seed>>>0;
 for(let i=cards.length-1;i>0;i--){x=(Math.imul(x,1664525)+1013904223)>>>0;const j=Math.floor(x/4294967296*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]]}
 return {state:next,seed:x,events:[{type:"zoneShuffled",zone,count:cards.length}]};
}
export function drawCards(state,from,to,count=1){
 if(!Object.hasOwn(state.zones,from)||!Object.hasOwn(state.zones,to)||from===to||!Number.isSafeInteger(count)||count<0||count>100)throw Error("Invalid draw");
 if(state.zones[from].cards.length<count||state.zones[to].cards.length+count>state.zones[to].capacity)throw Error("Draw exceeds available cards or destination capacity");
 let next=state;const events=[];
 for(let i=0;i<count;i++){const id=next.zones[from].cards[0];const r=moveWithAttachments(next,{id,from,to,face:"up"});next=r.state;events.push(...r.events)}
 return {state:next,events};
}
