// Verify the retained rejection evidence. This is not a passing layout gate.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const actions=['initial','unicode-Z','unicode-中','unicode-𠀀','unicode-é','released','fallback-structural','restore-structural','fallback-resource','restore-resource','fallback-note','restore-note','middle','end','narrow','source','undo-original','redo','live'];
const rejectedActions=['source','undo-original','redo','live'];
const history=[[0,0],[1,0],[2,0],[3,0],[4,0],[4,0],[5,0],[4,1],[5,0],[4,1],[5,0],[4,1],[4,1],[4,1],[4,1],[4,1],[0,5],[4,1],[4,1]];
const files=[
  ['local-coverage-browser-rejected.json.gz','9a4ff2377f1d97bf795f57a8e6e41944016153f55004fb9e6575a62527cc0ce9'],
  ['local-coverage-browser-partial-normal.json.gz','ca786c21ce544c074e5db436b7cb29d839a99c52b7c787f8522c42498615f6ba'],
  ['local-coverage-browser-partial-reverse.json.gz','b99922012911f3de0713d3b0e0bc49c78b452c2260dd4a754630867fb6a4c720'],
];
const summaries=[];
for(const [name,hash] of files){
  const bytes=await readFile(new URL(name,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);
  const batch=JSON.parse(gunzipSync(bytes).toString('utf8'));
  assert.equal(batch.running,false);assert.equal(batch.progress.done,true);assert.equal(batch.comparatorUnchanged,true);
  const original=name===files[0][0];
  assert.deepEqual(batch.results.map(r=>[r.profile,r.reverse]),original?
    [['control',false],['control',true],['mounted',false],['mounted',true],['partial',false],['partial',true]]:
    [['partial',name.includes('reverse')]]);
  for(const record of batch.results){
    assert.equal(record.bytes,1048576);
    const timedOut=original&&record.profile==='partial'&&record.reverse;
    assert.deepEqual(record.checks.map(c=>c.action),timedOut?['initial']:actions);
    assert.equal(record.error,timedOut?'Error: Resource readiness deadline':undefined);
    for(const value of record.checks){
      const label=[name,record.profile,record.reverse,value.action].join('/');
      for(const field of ['sourceExact','selectionEqual','unchanged','decorationsEqual','widgetEqual','comparatorUnchanged'])assert.equal(value[field],true,label+': '+field);
      assert.deepEqual(value.differences,[],label);
      assert.deepEqual(value.history[0],value.history[1],label);
      const [undo,redo]=history[actions.indexOf(value.action)];assert.deepEqual(value.history[0],{undo,redo},label);
      assert.equal(value.geometryEqual,JSON.stringify(value.final[0].metrics)===JSON.stringify(value.final[1].metrics),label);
      if(timedOut){assert.equal(value.stable,false);assert.equal(value.frames,0);assert.equal(value.geometryEqual,true);continue}
      assert.equal(value.stable,true);assert.ok(value.frames>=8&&value.transitions>=4,label);
      assert.equal(value.samples.reduce((sum,s)=>sum+s.frames,0),value.frames,label);
      assert.ok(value.samples.at(-1).frames>=5,label);
      assert.deepEqual(value.samples.at(-1).observations,value.final,label);
      assert.equal(value.partialRetained,true,label);
      if(value.partial){
        assert.equal(value.immediate.cutoff,1024);assert.equal(value.immediate.complete,false);
        assert.equal(value.immediate.mode,'indexed');assert.equal(value.immediate.index,true);
        assert.equal(value.diagnostic.returnedIndex,true);
        for(const sample of value.samples){const info=sample.observations[1].coverage;
          assert.equal(info.complete,false);assert.equal(info.mode,'indexed');assert.equal(info.index,true);assert.ok(info.body.length<info.length,label)}
      }
      if(value.action.startsWith('fallback-'))assert.equal(value.fallbackRejected,true,label);
      const rejected=record.profile==='partial'&&rejectedActions.includes(value.action);
      assert.equal(!!value.failure,rejected,label);
      assert.equal(value.geometryEqual,!rejected,label);
      if(rejected){
        assert.ok(value.final.every(v=>v.coverage.complete),label);
        if(value.action!=='live')assert.ok(Math.abs(value.final[0].metrics.height-value.final[1].metrics.height)>138000,label);
        if(!original){assert.deepEqual(value.attribution[0].font,value.attribution[1].font,label);
          assert.deepEqual(value.attribution[0].oracle,value.attribution[1].oracle,label);
          assert.notDeepEqual(value.attribution[0].map,value.attribution[1].map,label);
          assert.equal(value.lastFrame.visibility,'visible');assert.equal(value.lastFrame.ok,true)}
      }
    }
  }
  summaries.push({name,cases:batch.results.length,checks:batch.results.reduce((sum,r)=>sum+r.checks.length,0),
    failures:batch.results.flatMap(r=>r.checks.filter(c=>c.failure).map(c=>({profile:r.profile,reverse:r.reverse,action:c.action}))),errors:batch.results.filter(r=>r.error).length});
}
console.log(JSON.stringify({status:'rejected',evidenceVerified:true,reports:summaries,scope:'Partial indexed edits pass; Source/Live height agreement fails. No timing or production adoption.'},null,2));
