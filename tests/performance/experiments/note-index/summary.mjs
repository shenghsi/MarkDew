import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const names = ['baseline-first', 'candidate-first', 'candidate-repeat', 'baseline-repeat'];
const runs = names.map(name => {
  const log = readFileSync(fileURLToPath(new URL(`./${name}.log`, import.meta.url)), 'utf8');
  if (!/Tests\s+1 passed/.test(log)) throw new Error(`Failed or incomplete run: ${name}`);
  const rows = log.split('\n').filter(line => line.startsWith('{"benchmark"')).map(JSON.parse);
  if (rows.length !== 12) throw new Error(`Expected twelve routes in ${name}`);
  for (const row of rows) {
    if (row.samples !== 20 || row.timings.length !== 20 || row.publishedLengths.length !== 20 || row.localVisits.length !== 20 || row.localRanges.length !== 20) throw new Error('Missing samples');
    if (row.indexed + row.full !== 20 || !row.publishedLengths.every((length, at) => length === row.initialUnits + at + 1) || !row.bodyBoundaries.every(from => from === 0)) throw new Error('Incomplete published tree');
    if (row.localVisits.some(visits => visits > 17)) throw new Error('Unbounded local block count');
    if (row.preview !== (name.startsWith('baseline') ? 'production' : 'note-index-experiment')) throw new Error('Wrong preview variant');
  }
  return rows;
});
const key = row => JSON.stringify([row.bytes, row.initialUnits, row.note, row.location, row.language, row.resource, row.samples, row.scope, row.node, row.platform, row.arch]);
for (const run of runs) for (let at = 0; at < run.length; at++) if (key(run[at]) !== key(runs[0][at])) throw new Error('Different route fixture');
console.log(JSON.stringify({ baseline: '936a2b7', samples: 960, scope: runs[0][0].scope,
  routes: runs[0].map((row, at) => ({ bytes: row.bytes, note: row.note, location: row.location,
    runs: names.map((name, run) => { const value = runs[run][at]; return { name, median: value.median, p95: value.p95, first: value.timings[0], max: value.max, indexed: value.indexed, full: value.full,
      maxLocalVisits: Math.max(...value.localVisits), maxLocalRanges: Math.max(...value.localRanges) }; }) })) }, null, 2));
