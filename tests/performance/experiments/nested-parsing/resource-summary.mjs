import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const folder=process.argv[2],orders=['baseline-first','candidate-first','candidate-repeat','baseline-repeat'];
const rows=[];let checks=0;
for(const resource of ['code','html']){
  const runs=orders.map(order=>readFileSync(join(folder,`resource-${resource}-${order}.log`),'utf8')
    .split('\n').filter(line=>line.startsWith('{"benchmark":"growing-preview-state"')).map(JSON.parse));
  for(const run of runs){
    const keys=new Set(run.map(sample=>`${sample.bytes}|${sample.note}|${sample.location}`));
    if(run.length!==20||keys.size!==20)throw new Error(`Missing or repeated ${resource} routes`);
    for(const bytes of [102400,1048576])for(const note of [false,true])
      for(const location of ['start','middle','end','resource-start','resource-end'])
        if(!keys.has(`${bytes}|${note}|${location}`))throw new Error('Missing expected route');
  }
  for(let index=0;index<20;index++){
    const samples=runs.map(run=>run[index]),first=samples[0];
    const identity=sample=>JSON.stringify([sample.bytes,sample.initialUnits,sample.resource,sample.resourcePositions,sample.note,sample.location]);
    for(let side=0;side<samples.length;side++){
      const sample=samples[side];
      if(identity(sample)!==identity(first)||sample.resource!==resource||sample.samples!==20||sample.timings.length!==20||sample.indexed+sample.full!==20)
        throw new Error(`Mismatched ${resource} route ${index}`);
      const expected=orders[side].startsWith('baseline')?'yaml-wrapper':'guarded-nesting-yaml-wrapper';
      if(sample.language!==expected)throw new Error('Wrong parser label');
      checks+=sample.samples;
    }
    rows.push({resource,bytes:first.bytes,initialUnits:first.initialUnits,note:first.note,edit:first.location,
      runs:Object.fromEntries(samples.map((sample,index)=>[orders[index],{median:sample.median,p95:sample.p95,indexed:sample.indexed,full:sample.full}]))});
  }
}
console.log(JSON.stringify({scope:'unprofiled growing resource edit state transactions and dirty comparison; no DOM, native input, or frames',
  resourcesPerDocument:'three composite resource groups at start, middle, and end',orders,checks,rows},null,2));
