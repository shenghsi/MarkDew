import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runs = JSON.parse(await readFile(new URL('input-fallback-diagnosis.json', import.meta.url), 'utf8'));
assert.deepEqual(runs.map(run => run.pairedRequested), [false, true]);
const counts = [];
for (const run of runs) {
  assert.equal(run.diagnostics, true); assert.equal(run.samples, 40); assert.equal(run.raw.length, 40);
  assert.deepEqual(run.failures, []); assert.equal(run.unexpectedUpdates, 0);
  assert.ok(run.checked.exactEdited && run.checked.exactOriginal); assert.equal(run.checked.historyAfter, 0);
  const reasons = {};
  for (const sample of run.raw) {
    assert.equal(sample.key, 'a'); assert.equal(sample.data, 'a'); assert.equal(sample.inputType, 'insertText');
    assert.ok(sample.visible && sample.domContainsInput);
    const fallback = sample.fallback;
    assert.equal(typeof fallback.mountedBefore, 'boolean'); assert.equal(typeof fallback.mountedAfter, 'boolean');
    if (fallback.reason === 'accepted') {
      assert.ok(fallback.updateIndexCalled && fallback.returnedIndex); assert.equal(sample.previewMode, 'indexed');
    } else if (fallback.reason === 'parser-incomplete') {
      assert.ok(fallback.updateIndexCalled && !fallback.returnedIndex && !fallback.mountedAfter);
      assert.ok(sample.indexBefore); assert.equal(sample.previewMode, 'full');
    } else {
      assert.equal(fallback.reason, 'no-index'); assert.ok(!sample.indexBefore && !fallback.updateIndexCalled);
    }
    reasons[fallback.reason] = (reasons[fallback.reason] ?? 0) + 1;
  }
  counts.push(reasons);
  if (run.pairedRequested) assert.ok(!run.comparator.active && run.comparator.restored);
}
assert.deepEqual(counts, [{ accepted: 7, 'parser-incomplete': 1, 'no-index': 32 }, { accepted: 40 }]);
console.log(JSON.stringify({ inputs: 80, exactSourceAndUndo: true, reasons: counts,
  decision: 'First observed rejection is incomplete published Markdown body; later index absence is separate',
  scope: 'Instrumented Chrome development diagnosis; no stable speed gain or production acceptance' }, null, 2));
