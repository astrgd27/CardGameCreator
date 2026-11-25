import {readFileSync} from 'node:fs';
import {benchmarks,catalogVersion} from '../benchmarks.js';
import {summarize} from './benchmark-score.mjs';
const evidence=JSON.parse(readFileSync(new URL('../benchmarks/evidence.json',import.meta.url),'utf8'));
const report=summarize(benchmarks,catalogVersion,evidence);
console.log(JSON.stringify(report,null,2));
