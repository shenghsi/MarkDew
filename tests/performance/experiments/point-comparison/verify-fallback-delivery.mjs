// Verify factor isolation and retained rejection evidence, not adoption.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const files=[
  ['combined','normal','9d352886a88ad7c16cb3109c0abf29b463432f99f455356948be2e11c149a5b1'],
  ['static','normal','56161cc045ae909d8e107f84444dab35656d0bdce69fdbaa166abca22c826033'],
  ['combined','reverse','c3cc3fa61f6f17f7853a10e6ac0200e2390f4599e05d7ee0d746f0377f090cf4'],
  ['static','reverse','8d5920dcfc3b0a7d2fd357ec17da25c8c751b79546e83a76cc5e9f19d12d1da9'],
];
const actions=['initial','unicode-Z','unicode-中','unicode-𠀀','unicode-é','released','fallback-structural','restore-structural','fallback-resource','restore-resource','fallback-note','restore-note','middle','end','narrow','source','undo-original','redo','live'];
const failed=['source','undo-original','redo','live'];
const depths=[[0,0],[1,0],[2,0],[3,0],[4,0],[4,0],[5,0],[4,1],[5,0],[4,1],[5,0],[4,1],[4,1],[4,1],[4,1],[4,1],[0,5],[4,1],[4,1]];
const records=new Map();
const sum=values=>values.reduce((a,b)=>a+b,0);
// public-spans-v1 is defined in fallback-delivery.html and README.md.
function signature(value){assert.match(value.sha256,/^[a-f0-9]{64}$/);assert.ok(value.events>0);assert.ok(value.length>=1048555);
  assert.ok(value.counts.every(size=>Number.isInteger(size)&&size>=0));}
function matchingStreams(a,b){assert.equal(a.sha256,b.sha256);assert.equal(a.events,b.events);assert.equal(a.length,b.length);assert.equal(sum(a.counts),sum(b.counts));}
for(const [delivery,order,hash] of files){
  const name=`fallback-delivery-${delivery}-${order}.json.gz`,bytes=await readFile(new URL(name,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,name);
  const batch=JSON.parse(gunzipSync(bytes));
  assert.equal(batch.running,false);assert.equal(batch.progress.done,true);assert.equal(batch.comparatorUnchanged,true);assert.equal(batch.delivery,delivery);
  assert.equal(batch.results.length,1);const r=batch.results[0];records.set(delivery+'/'+order,r);
  assert.equal(r.delivery,delivery);assert.equal(r.profile,'partial');assert.equal(r.reverse,order==='reverse');assert.equal(r.bytes,1048576);assert.equal(r.error,undefined);
  assert.deepEqual(r.checks.map(c=>c.action),actions);
  for(const [i,c] of r.checks.entries()){
    const label=name+'/'+c.action;
    for(const key of ['sourceExact','selectionEqual','unchanged','decorationsEqual','streamsEqual','widgetEqual','partialRetained','comparatorUnchanged','resourcesReady','stable'])assert.equal(c[key],true,label+'/'+key);
    assert.deepEqual(c.differences,[]);assert.equal(c.deliveryStreams.length,2);c.deliveryStreams.forEach(signature);matchingStreams(...c.deliveryStreams);
    assert.deepEqual(c.history,[{undo:depths[i][0],redo:depths[i][1]},{undo:depths[i][0],redo:depths[i][1]}],label);
    assert.ok(c.frames>=8&&c.transitions>=4);assert.equal(sum(c.samples.map(s=>s.frames)),c.frames);assert.ok(c.samples.at(-1).frames>=5);assert.deepEqual(c.samples.at(-1).observations,c.final);
    assert.equal(c.lastFrame.ok,true);assert.equal(c.lastFrame.visibility,'visible');
    const rejected=failed.includes(c.action);assert.equal(!!c.failure,rejected,label);assert.equal(c.geometryEqual,!rejected,label);
    assert.equal(c.geometryEqual,JSON.stringify(c.final[0].metrics)===JSON.stringify(c.final[1].metrics));
    assert.deepEqual(c.attribution[0].font,c.attribution[1].font);assert.deepEqual(c.attribution[0].oracle,c.attribution[1].oracle);
    const source=['source','undo-original','redo'].includes(c.action);
    assert.equal(c.deliveryStreams[1].counts.length,source?0:delivery==='combined'?1:2);
    if(rejected){assert.ok(c.final.every(v=>v.coverage.complete));assert.notDeepEqual(c.attribution[0].map,c.attribution[1].map);
      assert.equal(c.final[1].metrics.height-c.final[0].metrics.height,source?138480.796875:0.09375,label);}
    if(c.partial){assert.equal(c.immediate.cutoff,1024);assert.equal(c.immediate.complete,false);assert.equal(c.immediate.mode,'indexed');assert.equal(c.diagnostic.returnedIndex,true);
      for(const s of c.samples){const v=s.observations[1].coverage;assert.equal(v.complete,false);assert.equal(v.index,true);assert.equal(v.mode,'indexed');assert.equal(v.points,121566);}}
    if(c.fallbackTransition){assert.equal(c.fallbackRejected,true);assert.equal(c.diagnostic.returnedIndex,false);
      const {before,after}=c.fallbackTransition;for(const phase of [before,after])phase.streams.forEach(signature);
      assert.equal(before.coverage[1].complete,true);assert.equal(before.coverage[1].points,121566);
      assert.equal(after.coverage[1].complete,false);assert.equal(after.coverage[1].mode,'full');assert.equal(after.coverage[1].index,false);
      assert.equal(after.coverage[1].points,c.action==='fallback-note'?119:120);assert.equal(after.coverage[1].total,c.action==='fallback-note'?162:163);
      assert.notEqual(after.streams[0].sha256,after.streams[1].sha256);assert.ok(c.final.every(v=>v.coverage.complete));
      assert.equal(c.final[1].coverage.points,c.action==='fallback-note'?121565:121566);}
  }
}
for(const order of ['normal','reverse']){
  const [a,b]=['combined','static'].map(delivery=>records.get(delivery+'/'+order));
  for(const [i,c] of a.checks.entries()){const other=b.checks[i];
    c.deliveryStreams.forEach((stream,j)=>matchingStreams(stream,other.deliveryStreams[j]));
    assert.deepEqual(c.final.map(v=>v.metrics),other.final.map(v=>v.metrics));assert.deepEqual(c.attribution,other.attribution);
    if(c.fallbackTransition)for(const phase of ['before','after']){
      c.fallbackTransition[phase].streams.forEach((stream,j)=>matchingStreams(stream,other.fallbackTransition[phase].streams[j]));
      const selected=record=>record.fallbackTransition[phase].coverage.map(({tree,deliveredSets,...value})=>value);
      assert.deepEqual(selected(c),selected(other));}
  }
}
console.log(JSON.stringify({evidenceVerified:true,cases:records.size,checks:76,geometryFailures:16,
  sameFactorStreams:true,sameFactorGeometry:true,scope:'Both deliveries repeat the same fallback loss and height failures. Retention cause remains unproved; no timing or adoption.'},null,2));
