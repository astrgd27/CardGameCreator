import {evaluate,validateExpression} from "./expressions.js";
import {hiddenOptions,randomHidden,revealCard,reorderCard,damageCards} from "./hidden-zones.js";
// Bounded transactional effect interpreter. No host code or callbacks in programs.
import {createTokens,changeCardState} from "./card-state.js";
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
  check(op&&["choose","target","move","resource","draw","skipUnless","skipUnlessResource","skipUnlessChoice","token","counter","status","transform","flip","control","orient","search","randomHidden","reveal","reorder","lifeDamage","optional","scheduleTurn","skipUnlessExpr","eachCounter","resourceExpr"].includes(op.type),"Unsupported effect operation");
  if(op.type==="choose")check(key(op.name)&&Array.isArray(op.options)&&op.options.length>0&&op.options.length<=100&&op.options.every(key)&&new Set(op.options).size===op.options.length,"Invalid choice");
  if(op.type==="skipUnless")check(op.selector&&typeof op.selector==="object"&&Number.isSafeInteger(op.minimum)&&op.minimum>=0&&op.minimum<=100&&Number.isSafeInteger(op.skip)&&op.skip>=1&&op.skip<=64,"Invalid conditional instruction");
  if(["skipUnlessExpr","eachCounter","resourceExpr"].includes(op.type))validateExpression(op.expression);
  if(op.type==="skipUnlessExpr")check(Number.isSafeInteger(op.skip)&&op.skip>=1&&op.skip<=64,"Invalid expression skip");
  if(op.type==="skipUnlessResource")check(key(op.resource)&&["atLeast","atMost","equal"].includes(op.comparison)&&Number.isSafeInteger(op.amount)&&op.amount>=0&&Number.isSafeInteger(op.skip)&&op.skip>=1&&op.skip<=64,"Invalid resource condition");
  if(op.type==="skipUnlessChoice")check(key(op.choice)&&key(op.value)&&Number.isSafeInteger(op.skip)&&op.skip>=1&&op.skip<=64,"Invalid choice condition");
  if(["counter","status","transform","flip","control","orient"].includes(op.type))check((key(op.id)&&op.choice===undefined)||(op.id===undefined&&key(op.choice)),"Invalid card state target");
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
  const ctx={actor,choices,self:choices.source,source:choices.source,target:choices.target};
  if(op.type==="skipUnlessExpr"){if(evaluate(op.expression,next,ctx)!==true)pc+=op.skip;continue}
  if(op.type==="skipUnlessResource"){const rule=next.resourceRules[op.resource];check(rule,"Unknown conditional resource");const value=next.resourcePools[rule.scope==="shared"?"shared":"player-"+actor][op.resource];const ok=op.comparison==="atLeast"?value>=op.amount:op.comparison==="atMost"?value<=op.amount:value===op.amount;if(!ok)pc+=op.skip;continue}
  if(op.type==="skipUnlessChoice"){if(!Object.hasOwn(choices,op.choice)||choices[op.choice]!==op.value)pc+=op.skip;continue}
  if(op.type==="skipUnless"){if(selectCards(next,actor,op.selector).length<op.minimum)pc+=op.skip;continue}
  if(op.type==="search"||op.type==="optional"||op.type==="choose"||op.type==="target"){
   const options=op.type==="search"?hiddenOptions(next,actor,op):op.type==="optional"?["accept","decline"]:op.type==="target"?selectCards(next,actor,{...op.selector,targetable:true}):op.options;
   if(!options.length){const finished=finishResolution(timing,timing.resolving.id);return {state,timing:finished.timing,pending:null,fizzled:true,events:[{type:"effectFizzled",actor},...finished.events]}}
   return {state:next,timing:structuredClone(timing),pending:{effectId:timing.resolving.id,actor,pc,name:op.name,options:[...options],...(op.type==="search"?{labels:Object.fromEntries(options.map(id=>[id,next.objects[id].definition]))}:{}),choices,events},events:[]};
  }
  let result;
  if(op.type==="eachCounter"){let work=next,ev=[];for(const id of selectCards(next,actor,{...op.selector,targetable:true}).slice(0,20)){const delta=evaluate(op.expression,work,{...ctx,self:id,target:id});const r=changeCardState(work,actor,id,{type:"counter",counter:op.counter,delta});work=r.state;ev.push(...r.events)}result={state:work,events:ev}}
  else if(op.type==="resourceExpr")result=changeResource(next,actor,op.resource,evaluate(op.expression,next,ctx),{overflow:op.overflow??"reject"});
  else if(op.type==="scheduleTurn"){check(["extra","skip"].includes(op.kind)&&Number.isSafeInteger(op.count)&&op.count>=1&&op.count<=10,"Invalid turn schedule");const player=op.player==="self"?actor:op.player;check(next.players.includes(player),"Invalid turn seat");result={state:next,events:[{type:"turnScheduled",actor:player,kind:op.kind,count:op.count}]}}
  else if(op.type==="randomHidden"){const r=randomHidden(next,actor,op);if(!r.id){const finished=finishResolution(timing,timing.resolving.id);return {state,timing:finished.timing,pending:null,fizzled:true,events:[{type:"effectFizzled",actor},...finished.events]}}choices[op.name]=r.id;result=r}
  else if(op.type==="reveal")result=revealCard(next,actor,choices[op.choice],op);
  else if(op.type==="reorder")result=reorderCard(next,actor,choices[op.choice],op);
  else if(op.type==="lifeDamage")result=damageCards(next,op.player==="self"?actor:op.player,op,op.count);
  else if(op.type==="move"){
   const id=op.id??(Object.hasOwn(choices,op.choice)?choices[op.choice]:undefined);
   check(key(id),"Missing card choice");
   result=moveWithAttachments(next,{id,from:op.from,to:op.to});
  }else if(op.type==="token")result=createTokens(next,actor,op);
  else if(["counter","status","transform","flip","control","orient"].includes(op.type)){const id=op.id??(Object.hasOwn(choices,op.choice)?choices[op.choice]:undefined);result=changeCardState(next,actor,id,op)}
  else if(op.type==="draw"){
   let count=op.count,to=op.to;
   const rules=(next.eventReplacements??[]).filter(r=>r.event==="draw"&&(r.from===undefined||r.from===op.from)&&(r.when===undefined||evaluate(r.when,next,ctx)===true)).sort((a,b)=>(a.order??0)-(b.order??0));
   for(const r of rules){if(r.op==="prevent")count=0;else if(r.op==="reduce")count=Math.max(0,count-r.amount);else if(r.op==="redirect")to=r.to;events.push({type:"drawReplaced",actor,rule:r.id})}
   result=drawCards(next,op.from,to,Math.min(count,next.zones[op.from].cards.length,next.zones[to].capacity-next.zones[to].cards.length));
  }
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
 const result=advance(state,timing,program,triggerRules,{pc:0,choices:timing.resolving.choices??{},events:[]});
 if(result.pending)return {state,timing,pending:{...result.pending,work:result.state,program:structuredClone(program),triggerRules:structuredClone(triggerRules)},events:[]};
 return result.fizzled?{...result,state}:result;
}
export function resumeEffect(state,timing,pending,{actor,value}){
 check(pending&&timing.resolving?.id===pending.effectId&&actor===pending.actor&&actor===timing.resolving.actor,"Choice unavailable");
 check(pending.options.includes(value),"Invalid choice value");
 const choices={...pending.choices,[pending.name]:value};
 const op=pending.program[pending.pc];const result=advance(pending.work,timing,pending.program,pending.triggerRules,{pc:pending.pc+1+(op.type==="optional"&&value==="decline"?op.skip:0),choices,events:pending.events});
 if(result.pending)return {state,timing,pending:{...result.pending,work:result.state,program:pending.program,triggerRules:pending.triggerRules},events:[]};
 return result.fizzled?{...result,state}:result;
}
// Only the authorized chooser gets the options; work state and prior choices
// are internal and must never be included in a player projection.
export function choiceView(pending,viewer){
 if(!pending)return null;
 return pending.actor===viewer?{actor:viewer,name:pending.name,options:[...pending.options],...(pending.labels?{labels:structuredClone(pending.labels)}:{})}:{actor:pending.actor,waiting:true};
}
