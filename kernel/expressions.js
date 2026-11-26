// Bounded data-only scalar expressions. No eval, arbitrary paths or host calls.
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const key=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(x)&&!Object.hasOwn(Object.prototype,x);
const scalar=x=>typeof x==="boolean"||typeof x==="string"&&x.length<=200||Number.isSafeInteger(x);
const ops={add:2,sub:2,mul:2,min:2,max:2,eq:2,lt:2,lte:2,and:2,or:2,not:1};
export function validateExpression(expr){
 let budget=64;
 function walk(e,depth){check(--budget>=0&&depth<=8,"Expression budget exceeded");if(scalar(e))return;
 check(e&&typeof e==="object"&&!Array.isArray(e),"Invalid expression");
 if(e.ref){check(["choice","attribute","counter","status","damage","resource"].includes(e.ref)&&key(e.key??"value")&&(e.card===undefined||["self","source","target"].includes(e.card)),"Invalid expression reference");return}
 check(Object.hasOwn(ops,e.op)&&Array.isArray(e.args)&&e.args.length===ops[e.op],"Invalid expression operator");for(const a of e.args)walk(a,depth+1)}
 walk(expr,0);return true;
}
export function evaluate(expr,state,ctx={}){
 validateExpression(expr);
 function read(e){if(scalar(e))return e;
 if(e.ref){const id=ctx[e.card??"self"],o=state.objects[id];switch(e.ref){
 case "choice":return Object.hasOwn(ctx.choices??{},e.key)?ctx.choices[e.key]:false;
 case "attribute":return state.attributes?.[o?.definition]?.[e.key]??false;
 case "counter":return o?.counters?.[e.key]??0;
 case "status":return !!o?.statuses?.includes(e.key);
 case "damage":return o?.damage??0;
 case "resource":{const r=state.resourceRules?.[e.key];return r?state.resourcePools[r.scope==="shared"?"shared":"player-"+ctx.actor][e.key]:0}
 }}
 const a=e.args.map(read);if(["add","sub","mul","min","max","lt","lte"].includes(e.op))check(a.every(Number.isSafeInteger),"Numeric expression required");
 let n;switch(e.op){case "add":n=a[0]+a[1];break;case "sub":n=a[0]-a[1];break;case "mul":n=a[0]*a[1];break;case "min":n=Math.min(...a);break;case "max":n=Math.max(...a);break;case "eq":return a[0]===a[1];case "lt":return a[0]<a[1];case "lte":return a[0]<=a[1];case "and":return a.every(x=>x===true);case "or":return a.some(x=>x===true);case "not":return a[0]!==true}
 check(Number.isSafeInteger(n),"Expression overflow");return n}
 return read(expr);
}
