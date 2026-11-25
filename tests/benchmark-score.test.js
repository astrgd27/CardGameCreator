import test from 'node:test';
import assert from 'node:assert/strict';
import {benchmarks,catalogVersion} from '../benchmarks.js';
import {summarize} from '../scripts/benchmark-score.mjs';
const catalog=[{id:'a',game:'A',category:'rules'},{id:'b',game:'A',category:'rules'},{id:'c',game:'B',category:'logic'}];
const pass={status:'pass',layer:'advanced',fixture:'fixture',steps:'steps',expected:'expected',actual:'actual',commit:'commit',date:'2026-11-25',evidence:'evidence',roundTrip:true,verified:true};
test('catalog has 60 unique cases across five games',()=>{
 const r=summarize(benchmarks,catalogVersion,{catalogVersion,cases:{}});
 assert.equal(r.caseCount,60);assert.equal(new Set(r.cases.map(c=>c.game)).size,5);
 assert.equal(r.groups.length,15);assert.ok(r.groups.every(g=>g.pending===g.total&&g.all===0));
});
test('coverage keeps pending cases in denominator and counts script only in all-layer score',()=>{
 const r=summarize(catalog,'1',{catalogVersion:'1',cases:{a:pass,b:{...pass,layer:'script'}}});
 assert.equal(r.groups[0].visualPercent,50);assert.equal(r.groups[0].allPercent,100);
 assert.equal(r.groups[1].pending,1);assert.equal(r.groups[1].allTargetMet,false);
});
test('rejects version drift, unknown IDs, incomplete passes and unreviewed exclusions',()=>{
 for(const e of [{catalogVersion:'2',cases:{}},{catalogVersion:'1',cases:{z:pass}},{catalogVersion:'1',cases:{a:{status:'pass',layer:'basic'}}},{catalogVersion:'1',cases:{a:{status:'na'}}}])assert.throws(()=>summarize(catalog,'1',e));
});
