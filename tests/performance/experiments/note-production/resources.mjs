import { readFileSync } from 'node:fs';
const runs = [];
for (const resource of ['code', 'html']) for (const variant of ['baseline', 'candidate']) {
  const name = `${resource}-${variant}`;
  const log = readFileSync(new URL(`./${name}.log`, import.meta.url), 'utf8');
  if (!/Tests\s+1 passed/.test(log)) throw new Error(`Incomplete run: ${name}`);
  const rows = log.split('\n').filter(line => line.startsWith('{"benchmark"')).map(JSON.parse);
  if (rows.length !== 20) throw new Error(`Missing resource routes: ${name}`);
  for (const row of rows) {
    if (row.samples !== 20 || row.timings.length !== 20 || row.publishedLengths.length !== 20 || row.full !== 20 || row.indexed !== 0 ||
      row.resource !== resource || row.preview !== (variant === 'baseline' ? 'baseline-a8d193f' : 'production')) throw new Error('Invalid fallback evidence');
  }
  runs.push({ name, comparisons: 400, routes: rows.map(row => ({
    bytes: row.bytes, note: row.note, location: row.location, full: row.full,
    completeTrees: row.publishedLengths.filter((length, at) => length === row.initialUnits + at + 1).length,
    partialTrees: row.publishedLengths.filter((length, at) => length !== row.initialUnits + at + 1).length
  })) });
}
console.log(JSON.stringify({ comparisons: 1600,
  limit: 'Full decorations match each published tree. Partial trees prevent a complete-document speed claim. Settled-tree correctness has a separate production test.',
  runs }, null, 2));
