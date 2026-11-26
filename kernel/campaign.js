// Campaign encounters override a base module without changing its saved draft.
import {createMatch} from "./runtime.js";
const key=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(x)&&!Object.hasOwn(Object.prototype,x);
export function encounterModule(base,encounter){
 const m=structuredClone(base);delete m.campaign;
 for(const k of ["setup","resources","effects","triggers","victory","drawPolicies","combat","attachment","phases","timing","chain"])if(Object.hasOwn(encounter.overrides??{},k))m[k]=structuredClone(encounter.overrides[k]);
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
 return errors;
}
export function newCampaign(base){
 const errors=validateCampaign(base);if(errors.length)throw Error(errors.join("; "));
 return {version:1,id:base.campaign.id,index:0,wins:0,losses:0,complete:false};
}
export function recordEncounter(base,progress,index,result){
 if(progress.id!==base.campaign.id||progress.complete||index!==progress.index||(!result?.draw&&!base.players.includes(result?.winner)))throw Error("Invalid encounter result");
 const next={...progress};
 if(result.winner===base.campaign.player&&!result.draw){next.wins++;next.index++;next.complete=next.index===base.campaign.encounters.length}
 else next.losses++;
 return next;
}
export const progressKey=id=>"tcg-campaign-v1:"+id;
export function readProgress(base,storage=localStorage){
 const raw=storage.getItem(progressKey(base.campaign.id));if(!raw)return newCampaign(base);
 const p=JSON.parse(raw);
 if(p.version!==1||p.id!==base.campaign.id||!Number.isSafeInteger(p.index)||p.index<0||p.index>base.campaign.encounters.length||p.complete!==(p.index===base.campaign.encounters.length)||p.wins!==p.index||!Number.isSafeInteger(p.losses)||p.losses<0)throw Error("Invalid campaign save");
 return p;
}
export function saveProgress(progress,storage=localStorage){storage.setItem(progressKey(progress.id),JSON.stringify(progress))}
