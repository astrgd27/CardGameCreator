// Objective scoring and multiplayer elimination at stable transaction boundaries.

import {evaluateVictory} from "./combat.js";
export const teamOf=(m,p)=>m.rules.multiplayer?.teams?.[p]??p;
export function initObjectives(m){if(!m.rules.objectives&&!m.rules.multiplayer)return;m.objectives={scores:Object.fromEntries(m.state.players.map(p=>[p,0])),captures:{},eliminated:[]}}
export function scoreObjectives(m,events){
 const o=m.objectives;if(!o)return [];
 const policy=m.rules.objectives??{};o.scored??={};const award=(actor,amount,zone,hold=false)=>{const key=JSON.stringify([actor,zone]);if(policy.oncePerTurn&&zone&&o.scored[key]===m.turn)return;if(zone)o.scored[key]=m.turn;const cap=policy.finalPointHoldOnly&&!hold?policy.winScore-1:Number.MAX_SAFE_INTEGER;const before=o.scores[actor];o.scores[actor]=Math.max(before,Math.min(cap,before+amount));if(o.scores[actor]>before)out.push({type:"objectiveScored",actor,amount:o.scores[actor]-before,zone})};
 const out=[],control=(m.state.spatial?.slots??[]).map(x=>{const seats=m.state.zones[x.zone].cards.filter(id=>m.state.objects[id].face==="up"&&!Object.hasOwn(m.state.attachments??{},id)).map(id=>m.state.objects[id].controller).filter(p=>!o.eliminated.includes(p));const teams=new Set(seats.map(p=>teamOf(m,p)));return {zone:x.zone,controller:teams.size===1?(seats.includes(o.captures[x.zone])?o.captures[x.zone]:seats[0]):null}});
 for(const r of m.rules.objectives?.locations??[]){
  const c=control.find(x=>x.zone===r.zone);if(!c)continue;
  const previous=o.captures[r.zone]??null,now=c.controller&&!o.eliminated.includes(c.controller)?c.controller:null;
  const next=now??(r.persistent&&!o.eliminated.includes(previous)?previous:null);
  if(next!==previous){o.captures[r.zone]=next;out.push({type:"objectiveCaptured",zone:r.zone,actor:next??"none"});if(next&&r.capturePoints&&(!previous||teamOf(m,previous)!==teamOf(m,next))){award(next,r.capturePoints,r.zone)}}
  if(next&&r.holdPoints&&events.some(e=>e.type==="turnStarted"&&e.actor===next)){award(next,r.holdPoints,r.zone,true)}
 }
 for(const e of events)if(e.type==="scoreAwarded"&&!o.eliminated.includes(e.actor)){award(e.actor,e.amount,e.zone)}
 return out;
}
export function adjudicate(m){
 const o=m.objectives;if(!o)return [];
 const events=[],losses=new Set([...(m.state.ruleLosses??[]),...(m.rules.victory?.length?evaluateVictory(m.state,m.rules.victory).losers:[])]);
 for(const p of losses)if(!o.eliminated.includes(p)){o.eliminated.push(p);events.push({type:"playerEliminated",actor:p})}
 const live=m.state.players.filter(p=>!o.eliminated.includes(p)),teams=[...new Set(live.map(p=>teamOf(m,p)))];
 const totals=Object.fromEntries(teams.map(t=>[t,live.filter(p=>teamOf(m,p)===t).reduce((n,p)=>n+o.scores[p],0)]));
 const threshold=m.rules.objectives?.winScore;
 let winners=threshold===undefined?[]:teams.filter(t=>totals[t]>=threshold);
 if(winners.length>1&&m.rules.objectives?.tie==="highest"){const max=Math.max(...winners.map(t=>totals[t]));winners=winners.filter(t=>totals[t]===max)}
 if(!winners.length&&teams.length<=1&&o.eliminated.length)winners=teams;
 if(winners.length||!live.length){const seats=live.filter(p=>winners.includes(teamOf(m,p)));m.result={winner:winners.length===1?seats[0]??null:null,winners:winners.length===1?seats:[],winningTeam:winners.length===1?winners[0]:null,draw:winners.length!==1,losers:m.state.players.filter(p=>!seats.includes(p)||winners.length!==1)};return events}
 if(events.length){const old=m.timing.players,active=m.timing.active;const next=live.includes(active)?active:Array.from({length:old.length},(_,i)=>old[(old.indexOf(active)+i+1)%old.length]).find(p=>live.includes(p));m.timing.players=old.filter(p=>live.includes(p));m.timing.active=next;m.timing.priority=next;m.timing.passes=0;m.windowClosed=false}
 return events;
}
export function objectiveView(m){return m.objectives?{...structuredClone(m.objectives),teams:Object.fromEntries(m.state.players.map(p=>[p,teamOf(m,p)]))}:null}
