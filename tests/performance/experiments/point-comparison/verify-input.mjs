import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runs = JSON.parse(await readFile(new URL('input-abba.json', import.meta.url), 'utf8'));
assert.deepEqual(runs.map(run => run.pairedRequested), [false, true, true, false]);
const stats = values => {
  values.sort((a, b) => a - b);
  return { median: values[Math.floor(values.length / 2)], p95: values[Math.ceil(values.length * .95) - 1], max: values.at(-1) };
};
for (const run of runs) {
  assert.equal(run.bytes, 1048576); assert.equal(run.notes, true);
  assert.equal(run.samples, 40); assert.equal(run.raw.length, 40);
  assert.deepEqual(run.failures, []); assert.equal(run.unexpectedUpdates, 0);
  assert.ok(run.checked.exactEdited && run.checked.exactOriginal);
  assert.equal(run.checked.historyAfter, 0); assert.ok(run.checked.undoCalls > 0);
  assert.equal(run.completeSamples, run.raw.filter(sample => sample.complete).length);
  for (const sample of run.raw) {
    assert.equal(sample.key, 'a'); assert.equal(sample.data, 'a');
    assert.equal(sample.inputType, 'insertText');
    assert.ok(sample.visible && sample.domContainsInput);
    for (const key of ['keyToUpdateMs', 'inputToUpdateMs', 'keyToRafMs', 'keyToGeometryMs'])
      assert.ok(Number.isFinite(sample[key]) && sample[key] >= 0);
  }
  for (const key of ['keyToUpdateMs', 'inputToUpdateMs', 'keyToRafMs', 'keyToGeometryMs'])
    assert.deepEqual(run[key], stats(run.raw.map(sample => sample[key])));
  if (run.pairedRequested) {
    assert.ok(!run.comparator.active && run.comparator.restored && !run.comparator.ownershipLost);
    assert.equal(run.comparator.failure, undefined);
    assert.ok(run.comparator.phaseStats.dispatch.jumps > 0);
  }
}
const routes = run => run.raw.map(sample => [sample.complete, sample.previewMode,
  sample.indexBefore, sample.indexAfter, sample.noteAwareBefore, sample.noteAwareAfter].join('/'));
const matchedRoutes = runs.every(run => JSON.stringify(routes(run)) === JSON.stringify(routes(runs[0])));
assert.equal(matchedRoutes, false, 'Retain the observed parser-route mismatch');
console.log(JSON.stringify({ acceptedInputs: 160, exactSourceAndUndo: true,
  outerCompleteSamples: runs.map(run => run.completeSamples), mountedCompleteness: 'not recorded', matchedRoutes,
  keyToRafP95Ms: runs.map(run => run.keyToRafMs.p95),
  decision: 'No stable speed comparison; retain all samples and investigate parser-route loss',
  scope: 'Standalone static projection, Chrome, Vite development; no production, native or paint claim' }, null, 2));
