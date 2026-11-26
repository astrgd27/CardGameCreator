// Isolated rules kernel: deterministic card instances and ordered zones.
// This is an internal primitive, not a player-facing action/authorization API.
const own=(obj,key)=>Object.hasOwn(obj,key);
const key=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(x)&&!own(Object.prototype,x);
const fail=message=>{throw new Error(message)};
const lookup=(obj,id,kind)=>key(id)&&own(obj,id)?obj[id]:fail("Unknown "+kind+": "+id);

export function createState({players,definitions,zones}){
  if(!Array.isArray(players)||!players.length||!players.every(key)||new Set(players).size!==players.length)fail("Invalid players");
  if(!Array.isArray(definitions)||!definitions.every(key)||new Set(definitions).size!==definitions.length)fail("Invalid definitions");
  if(!Array.isArray(zones)||!zones.length)fail("No zones");
  const state={version:1,players:[...players],definitions:[...definitions],nextId:1,zones:{},objects:{}};
  for(const z of zones){
    if(!z||!key(z.id)||own(state.zones,z.id)||!(z.owner===null||players.includes(z.owner))||
      !["public","owner","hidden"].includes(z.visibility)||(z.visibility==="owner"&&z.owner===null)||
      !Number.isSafeInteger(z.capacity)||z.capacity<0)fail("Invalid zone");
    state.zones[z.id]={id:z.id,owner:z.owner,visibility:z.visibility,capacity:z.capacity,cards:[]};
  }
  return state;
}

function assertPlayer(s,p){if(!s.players.includes(p))fail("Unknown player")}
function assertPosition(i,n){if(!Number.isSafeInteger(i)||i<0||i>n)fail("Invalid insertion position")}
function assertFace(face){if(!["up","down"].includes(face))fail("Invalid face")}
function locate(s,id){
  lookup(s.objects,id,"object");
  const matches=Object.values(s.zones).filter(z=>z.cards.includes(id));
  if(matches.length!==1)fail("Invalid zone membership: "+id);
  return matches[0];
}
function assertSpace(z){if(z.cards.length>=z.capacity)fail("Zone is full: "+z.id)}

export function addCard(state,{definition,owner,controller=owner,zone,face="up",position}){
  if(!state.definitions.includes(definition))fail("Unknown definition");
  assertPlayer(state,owner);assertPlayer(state,controller);assertFace(face);
  const z=lookup(state.zones,zone,"zone");assertSpace(z);
  const at=position??z.cards.length;assertPosition(at,z.cards.length);
  if(!Number.isSafeInteger(state.nextId)||state.nextId<1||state.nextId>=Number.MAX_SAFE_INTEGER)fail("Object ID exhausted");
  const id="c"+state.nextId;if(own(state.objects,id))fail("Duplicate object ID");
  const next=structuredClone(state);
  next.nextId++;
  next.objects[id]={id,definition,owner,controller,face,orientation:"ready",damage:0,counters:{}};
  next.zones[zone].cards.splice(at,0,id);
  return {state:next,id};
}

// Explicit transition semantics: preserve instance state unless requested otherwise.
// A same-zone movement uses the destination position AFTER removing the object.
export function moveCard(state,{id,from,to,position,face,controller,reset=false}){
  const object=lookup(state.objects,id,"object");
  const src=locate(state,id),dst=lookup(state.zones,to,"zone");
  if(src.id!==from)fail("Card is not in source zone");
  if(src!==dst)assertSpace(dst);
  const length=dst.cards.length-(src===dst?1:0),at=position??length;
  assertPosition(at,length);
  if(face!==undefined)assertFace(face);
  if(controller!==undefined)assertPlayer(state,controller);
  if(typeof reset!=="boolean")fail("Invalid reset policy");
  const next=structuredClone(state),o=next.objects[id];
  next.zones[from].cards.splice(src.cards.indexOf(id),1);
  next.zones[to].cards.splice(at,0,id);
  if(reset){o.orientation="ready";o.damage=0;o.counters={};o.controller=object.owner;}
  if(face!==undefined)o.face=face;
  if(controller!==undefined)o.controller=controller;
  return {state:next,event:{type:"cardMoved",id,from,to,position:at}};
}

// Hidden zones and concealed cards disclose no definition IDs, instance IDs,
// characteristics or order. Count-only concealment is intentionally conservative.
export function projectState(state,viewer){
  assertPlayer(state,viewer);
  const zones=Object.values(state.zones).map(z=>{
    const result={id:z.id,owner:z.owner,visibility:z.visibility,capacity:z.capacity,count:z.cards.length};
    if(z.visibility==="hidden"||(z.visibility==="owner"&&z.owner!==viewer))return result;
    result.cards=z.cards.map(id=>{
      const o=lookup(state.objects,id,"object");
      if(o.face==="down"&&o.owner!==viewer)return {face:"down"};
      return structuredClone(o);
    });
    return result;
  });
  return {version:state.version,players:[...state.players],zones};
}

export function assertInvariants(state){
  const seen=new Set();
  for(const z of Object.values(state.zones)){
    if(z.cards.length>z.capacity)fail("Zone exceeds capacity");
    for(const id of z.cards){
      if(seen.has(id))fail("Duplicate zone membership: "+id);
      seen.add(id);const o=lookup(state.objects,id,"object");
      if(o.id!==id||!state.definitions.includes(o.definition))fail("Invalid object");
      assertPlayer(state,o.owner);assertPlayer(state,o.controller);assertFace(o.face);
    }
  }
  if(seen.size!==Object.keys(state.objects).length)fail("Unplaced objects");
  for(const o of Object.values(state.objects))for(const c of o.components??[]){if(!key(c.id)||seen.has(c.id)||!state.definitions.includes(c.definition)||!state.definitions.includes(c.physicalDefinition)||!state.players.includes(c.owner))fail("Invalid stack component");seen.add(c.id)}
  return true;
}
