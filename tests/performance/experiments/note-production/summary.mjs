import { readFileSync } from 'node:fs';
const names = ['baseline-first', 'candidate-first', 'candidate-repeat', 'baseline-repeat'];
const runs = names.map(name => {
  const log = readFileSync(new URL(`./${name}.log`, import.meta.url), 'utf8');
  if (!/Tests\s+1 passed/.test(log)) throw new Error(`Incomplete run: ${name}`);
  const rows = log.split('\n').filter(line => line.startsWith('{"benchmark"')).map(JSON.parse);
  if (rows.length !== 12) throw new Error(`Missing routes: ${name}`);
  for (const row of rows) {
    for (const field of ['timings', 'publishedLengths', 'bodyBoundaries', 'localVisits', 'localRanges']) {
      if (row[field].length !== 20) throw new Error(`Missing ${field}`);
    }
    if (row.samples !== 20 || row.indexed + row.full !== 20 ||
      !row.publishedLengths.every((length, at) => length === row.initialUnits + at + 1) ||
      !row.bodyBoundaries.every(from => from === 0)) throw new Error('Incomplete tree or samples');
    if (row.preview !== (name.startsWith('baseline') ? 'baseline-a8d193f' : 'production')) throw new Error('Wrong variant');
    if (row.localVisits.some(count => count > 17)) throw new Error('Unbounded local work');
  }
  return rows;
});
const key = row => JSON.stringify([row.bytes, row.initialUnits, row.note, row.location, row.language, row.resource, row.samples, row.scope, row.node, row.platform, row.arch]);
for (const run of runs) run.forEach((row, at) => {
  if (key(row) !== key(runs[0][at])) throw new Error('Different fixture');
});
console.log(JSON.stringify({ baseline: 'a8d193f', samples: 960, scope: runs[0][0].scope,
  routes: runs[0].map((row, at) => ({ bytes: row.bytes, note: row.note, location: row.location,
    runs: names.map((name, run) => { const value = runs[run][at]; return {
      name, median: value.median, p95: value.p95, first: value.timings[0], max: value.max,
      indexed: value.indexed, full: value.full, maxLocalVisits: Math.max(...value.localVisits),
      maxLocalRanges: Math.max(...value.localRanges)
    }; }) })) }, null, 2));
