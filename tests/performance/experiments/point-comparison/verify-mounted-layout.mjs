import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
const path=process.argv[2]||new URL('mounted-browser-controls.json.gz',import.meta.url);
const bytes=await readFile(path),batch=JSON.parse(bytes[0]===31&&bytes[1]===139?gunzipSync(bytes).toString('utf8'):bytes.toString('utf8'));
assert.equal(batch.running,false);assert.equal(batch.progress.done,true);assert.equal(batch.comparatorUnchanged,true);
assert.equal(batch.results.length,16);
const expectedMatrix=['notes','yaml-code','resources','large'].flatMap(fixture=>[true,false].flatMap(control=>[false,true].map(reverse=>[fixture,control,reverse].join('/')))).sort();
assert.deepEqual(batch.results.map(value=>[value.fixture,value.control,value.reverse].join('/')).sort(),expectedMatrix);
const actions=['initial','top','reverse-selection','list-return','undo-return','unicode','undo-unicode','redo-unicode','find','narrow','yaml-insert','undo-yaml','redo-yaml','undo-yaml-final','source','live','end'];
const history=[[0,0],[0,0],[0,0],[1,0],[0,1],[1,0],[0,1],[1,0],[1,0],[1,0],[2,0],[1,1],[2,0],[1,1],[1,1],[1,1],[1,1]];
let checks=0;
for(const record of batch.results){
  assert.equal(record.error,undefined,JSON.stringify({fixture:record.fixture,control:record.control,reverse:record.reverse,error:record.error}));
  assert.deepEqual(record.checks.map(value=>value.action),actions);
  for(const value of record.checks){
    checks++;const label=[record.fixture,record.control,record.reverse,value.action].join('/');
    assert.equal(value.failure,undefined,label);assert.ok(value.stable&&value.frames>=8&&value.transitions>=4,label);
    assert.equal(value.sampleEncoding,'consecutive-exact',label);
    assert.equal(value.samples.reduce((count,sample)=>count+sample.frames,0),value.frames,label);
    assert.ok(value.samples.at(-1).frames>=5,label);
    assert.ok(value.samples.every(sample=>Number.isInteger(sample.frames)&&sample.frames>0&&sample.observations.length===2),label);
    assert.equal(value.transitions,value.samples.at(-1).frames-1,label);
    const observations=value.samples.at(-1).observations;
    assert.deepEqual(observations[0].metrics,observations[1].metrics,label+': saved metrics');
    assert.deepEqual(observations[0].widgets,observations[1].widgets,label+': saved widgets');
    assert.deepEqual(value.widgets,observations.map(observation=>observation.widgets),label+': widget publication');
    const rightLines=new Map(observations[1].lines.map(line=>[line.from,line]));
    const shared=observations[0].lines.filter(line=>rightLines.has(line.from));
    assert.ok(shared.length>0,label+': saved shared lines');assert.equal(shared.length,value.lines,label);
    for(const line of shared)assert.deepEqual(line,rightLines.get(line.from),label+': saved line '+line.from);
    for(const field of ['sourceExact','sourceEqual','selectionEqual','unchangedByCheck','activityEqual','decorationsEqual','geometryEqual','lineEqual','widgetEqual','comparatorUnchanged'])assert.equal(value[field],true,label+': '+field);
    assert.deepEqual(value.history[0],value.history[1],label);
    assert.deepEqual(value.history[0],{undo:history[actions.indexOf(value.action)][0],redo:history[actions.indexOf(value.action)][1]},label);
    if(value.action==='reverse-selection')assert.ok(value.selection.every(selection=>selection.ranges[0].anchor>selection.ranges[0].head),label);
    assert.ok(value.afterParse.every(info=>info.available&&info.complete&&info.outer===info.length&&info.regions.length===1&&
      info.regions[0].to===info.length&&info.body?.from===info.regions[0].from&&info.body.to===info.length&&info.body.length===info.length-info.body.from),label);
    assert.ok(value.resources.every(info=>info.ready&&info.positive),label);
    if(value.resourceGate)assert.ok(value.resources.every(info=>Object.values(info.counts).every(count=>count>=1)),label);
    assert.ok(value.lines>0,label);
  }
}
console.log(JSON.stringify({cases:16,checks,geometry:'exact',comparator:'unchanged',scope:'Complete-tree layout and history only; no timing or production adoption'},null,2));
