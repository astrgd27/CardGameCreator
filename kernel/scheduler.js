// Optional turn policies. A handoff is deferred until all queued decisions resolve.
export function idle(m){return !m.pending&&!m.battle&&!m.triggerOrderPending&&!m.openingQueue?.length&&!m.timing.queue.length&&!m.timing.resolving}
export function scheduleState(m){return m.scheduler??={initiative:null,passed:[],extra:{},skip:{},handoff:false}}
export function nextSeat(m,actor){
 const s=scheduleState(m),players=m.timing.players;
 if(s.extra[actor]>0){s.extra[actor]--;return actor}
 let next=(players.includes(s.initiative)?s.initiative:null)??players[(players.indexOf(actor)+1)%players.length];s.initiative=null;
 for(let i=0;i<players.length*101;i++){if(!(s.skip[next]>0))return next;s.skip[next]--;next=players[(players.indexOf(next)+1)%players.length]}
 throw Error("Skipped turn budget exceeded");
}
export function triggerGroups(m,ids){
 const players=m.timing.players,at=players.indexOf(m.timing.active),order=[...players.slice(at),...players.slice(0,at)];
 const groups=order.map(actor=>({actor,ids:ids.filter(id=>m.timing.queue.some(q=>q.id===id&&q.actor===actor))})).filter(g=>g.ids.length);
 // Queue order is APNAP for LIFO; reverse seat groups for FIFO to preserve resolution order.
 const ordered=m.timing.order==="fifo"?[...groups].reverse():groups;
 const entries=m.timing.queue.filter(q=>ids.includes(q.id));m.timing.queue=m.timing.queue.filter(q=>!ids.includes(q.id)).concat(ordered.flatMap(g=>g.ids.map(id=>entries.find(q=>q.id===id))));
 m.triggerOrderPending=groups.find(g=>g.ids.length>1)??null;m.triggerOrderRemaining=groups.filter(g=>g.ids.length>1).slice(1);
}
export function scheduleView(m,viewer){
 const p=m.rules.scheduler;if(!p)return null;const s=m.scheduler??{initiative:null,passed:[]};
 return {mode:p.mode??"round",initiative:s.initiative,passed:[...s.passed],gauge:p.gauge?m.state.resourcePools.shared[p.gauge.resource]:null,window:m.timing.queue.length?(p.responseWindow??"response"):(m.rules.phases?.[m.phaseIndex]?.window??"main"),canClaim:!!p.initiative&&idle(m)&&m.timing.active===viewer&&m.timing.priority===viewer&&!s.initiative&&!s.passed.includes(viewer),canPassOut:p.mode==="alternate"&&idle(m)&&m.timing.active===viewer&&m.timing.priority===viewer&&!s.passed.includes(viewer)};
}
