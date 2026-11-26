// Bounded transactional effect interpreter. No host code or callbacks in programs.
import {selectCards} from "./selectors.js";
import {drawCards} from "./draw.js";
import {moveWithAttachments} from "./attachments.js";
import {changeResource} from "./resources.js";
import {finishResolution} from "./timing.js";
import {collectTriggers} from "./triggers.js";
const key=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(x)&&!Object.hasOwn(Object.prototype,x);
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
function validateProgram(program){
 check(Array.isArray(program)&&program.length<=64,"Invalid effect program");
 for(const op of program){
  check(op&&["choose","target","move","resource","draw"].includes(op.type),"Unsupported effect operation");
  if(op.type==="choose")check(key(op.name)&&Array.isArray(op.options)&&op.options.length>0&&op.options.length<=100&&op.options.every(key)&&new Set(op.options).size===op.options.length,"Invalid choice");
  if(op.type==="target")check(key(op.name)&&op.selector&&typeof op.selector==="object","Invalid target selector");
  if(op.type==="draw")check(key(op.from)&&key(op.to)&&Number.isSafeInteger(op.count)&&op.count>=0&&op.count<=100,"Invalid draw instruction");
  if(op.type==="move")check(key(op.from)&&key(op.to)&&((key(op.id)&&op.choice===undefined)||(op.id===undefined&&key(op.choice))),"Invalid move instruction");
  if(op.type==="resource")check(key(op.resource)&&Number.isSafeInteger(op.delta),"Invalid resource instruction");
 }
}
function advance(state,timing,program,triggerRules,frame){
 let next=structuredClone(state),events=structuredClone(frame.events),choices=structuredClone(frame.choices);
 const actor=timing.resolving.actor;
 for(let pc=frame.pc;pc<program.length;pc++){
  const op=program[pc];
  if(op.type==="choose"||op.type==="target"){
   const options=op.type==="target"?selectCards(next,actor,op.selector):op.options;
   if(!options.length){const finished=finishResolution(timing,timing.resolving.id);return {state,timing:finished.timing,pending:null,fizzled:true,events:[{type:"effectFizzled",actor},...finished.events]}}
   return {state:next,timing:structuredClone(timing),pending:{effectId:timing.resolving.id,actor,pc,name:op.name,options:[...options],choices,events},events:[]};
  }
  let result;
  if(op.type==="move"){
   const id=op.id??(Object.hasOwn(choices,op.choice)?choices[op.choice]:undefined);
   check(key(id),"Missing card choice");
   result=moveWithAttachments(next,{id,from:op.from,to:op.to});
  }else if(op.type==="draw")result=drawCards(next,op.from,op.to,Math.min(op.count,next.zones[op.from].cards.length,next.zones[op.to].capacity-next.zones[op.to].cards.length));
  else result=changeResource(next,actor,op.resource,op.delta,{overflow:op.overflow??"reject"});
  next=result.state;events.push(...result.events);
  check(events.length<=100,"Effect event budget exceeded");
 }
 const finished=finishResolution(timing,timing.resolving.id);
 const triggered=collectTriggers(finished.timing,triggerRules,events);
 return {state:next,timing:triggered.timing,pending:null,events:[...events,...finished.events,...triggered.events]};
}
// The public match state is unchanged while a choice is outstanding.
// Keep the returned work state private until resolution completes.
export function beginEffect(state,timing,program,triggerRules=[]){
 check(timing.resolving!==null,"No effect resolving");
 validateProgram(program);
 const result=advance(state,timing,program,triggerRules,{pc:0,choices:{},events:[]});
 if(result.pending)return {state,timing,pending:{...result.pending,work:result.state,program:structuredClone(program),triggerRules:structuredClone(triggerRules)},events:[]};
 return result.fizzled?{...result,state}:result;
}
export function resumeEffect(state,timing,pending,{actor,value}){
 check(pending&&timing.resolving?.id===pending.effectId&&actor===pending.actor&&actor===timing.resolving.actor,"Choice unavailable");
 check(pending.options.includes(value),"Invalid choice value");
 const choices={...pending.choices,[pending.name]:value};
 const result=advance(pending.work,timing,pending.program,pending.triggerRules,{pc:pending.pc+1,choices,events:pending.events});
 if(result.pending)return {state,timing,pending:{...result.pending,work:result.state,program:pending.program,triggerRules:pending.triggerRules},events:[]};
 return result.fizzled?{...result,state}:result;
}
// Only the authorized chooser gets the options; work state and prior choices
// are internal and must never be included in a player projection.
export function choiceView(pending,viewer){
 if(!pending)return null;
 return pending.actor===viewer?{actor:viewer,name:pending.name,options:[...pending.options]}:{actor:pending.actor,waiting:true};
}
