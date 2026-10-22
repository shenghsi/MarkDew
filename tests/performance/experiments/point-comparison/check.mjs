// Inactive package experiment. No installed module or app method is changed.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ChangeSet, RangeSet, RangeValue } from '@codemirror/state';
import { loadPaired, pairedSource } from './paired.mjs';

const entry = import.meta.resolve('@codemirror/state');
const source = await readFile(fileURLToPath(entry), 'utf8');
const packageInfo = JSON.parse(await readFile(new URL('../package.json', entry), 'utf8'));
assert.equal(packageInfo.version, '6.7.6');
const dependency = import.meta.resolve('@marijn/find-cluster-break');
const importText = "from '@marijn/find-cluster-break'";
assert.equal(source.split(importText).length, 2);
const copy = source.replace(importText, `from ${JSON.stringify(dependency)}`);
const call = 'let sharedChunks = findSharedChunks(a, b, textDiff);';
const condition = 'if (set.chunk[i].maxPoint <= 0)';
assert.equal(copy.split(call).length, 2);
assert.equal(copy.split(condition).length, 2);
const guard = 'minPointSize >= 0 && a.length === 1 && b.length === 1 && a[0].nextLayer.isEmpty && b[0].nextLayer.isEmpty';
function changed(allow) {
  return copy.replace(call, `let sharedChunks = findSharedChunks(a, b, textDiff, ${allow});`)
    .replace('function findSharedChunks(a, b, textDiff) {', 'function findSharedChunks(a, b, textDiff, allowPositive = false) {')
    .replace(condition, 'if (allowPositive || set.chunk[i].maxPoint <= 0)');
}
const moduleFrom = text => import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`);
const naive = await moduleFrom(changed('true'));
const guarded = await moduleFrom(changed(guard));
const pairedESM = await moduleFrom(pairedSource(copy));
const paired = (await loadPaired()).module;
class Value extends RangeValue {
  constructor(id, point, startSide = 0, endSide = 0) { super(); Object.assign(this, { id, point, startSide, endSide }); }
  eq(other) { return this.id === other.id && this.point === other.point && this.startSide === other.startSide && this.endSide === other.endSide; }
}
const value = (id, point = true, start = 0, end = 0) => new Value(id, point, start, end);
const label = item => item ? [item.id, item.point, item.startSide, item.endSide] : null;
function callbacks(api, before, after, changes, minimum) {
  const result = [];
  api.compare(before, after, changes, {
    comparePoint(from, to, a, b) { result.push(['point', from, to, label(a), label(b)]); },
    compareRange(from, to, a, b) { result.push(['range', from, to, a.map(label), b.map(label)]); },
    boundChange(at) { result.push(['bound', at]); },
  }, minimum);
  return result;
}
const length = 20000;
const empty = ChangeSet.empty(length);
const common = RangeSet.of(Array.from({ length: 750 }, (_, i) => value('shared').range(10 + i * 20, 20 + i * 20)), true);
const insideOld = RangeSet.of([value('old-inside').range(12, 14)]);
const insideNew = RangeSet.of([value('new-inside').range(12, 14)]);
const naiveCases = [
  { name: 'shared-point-hides-changed-point-in-other-set', before: [common, insideOld], after: [common, insideNew] },
  { name: 'shared-point-hides-changed-mark-in-other-set', before: [common, RangeSet.of([value('mark-old', false).range(12, 14)])], after: [common, RangeSet.of([value('mark-new', false).range(12, 14)])] },
];
const counterexamples = [];
for (const item of naiveCases) for (const minimum of [-1, 0]) {
  const expected = callbacks(RangeSet, item.before, item.after, empty, minimum);
  const actual = callbacks(naive.RangeSet, item.before, item.after, empty, minimum);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) counterexamples.push({ name: item.name, minimum, expected, actual });
  assert.deepEqual(callbacks(guarded.RangeSet, item.before, item.after, empty, minimum), expected);
  assert.deepEqual(callbacks(paired.RangeSet, item.before, item.after, empty, minimum), expected);
  assert.deepEqual(callbacks(pairedESM.RangeSet, item.before, item.after, empty, minimum), expected);
}
assert.ok(counterexamples.length, 'The naive control must fail before guarded checks count as evidence');

let seed = 0x6b8b4567;
const random = max => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % max; };
let comparisons = 0, eligibleComparisons = 0, mismatches = 0;
const guardedCounterexamples = [];
function eligible(before, after, minimum) {
  const relevant = sets => sets.filter(set => set.maxPoint > 0 || !set.isEmpty && set.maxPoint >= minimum);
  const a = relevant(before), b = relevant(after);
  return minimum >= 0 && a.length === 1 && b.length === 1 && a[0].nextLayer.isEmpty && b[0].nextLayer.isEmpty;
}
function check(name, before, after, changes, minimum) {
  const expected = callbacks(RangeSet, before, after, changes, minimum);
  const actual = callbacks(guarded.RangeSet, before, after, changes, minimum);
  assert.deepEqual(callbacks(paired.RangeSet, before, after, changes, minimum), expected, `paired: ${name}`);
  assert.deepEqual(callbacks(pairedESM.RangeSet, before, after, changes, minimum), expected, `paired ESM: ${name}`);
  const accepted = eligible(before, after, minimum);
  comparisons++; if (accepted) eligibleComparisons++;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    assert.ok(accepted, 'Fallback must retain the exact upstream behavior');
    mismatches++;
    if (guardedCounterexamples.length < 16) guardedCounterexamples.push({ name, minimum, accepted, expected, actual });
  }
}
// Touching points are not covered by the spaced random fixtures. Include
// chunk boundaries, zero points and side order explicitly.
for (const side of [-2, 0, 2]) {
  const touching = RangeSet.of(Array.from({ length: 750 }, (_, i) => value('touching', true, side, side).range(i * 10, i * 10 + 10)), true);
  for (const at of [0, 10, 2490, 2500, 5000, 7500]) {
    for (const sides of [[side, side], [side + 1, side + 1], [side + 1, side - 1]]) {
      const after = touching.update({ add: [value('boundary-zero', true, ...sides).range(at, at)] });
      for (const minimum of [-1, 0, 1]) check('touching point with boundary zero', [touching], [after], empty, minimum);
    }
    const removed = touching.update({ filterFrom: at, filterTo: at + 10, filter: from => from !== at });
    for (const minimum of [-1, 0, 1]) check('touching point removed at chunk boundary', [touching], [removed], empty, minimum);
  }
}
// Clip shared points at both ends of unchanged text gaps. Multiple edits can
// create several gaps inside a single otherwise shared chunk.
for (const before of [common, RangeSet.of(Array.from({ length: 750 }, (_, i) =>
  value('clipped', true, -2, 2).range(10 + i * 20, 28 + i * 20)), true)]) {
  for (const changes of [
    [{ from: 10, insert: 'x' }, { from: 5018, insert: 'xy' }],
    [{ from: 12, to: 14 }, { from: 5010, to: 5012 }],
    [{ from: 9, to: 11, insert: '中' }, { from: 7498, to: 7501, insert: '🙂' }],
    [{ from: 10, to: 20 }, { from: 5010, to: 5020 }],
  ]) {
    const diff = ChangeSet.of(changes, length), after = before.map(diff);
    for (const minimum of [-1, 0, 1, 5, 20]) check('clipped points with multiple edit gaps', [before], [after], diff, minimum);
  }
}
for (let iteration = 0; iteration < 120; iteration++) {
  const ranges = Array.from({ length: 750 }, (_, i) => {
    const from = 10 + i * 20, size = random(5) === 0 ? 0 : 1 + random(8);
    return value(`v${random(7)}`, random(5) !== 0, random(5) - 2, random(5) - 2).range(from, from + size);
  });
  const before = RangeSet.of(ranges, true);
  const index = [0, 249, 250, 499, 500, 749, random(750)][iteration % 7];
  const position = ranges[index].from;
  const after = before.update({ filterFrom: position, filterTo: position + 8,
    filter: (from) => from !== position, add: [value('changed', true, random(5) - 2, random(5) - 2).range(position, position + random(9))] });
  for (const minimum of [-1, 0, 1, 5, 20]) check('local chunk update', [before], [after], empty, minimum);
  for (const change of [
    { from: 0, insert: '中文🙂' }, { from: position - 1, insert: 'x' },
    { from: position, insert: 'x' }, { from: position + 1, to: position + 2 },
    { from: 16000, to: 16001, insert: 'xy' },
  ]) {
    const diff = ChangeSet.of(change, length), mapped = before.map(diff);
    for (const minimum of [-1, 0, 1, 5]) check('mapped chunk and edit boundary', [before], [mapped], diff, minimum);
  }
  // A nested point creates another layer. The guard must keep upstream behavior.
  const nested = before.update({ add: [value('outer').range(position - 2, position + 12)] });
  check('layer fallback', [before], [nested], empty, 0);
  check('rank fallback', [common, before], [after, common], empty, 0);
}
console.log(JSON.stringify({ diagnostic: 'inactive-positive-point-comparison', packageVersion: packageInfo.version,
  sourceSHA256: createHash('sha256').update(source).digest('hex'), node: process.version,
  guard, counterexamples, comparisons, eligibleComparisons, mismatches, guardedCounterexamples,
  paired: { exactStreams: comparisons, ...paired.pairedStats },
  pairedESM: { exactStreams: comparisons, ...pairedESM.pairedStats },
  result: 'reject independent skip guard; paired candidate retains exact tested streams through both loaders; no app change or speed claim' }, null, 2));
assert.ok(mismatches > 0, 'The guard rejection must retain a failing boundary control');
assert.ok(guardedCounterexamples.some(example => example.name === 'touching point with boundary zero'
  && example.minimum === 0 && example.accepted && example.expected.some((event, index) =>
    event[0] === 'point' && event[1] === 0 && event[2] === 0 && event[3]?.[0] === 'touching'
    && event[3]?.[1] === true && event[4]?.[0] === 'boundary-zero'
    && example.actual[index]?.[0] === 'point' && example.actual[index]?.[1] === 0
    && example.actual[index]?.[2] === 0 && example.actual[index]?.[3] === null
    && example.actual[index]?.[4]?.[0] === 'boundary-zero')),
  'The known eligible zero-boundary case must lose the shared old-point context');
