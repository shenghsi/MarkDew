import { afterEach, expect, it } from 'vitest';
import { ChangeSet, RangeSet, RangeValue } from '@codemirror/state';
import { expectedHash, expectedVersion, installPairedComparator } from '../performance/experiments/point-comparison/browser-comparator';
import { loadPaired } from '../performance/experiments/point-comparison/paired.mjs';

const descriptor = Object.getOwnPropertyDescriptor(RangeSet, 'compare')!;
const original = RangeSet.compare;
const host = { pathname: '/tests/browser/static-points.html', search: '?paired=1', expectedOriginal: original };
let dispose: (() => boolean) | undefined;
afterEach(() => { dispose?.(); dispose = undefined; Object.defineProperty(RangeSet, 'compare', descriptor); });
const module = (compare: typeof RangeSet.compare) => ({ RangeSet: { compare }, pairedStats: { jumps: 0, rangesSkipped: 0 },
  packageVersion: expectedVersion, sourceSHA256: expectedHash });

it('rejects wrong route, package identity, method identity and repeated installation', () => {
  for (const wrong of [{ ...host, pathname: '/' }, { ...host, search: '' }, { ...host, expectedOriginal: (() => {}) as typeof original }])
    expect(() => installPairedComparator(module(original), wrong)).toThrow();
  for (const candidate of [{ ...module(original), packageVersion: '0' }, { ...module(original), sourceSHA256: 'wrong' }])
    expect(() => installPairedComparator(candidate, host)).toThrow();
  expect(RangeSet.compare).toBe(original);
  const trial = installPairedComparator(module(original), host); dispose = trial.dispose;
  expect(() => installPairedComparator(module(original), host)).toThrow();
  expect(trial.dispose()).toBe(true); expect(Object.getOwnPropertyDescriptor(RangeSet, 'compare')).toEqual(descriptor);
});

it('retains all arguments and receiver, separates phases, and uses default and nonzero fallbacks', () => {
  const receiver = {}, observed: { receiver: unknown; args: unknown[] }[] = [];
  const compare = function (this: unknown, ...args: Parameters<typeof original>) { observed.push({ receiver: this, args }); } as typeof original;
  const trial = installPairedComparator(module(compare), host); dispose = trial.dispose;
  const args: Parameters<typeof original> = [[], [], ChangeSet.empty(0), { compareRange() {}, comparePoint() {} }, 0];
  trial.phase('dispatch'); RangeSet.compare.apply(receiver, args);
  expect(observed).toEqual([{ receiver, args }]);
  trial.phase('geometry'); RangeSet.compare([], [], args[2], args[3]); RangeSet.compare([], [], args[2], args[3], 1);
  expect(observed.length).toBe(1);
  expect(trial.snapshot().calls).toEqual({ setup: 0, dispatch: 1, geometry: 2, other: 0, paired: 1, fallback: 2 });
  expect(trial.dispose()).toBe(true); expect(trial.dispose()).toBe(false);
});

it('restores and rethrows a comparison failure without replaying callbacks', () => {
  let callbacks = 0;
  const failure = new Error('expected comparison failure');
  const trial = installPairedComparator(module((...args) => { args[3].comparePoint(0, 0, null, null); throw failure; }), host);
  dispose = trial.dispose;
  expect(() => RangeSet.compare([], [], ChangeSet.empty(0), { compareRange() {}, comparePoint() { callbacks++; } }, 0)).toThrow(failure);
  expect(callbacks).toBe(1); expect(RangeSet.compare).toBe(original);
  expect(trial.snapshot()).toMatchObject({ active: false, restored: true, failure: String(failure) });
});

it('retains a later owner method during disposal', () => {
  const trial = installPairedComparator(module(original), host); dispose = trial.dispose;
  const replacement = (() => {}) as typeof original; RangeSet.compare = replacement;
  expect(trial.dispose()).toBe(false); expect(RangeSet.compare).toBe(replacement);
  expect(trial.snapshot()).toMatchObject({ active: false, ownershipLost: true, restored: false });
});

it('does not report restoration when the original function has different flags', () => {
  const trial = installPairedComparator(module(original), host); dispose = trial.dispose;
  const later = { ...descriptor, writable: false };
  Object.defineProperty(RangeSet, 'compare', later);
  expect(trial.snapshot().restored).toBe(false); expect(trial.dispose()).toBe(false);
  expect(Object.getOwnPropertyDescriptor(RangeSet, 'compare')).toEqual(later);
  expect(trial.snapshot()).toMatchObject({ active: false, ownershipLost: true, restored: false });
});

it('permits only the explicit input fixture path and restores its original descriptor', () => {
  expect(() => installPairedComparator(module(original), { ...host, pathname: '/tests/browser/input-frame.html' })).toThrow();
  const trial = installPairedComparator(module(original), { ...host, pathname: '/tests/browser/paired-input.html' });
  dispose = trial.dispose; expect(trial.snapshot().owned).toBe(true);
  expect(trial.dispose()).toBe(true); expect(Object.getOwnPropertyDescriptor(RangeSet, 'compare')).toEqual(descriptor);
});

it.each([undefined, -1, 1])('restores after an original fallback callback throws at size %s', size => {
  class Point extends RangeValue { point = true; }
  const before = RangeSet.of([new Point().range(1, 4)]);
  let callbacks = 0, candidateCalls = 0;
  const failure = new Error('expected fallback callback failure');
  const trial = installPairedComparator(module(() => { candidateCalls++; }), host); dispose = trial.dispose;
  expect(() => RangeSet.compare([before], [], ChangeSet.empty(10), {
    compareRange() { callbacks++; throw failure; }, comparePoint() { callbacks++; throw failure; },
  }, size)).toThrow(failure);
  expect(callbacks).toBe(1); expect(candidateCalls).toBe(0);
  expect(Object.getOwnPropertyDescriptor(RangeSet, 'compare')).toEqual(descriptor);
  expect(trial.snapshot()).toMatchObject({ active: false, restored: true, failure: String(failure) });
});

it.each(['getter', 'flags'])('retains later %s ownership without reading getters', kind => {
  let candidateCalls = 0, getterCalls = 0;
  const trial = installPairedComparator(module(() => { candidateCalls++; }), host); dispose = trial.dispose;
  const wrapper = RangeSet.compare;
  const later = kind === 'getter' ? { configurable: true, enumerable: descriptor.enumerable,
    get() { getterCalls++; return wrapper; } } : { ...descriptor, value: wrapper, writable: false };
  Object.defineProperty(RangeSet, 'compare', later);
  expect(trial.snapshot().owned).toBe(false); expect(trial.dispose()).toBe(false);
  expect(Object.getOwnPropertyDescriptor(RangeSet, 'compare')).toEqual(later);
  expect(trial.snapshot()).toMatchObject({ active: false, ownershipLost: true });
  expect(getterCalls).toBe(0);
  wrapper([], [], ChangeSet.empty(0), { compareRange() {}, comparePoint() {} }, 0);
  expect(candidateCalls).toBe(0);
});

it('retains exact callbacks from the real paired module through the installed wrapper', async () => {
  const paired = await loadPaired();
  class Point extends RangeValue { point = true; }
  const before = RangeSet.of(Array.from({ length: 750 }, (_, i) => new Point().range(i * 10, i * 10 + 5)), true);
  const after = before.update({ add: [new Point().range(12000, 12001)] });
  const events = (compare: typeof original) => { const result: unknown[] = [];
    compare([before], [after], ChangeSet.empty(20000), {
      compareRange(from, to, a, b) { result.push(['range', from, to, a, b]); },
      comparePoint(from, to, a, b) { result.push(['point', from, to, a, b]); },
      boundChange(at) { result.push(['bound', at]); },
    }, 0); return result;
  };
  const expected = events(original);
  const trial = installPairedComparator({ ...paired.module, packageVersion: paired.version, sourceSHA256: paired.sourceSHA256 }, host);
  dispose = trial.dispose;
  expect(events(RangeSet.compare)).toEqual(expected); expect(trial.snapshot().stats.jumps).toBeGreaterThan(0);
});
