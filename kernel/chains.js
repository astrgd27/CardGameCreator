// Optional chain policies layered on the timing scheduler.
import {submitEffect} from "./timing.js";
export function submitChainLink(t,entry,{maxLinks=100,speedByEffect={},minimumResponseSpeed=0,escalate=false}={}){
 if(!Number.isSafeInteger(maxLinks)||maxLinks<1||maxLinks>100||!Number.isSafeInteger(minimumResponseSpeed)||minimumResponseSpeed<0||typeof escalate!=="boolean")throw Error("Invalid chain policy");
 if(t.queue.length>=maxLinks)throw Error("Chain limit reached");
 const speed=id=>{
  if(!Object.hasOwn(speedByEffect,id)||!Number.isSafeInteger(speedByEffect[id])||speedByEffect[id]<0)throw Error("Unknown effect speed");
  return speedByEffect[id];
 };
 const current=speed(entry.effect);
 if(t.queue.length){
  const last=speed(t.queue[t.queue.length-1].effect);
  if(current<minimumResponseSpeed||(escalate&&current<last))throw Error("Response speed too low");
 }
 return submitEffect(t,entry);
}
