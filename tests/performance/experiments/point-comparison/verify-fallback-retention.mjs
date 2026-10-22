// Retention is a stale causal control. Verify its rejection, not adoption.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const files=[
  ['drop','normal','5ffc2e74ab127bbac98540b5fd8e7f4576e743504d92789e5cc0ceead8e4b4ae'],
  ['map','normal','0d2ca6aa8a3526cbe673acb31fed8420ed50b2a8f7920a85751112a2233f5aad'],
  ['drop','reverse','fb054ced1a1be6567fc017f80349cecc0bd16d8c600f2202361f2e05bca8608b'],
  ['map','reverse','320b4d153540a467cdbd43b46994d904c6691fbf6947bc65001382aa5a97bfc9'],
];
const rejected=[
  ['hidden','1278d1e9ba11985d77e5e01042fcec7ac807a1a7c040b7713e7e40057fa45385',6],
  ['sequence','bb632f67c453e0f82d015286cdd83f41baba176edbc616e35d30bd5c24cf9605',16],
  ['visibility','cd9a0f0eb37c28d430723abfb7e6a333f284b4a14fcc5234eda2e7887a7f414a',16],
];
const actions=['initial','unicode-Z','unicode-中','unicode-𠀀','unicode-é','released','fallback-structural','restore-structural','fallback-resource','restore-resource','fallback-note','restore-note','middle','end','narrow','source','undo-original','redo','live'];
const depths=[[0,0],[1,0],[2,0],[3,0],[4,0],[4,0],[5,0],[4,1],[5,0],[4,1],[5,0],[4,1],[4,1],[4,1],[4,1],[4,1],[0,5],[4,1],[4,1]];
const records=new Map();
async function read(name,hash){const bytes=await readFile(new URL(name,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,name);
  const batch=JSON.parse(gunzipSync(bytes));assert.equal(batch.running,false);assert.equal(batch.progress.done,true);assert.equal(batch.comparatorUnchanged,true);assert.equal(batch.results.length,1);return batch;}
function signature(s){assert.match(s.sha256,/^[a-f0-9]{64}$/);assert.ok(s.events>0);assert.ok(s.length>=1048555);assert.ok(s.counts.every(n=>Number.isInteger(n)&&n>=0));}
function same(a,b){assert.equal(a.sha256,b.sha256);assert.equal(a.events,b.events);assert.equal(a.length,b.length);assert.deepEqual(a.counts,b.counts);}
for(const [retention,order,hash] of files){
  const name=`fallback-retention-${retention}-${order}.json.gz`,batch=await read(name,hash),r=batch.results[0];records.set(retention+'/'+order,r);
  assert.equal(batch.retention,retention);assert.equal(batch.delivery,'combined');assert.equal(r.retention,retention);assert.equal(r.delivery,'combined');
  assert.equal(r.profile,'partial');assert.equal(r.reverse,order==='reverse');assert.equal(r.bytes,1048576);assert.equal(r.error,undefined);assert.deepEqual(r.checks.map(c=>c.action),actions);
  assert.ok(batch.visibility.length>0);assert.ok(batch.visibility.every(v=>v.state==='visible'));
  for(const [i,c] of r.checks.entries()){
    const label=name+'/'+c.action;
    for(const key of ['sourceExact','selectionEqual','unchanged','decorationsEqual','streamsEqual','widgetEqual','partialRetained','comparatorUnchanged','resourcesReady','stable'])assert.equal(c[key],true,label+'/'+key);
    assert.deepEqual(c.differences,[]);assert.deepEqual(c.history,[{undo:depths[i][0],redo:depths[i][1]},{undo:depths[i][0],redo:depths[i][1]}]);
    assert.equal(c.deliveryStreams.length,2);c.deliveryStreams.forEach(signature);same(...c.deliveryStreams);assert.equal(c.deliveryStreams[1].firstDifference,undefined);
    assert.ok(c.frames>=8&&c.transitions>=4);assert.equal(c.samples.reduce((sum,s)=>sum+s.frames,0),c.frames);assert.ok(c.samples.at(-1).frames>=5);assert.deepEqual(c.samples.at(-1).observations,c.final);
    assert.equal(c.lastFrame.ok,true);assert.equal(c.lastFrame.visibility,'visible');assert.deepEqual(c.attribution[0].font,c.attribution[1].font);assert.deepEqual(c.attribution[0].oracle,c.attribution[1].oracle);
    const source=['source','undo-original','redo'].includes(c.action),failure=source||(retention==='drop'&&c.action==='live');
    assert.equal(!!c.failure,failure,label);assert.equal(c.geometryEqual,!failure,label);assert.equal(c.geometryEqual,JSON.stringify(c.final[0].metrics)===JSON.stringify(c.final[1].metrics));
    assert.equal(c.lineEqual,c.action!=='source',label);
    const expected=source?(retention==='map'?224.515625:138480.796875):(retention==='drop'&&c.action==='live'?0.09375:0);
    assert.equal(c.final[1].metrics.height-c.final[0].metrics.height,expected,label);
    if(failure){assert.ok(c.final.every(v=>v.coverage.complete));assert.notDeepEqual(c.attribution[0].map,c.attribution[1].map);}
    if(c.partial){assert.equal(c.immediate.complete,false);assert.equal(c.immediate.mode,'indexed');assert.equal(c.immediate.cutoff,1024);assert.equal(c.diagnostic.returnedIndex,true);
      for(const s of c.samples){const v=s.observations[1].coverage;assert.equal(v.complete,false);assert.equal(v.mode,'indexed');assert.equal(v.index,true);assert.equal(v.points,121566);assert.equal(v.retained,false);assert.equal(v.retentionStarts,0);}}
    if(c.fallbackTransition){assert.equal(c.fallbackRejected,true);assert.equal(c.diagnostic.returnedIndex,false);const {before,after}=c.fallbackTransition;
      before.streams.forEach(signature);after.streams.forEach(signature);same(...before.streams);
      const note=c.action==='fallback-note',ordinal=note?3:c.action==='fallback-resource'?2:1,v=after.coverage[1],end=c.final[1].coverage;
      assert.equal(v.complete,false);assert.equal(v.mode,'full');assert.equal(v.index,false);assert.equal(v.retained,retention==='map');assert.ok(end.complete);assert.equal(end.retained,false);
      assert.equal(v.points,retention==='map'?(note?121565:121566):(note?119:120));
      assert.equal(v.total,retention==='map'?(note?167151:167152):(note?162:163));
      if(retention==='map'){assert.equal(v.retentionStarts,ordinal);assert.equal(v.retentionEnds,ordinal-1);assert.equal(end.retentionStarts,ordinal);assert.equal(end.retentionEnds,ordinal);
        assert.deepEqual(v.certificate,{length:1048561,mappedEdits:1});assert.deepEqual(end.certificate,{length:end.length,mappedEdits:0});}
      const equal=retention==='map'&&note;assert.equal(after.streams[0].sha256===after.streams[1].sha256,equal);
      if(!equal){const d=after.streams[1].firstDifference;assert.ok(Number.isInteger(d.index));assert.notDeepEqual(d.baseline,d.candidate);}
    }
  }
}
for(const retention of ['drop','map']){
  const a=records.get(retention+'/normal'),b=records.get(retention+'/reverse');
  a.checks.forEach((c,i)=>{const other=b.checks[i];c.deliveryStreams.forEach((s,j)=>same(s,other.deliveryStreams[j]));assert.deepEqual(c.final.map(v=>v.metrics),other.final.map(v=>v.metrics));assert.deepEqual(c.attribution,other.attribution);
    if(c.fallbackTransition)for(const phase of ['before','after'])c.fallbackTransition[phase].streams.forEach((s,j)=>same(s,other.fallbackTransition[phase].streams[j]));});
}
for(const order of ['normal','reverse']){
  const a=records.get('drop/'+order),b=records.get('map/'+order);
  a.checks.forEach((c,i)=>{c.deliveryStreams.forEach((s,j)=>same(s,b.checks[i].deliveryStreams[j]));
    if(c.partial)assert.deepEqual(c.final.map(v=>v.metrics),b.checks[i].final.map(v=>v.metrics));
    if(c.fallbackTransition)c.fallbackTransition.before.streams.forEach((s,j)=>same(s,b.checks[i].fallbackTransition.before.streams[j]));});
}
for(const [kind,hash,count] of rejected){const batch=await read(`fallback-retention-map-normal-${kind}-rejected.json.gz`,hash),r=batch.results[0];assert.equal(r.checks.length,count);assert.equal(r.bytes,1048576);
  if(kind==='hidden'){assert.equal(r.error,'Error: Resource readiness deadline');assert.equal(r.errorDetails.lastFrame.visibility,'hidden');assert.equal(r.errorDetails.lastFrame.ok,false);}
  else{assert.equal(r.error,undefined);assert.equal(r.checks[0].stable,false);assert.equal(r.checks[0].lastFrame.visibility,'hidden');assert.equal(r.checks[1].partialRetained,false);}
}
console.log(JSON.stringify({evidenceVerified:true,validCases:4,validActions:76,retainedRejectedRuns:3,
  controlSourceDelta:138480.796875,retentionSourceDelta:224.515625,retentionLiveDelta:0,
  scope:'Retention is associated with a smaller height error, but Source/Undo/Redo still fail. Stale transient display; no timing or adoption.'},null,2));
