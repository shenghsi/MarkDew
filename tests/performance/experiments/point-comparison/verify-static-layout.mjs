import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const load = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
const paired = process.argv.includes('--paired');
const navigation = await load(paired ? 'paired-height-controls.json' : 'static-height-controls.json');
const editing = await load(paired ? 'paired-edit-height-controls.json' : 'static-edit-height-controls.json');
assert.equal(navigation.length, 8);
assert.equal(editing.length, 4);
const matrix = records => new Set(records.map(r => [r.indexed, r.control, r.reverse].join('/')));
assert.equal(matrix(navigation).size, 8);
assert.equal(matrix(editing).size, 4);
const navigationActions = ['top', 'middle', 'end', 'distant', 'owner', 'narrow', 'find', 'top', 'middle', 'end'];
const editActions = ['edit-anchor', 'unicode-edit', 'distant', 'narrow', 'undo', 'redo', 'source', 'live', 'end'];
function geometry(x) {
  assert.equal(x.error, undefined);
  assert.equal(x.settling.status, 'stable');
  assert.ok(x.settling.samples.length >= 8);
  assert.equal(x.differences.length, 0);
  assert.ok(x.boxes.length > 0);
  assert.ok(x.boxes.every(box => box.delta === 0 && box.textEqual));
  assert.equal(x.maxHeightDelta, 0);
  assert.equal(x.candidateEstimatedHeight, x.baselineEstimatedHeight);
  assert.equal(x.candidateHead.scrollHeight, x.baselineHead.scrollHeight);
  assert.equal(x.candidateHead.scrollTop, x.baselineHead.scrollTop);
  assert.equal(x.candidateHead.relativeTop, x.baselineHead.relativeTop);
  assert.equal(x.candidateHead.head, x.baselineHead.head);
  assert.ok(x.sourceEqual && x.complete && x.baselineComplete);
  assert.ok(x.sourceUnchangedByCheck && x.historyUnchangedByCheck);
  assert.ok(x.sourceUnchangedDuringSettle && x.historyUnchangedDuringSettle);
  if (paired) comparator(x.comparator);
}
function comparator(value) {
  assert.equal(value.version, '6.7.6');
  assert.equal(value.sourceSHA256, 'cf4ffe7d177bf2c7c5da66c49be0811cc79a29e12cb658238876bbdcef12939c');
  assert.ok(value.active && value.owned && !value.restored && !value.ownershipLost);
  assert.equal(value.failure, undefined);
  assert.equal(value.calls.paired + value.calls.fallback,
    value.calls.setup + value.calls.dispatch + value.calls.geometry + value.calls.other);
}
for (const record of navigation) {
  assert.equal(record.checking, false);
  assert.deepEqual(record.batchResults.map(x => x.action), navigationActions);
  for (const x of record.batchResults) {
    geometry(x); assert.ok(x.exactOriginal); assert.equal(x.history, 0);
  }
}
for (const record of editing) {
  assert.equal(record.checking, false); assert.equal(record.indexed, true);
  assert.deepEqual(record.editResults.map(x => x.action), editActions);
  for (const x of record.editResults) {
    geometry(x); assert.ok(x.exactExpected && x.selectionEqual);
    assert.deepEqual(x.fonts[0], x.fonts[1]);
    assert.equal(x.history, ['edit-anchor', 'undo'].includes(x.action) ? 0 : 1);
    assert.equal(x.exactOriginal, ['edit-anchor', 'undo'].includes(x.action));
  }
  const edit = record.editResults.find(x => x.action === 'unicode-edit');
  if (!record.control) {
    assert.equal(record.editMode, 'indexed');
    assert.equal(edit.readiness.before, 'indexed'); assert.equal(edit.readiness.after, 'indexed');
    if (paired) {
      assert.ok(edit.callbackControl.equal); assert.equal(edit.callbackControl.callbacks, 2);
      assert.ok(edit.callbackControl.diagnosticJumps > 0 && edit.callbackControl.diagnosticRangesSkipped > 0);
      assert.ok(record.comparator.phaseStats.dispatch.jumps > 0);
      assert.ok(record.comparator.phaseStats.dispatch.rangesSkipped > 0);
    }
  }
  assert.equal(record.editResults.find(x => x.action === 'source').readiness.after, 'source');
}
if (paired) {
  for (const record of [...navigation, ...editing]) {
    comparator(record.comparator);
    const direct = record.editResults.find(x => x.action === 'unicode-edit')?.callbackControl;
    for (const [key, diagnosticKey] of [['jumps', 'diagnosticJumps'], ['rangesSkipped', 'diagnosticRangesSkipped']]) {
      const actual = Object.values(record.comparator.phaseStats).reduce((sum, value) => sum + value[key], 0);
      assert.equal(record.comparator.stats[key], actual + (direct?.[diagnosticKey] ?? 0));
    }
  }
  const smoke = await load('paired-final-smoke.json');
  assert.equal(smoke.editResults.length, 9);
  for (const check of smoke.editResults) geometry(check);
  assert.ok(!smoke.comparator.active && !smoke.comparator.owned && smoke.comparator.restored);
  assert.equal(smoke.comparator.failure, undefined);
  const failures = await load('paired-setup-failures.json');
  assert.equal(failures.length, 2);
  for (const failure of failures) {
    assert.equal(failure.ready, false); assert.equal(failure.disposed, true);
    assert.equal(failure.createdViews, 1); assert.equal(failure.remainingEditors, 0);
    assert.match(failure.viewSetupError, /Requested failure after first view construction/);
    assert.ok(!failure.comparator.active && failure.comparator.restored);
  }
}
console.log(JSON.stringify({ navigationChecks: 80, editChecks: 36, geometry: 'exact',
  comparator: paired ? 'inactive paired browser wrapper' : 'unchanged',
  scope: 'static projection with complete trees; no input, latency, memory or native acceptance claim' }, null, 2));
