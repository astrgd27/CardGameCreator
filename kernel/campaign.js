// Ordered or branching encounters, with persistent card rewards.
import {createMatch} from "./runtime.js";
const key=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(x)&&!Object.hasOwn(Object.prototype,x);
const count=x=>Number.isSafeInteger(x)&&x>=0;
export function encounterModule(base,encounter,progress){
 const m=structuredClone(base);delete m.campaign;
 for(const k of ["setup","resources","effects","triggers","victory","drawPolicies","combat","attachment","phases","timing","chain"])if(Object.hasOwn(encounter.overrides??{},k))m[k]=structuredClone(encounter.overrides[k]);
 if(progress?.rewards?.length){
  const zone=encounter.rewardZone??base.campaign.rewardZone;
  if(!m.zones.some(z=>z.id===zone&&z.owner===base.campaign.player))throw Error("Reward destination unavailable");
  m.setup??=[];
  for(const r of progress.rewards)for(let i=0;i<r.count;i++)m.setup.push({definition:r.definition,owner:base.campaign.player,zone,face:"down"});
 }
 return m;
}
export function validateCampaign(base){
 const c=base.campaign,errors=[];
 if(!c||!key(c.id)||!Array.isArray(c.encounters)||!c.encounters.length||c.encounters.length>100)return ["Invalid campaign ID or encounters"];
 if(!base.players.includes(c.player)||base.players.length!==2)errors.push("Campaign requires two players and a valid human seat");
 const ids=new Set();
 for(const e of c.encounters){
  if(!e||!key(e.id)||ids.has(e.id)||typeof e.name!=="string"||!e.name.trim()){errors.push("Invalid encounter");continue}
  ids.add(e.id);
  try{const m=encounterModule(base,e);if(!m.victory?.length)throw Error("Victory conditions required");createMatch(m)}catch(err){errors.push(e.id+": "+err.message)}
 }
 for(const [i,e] of c.encounters.entries()){
  if(!e)continue;
  if(e.routes!==undefined&&(!Array.isArray(e.routes)||e.routes.length>20||e.routes.some(r=>!r||!key(r.to)||!ids.has(r.to)||c.encounters.findIndex(x=>x.id===r.to)<=i||typeof r.label!=="string"||!r.label.trim())||new Set(e.routes.map(r=>r.to)).size!==e.routes.length))errors.push(e.id+": invalid forward routes");
  if(e.rewards!==undefined&&(!Array.isArray(e.rewards)||e.rewards.length>20||e.rewards.some(r=>!r||!base.definitions.includes(r.definition)||!count(r.count)||r.count<1||r.count>20)))errors.push(e.id+": invalid rewards");
 }
 if(c.encounters.some(e=>e?.rewards?.length)&&!base.zones.some(z=>z.id===c.rewardZone&&z.owner===c.player&&z.visibility==="hidden"))errors.push("Rewards require a player-owned hidden deck zone");
 return errors;
}
export function newCampaign(base){
 const errors=validateCampaign(base);if(errors.length)throw Error(errors.join("; "));
 return {version:2,id:base.campaign.id,index:0,wins:0,losses:0,complete:false,rewards:[],visited:[]};
}
export function nextRoutes(base,index){
 const e=base.campaign.encounters[index];
 return e.routes??(index+1<base.campaign.encounters.length?[{to:base.campaign.encounters[index+1].id,label:"Continue campaign"}]:[]);
}
export function recordEncounter(base,progress,index,result,route){
 if(progress.id!==base.campaign.id||progress.complete||index!==progress.index||(!result?.draw&&!base.players.includes(result?.winner)))throw Error("Invalid encounter result");
 const next=structuredClone(progress);
 if(result.winner===base.campaign.player&&!result.draw){
  const routes=nextRoutes(base,index),selected=route??(routes.length===1?routes[0].to:undefined);
  if(routes.length&&!routes.some(r=>r.to===selected))throw Error("Choose a valid route");
  if(!routes.length&&route!==undefined)throw Error("No route available");
  next.wins++;next.visited.push(base.campaign.encounters[index].id);
  for(const r of base.campaign.encounters[index].rewards??[]){const old=next.rewards.find(x=>x.definition===r.definition);if(old)old.count+=r.count;else next.rewards.push({...r})}
  next.index=routes.length?base.campaign.encounters.findIndex(e=>e.id===selected):base.campaign.encounters.length;
  next.complete=!routes.length;
  if(!next.complete)createMatch(encounterModule(base,base.campaign.encounters[next.index],next));
 }else next.losses++;
 return next;
}
export const progressKey=id=>"tcg-campaign-v1:"+id;
export function readProgress(base,storage=localStorage){
 const raw=storage.getItem(progressKey(base.campaign.id));if(!raw)return newCampaign(base);
 let p=JSON.parse(raw);
 if(p.version===1)p={...p,version:2,rewards:[],visited:base.campaign.encounters.slice(0,p.index).map(e=>e.id)};
 if(p.version!==2||p.id!==base.campaign.id||!count(p.index)||p.index>base.campaign.encounters.length||p.complete!==(p.index===base.campaign.encounters.length)||!count(p.wins)||!count(p.losses)||!Array.isArray(p.visited)||p.visited.length!==p.wins||new Set(p.visited).size!==p.visited.length||p.visited.some(id=>!base.campaign.encounters.some(e=>e.id===id))||!Array.isArray(p.rewards)||p.rewards.some(r=>!r||!base.definitions.includes(r.definition)||!count(r.count)||r.count<1||r.count>1000))throw Error("Invalid campaign save");
 return p;
}
export function saveProgress(progress,storage=localStorage){storage.setItem(progressKey(progress.id),JSON.stringify(progress))}
