import { expect, it } from 'vitest';
import { fromSource, normalize, sourceOffset } from '../../src/web/source';

function legacyOffset(raw: string, position: number): number {
  let logical = 0, offset = 0;
  while (offset < raw.length && logical < position) {
    offset += raw[offset] === '\r' && raw[offset + 1] === '\n' ? 2 : 1; logical++;
  }
  return offset;
}
function stats(values: number[]) {
  values.sort((a,b) => a-b);
  return { median: +((values[9] + values[10])/2).toFixed(6), p95: +values[18].toFixed(6),
    min: +values[0].toFixed(6), max: +values[19].toFixed(6) };
}
it.skipIf(process.env.MARKDEW_OFFSET_BENCH !== '1')('measures new-record index construction and cached source offsets', async () => {
  console.log(JSON.stringify({ benchmark: 'source-offsets', samples: 20, node: process.version,
    platform: process.platform, arch: process.arch, units: 'ms', cachedQueriesPerSample: 1000,
    scope: 'new-record index plus one lookup; cached 1000-query batch; separate one-query legacy walk; no editor, history, DOM, native input, or frame' }));
  for (const rawUtf16Units of [100*1024, 1024*1024]) for (const ending of ['LF','CR','CRLF','mixed']) {
    const block = { LF:'line\n', CR:'line\r', CRLF:'line\r\n', mixed:'a\r\nb\rc\n' }[ending]!;
    const raw = block.repeat(Math.ceil(rawUtf16Units/block.length)).slice(0,rawUtf16Units);
    const length = normalize(raw).length, positions = [length-30,length-29,length-28,length-27];
    const expected = positions.map(position => legacyOffset(raw,position));
    const build: number[] = [], cached: number[] = [], legacy: number[] = [];
    for (let sample=0; sample<20; sample++) {
      const record = fromSource(raw), position = positions[sample%4];
      let start = performance.now(); const first = sourceOffset(record,position); build.push(performance.now()-start);
      start = performance.now(); let sum = 0;
      for (let query=0;query<1000;query++) sum += sourceOffset(record,positions[query%4]);
      cached.push(performance.now()-start);
      start = performance.now(); const reference = legacyOffset(raw,position); legacy.push(performance.now()-start);
      expect(first).toBe(reference); expect(sum).toBe(expected.reduce((a,b) => a+b,0)*250);
      await new Promise(resolve => setTimeout(resolve,0));
    }
    console.log(JSON.stringify({ rawUtf16Units, ending, logicalUtf16Units:length,
      indexAndLookup:stats(build), cached1000Queries:stats(cached), legacyOneQuery:stats(legacy) }));
  }
}, 30000);
