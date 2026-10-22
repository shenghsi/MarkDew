import { RangeSet } from '@codemirror/state';

export const expectedVersion = '6.7.6';
export const expectedHash = 'cf4ffe7d177bf2c7c5da66c49be0811cc79a29e12cb658238876bbdcef12939c';
type Compare = typeof RangeSet.compare;
type Phase = 'setup' | 'dispatch' | 'geometry' | 'other';
interface Candidate {
  RangeSet: { compare: Compare };
  pairedStats: { jumps: number; rangesSkipped: number };
  packageVersion: string;
  sourceSHA256: string;
}
let installed: object | undefined;

export function installPairedComparator(candidate: Candidate,
  host: { pathname: string; search: string; expectedOriginal: Compare }) {
  if (!['/tests/browser/static-points.html', '/tests/browser/paired-input.html'].includes(host.pathname) || new URLSearchParams(host.search).get('paired') !== '1')
    throw new Error('Paired comparison is limited to the explicit test fixture');
  if (installed) throw new Error('A paired comparison trial is already installed');
  if (candidate.packageVersion !== expectedVersion || candidate.sourceSHA256 !== expectedHash)
    throw new Error('Paired comparison package identity does not match');
  if (typeof candidate.RangeSet?.compare !== 'function' || !candidate.pairedStats ||
    !Number.isSafeInteger(candidate.pairedStats.jumps) || !Number.isSafeInteger(candidate.pairedStats.rangesSkipped))
    throw new Error('Paired comparison module is invalid');
  const descriptor = Object.getOwnPropertyDescriptor(RangeSet, 'compare');
  const original = host.expectedOriginal;
  if (!descriptor || descriptor.value !== original || RangeSet.compare !== original ||
    descriptor.writable !== true || descriptor.configurable !== true || descriptor.get || descriptor.set)
    throw new Error('The original comparison method is unavailable');
  const owner = {};
  let phase: Phase = 'setup', active = true, failure: string | undefined, ownershipLost = false;
  const calls = { setup: 0, dispatch: 0, geometry: 0, other: 0, paired: 0, fallback: 0 };
  const phaseStats = { setup: { jumps: 0, rangesSkipped: 0 }, dispatch: { jumps: 0, rangesSkipped: 0 },
    geometry: { jumps: 0, rangesSkipped: 0 }, other: { jumps: 0, rangesSkipped: 0 } };
  const hasDescriptor = (value: Compare) => {
    const current = Object.getOwnPropertyDescriptor(RangeSet, 'compare');
    return !!current && current.value === value && current.writable === descriptor.writable &&
      current.configurable === descriptor.configurable && current.enumerable === descriptor.enumerable &&
      !current.get && !current.set;
  };
  const ownsMethod = () => hasDescriptor(wrapper);
  const restore = () => {
    if (!active) return false;
    active = false;
    if (installed === owner) installed = undefined;
    if (!ownsMethod()) { ownershipLost = true; return false; }
    Object.defineProperty(RangeSet, 'compare', descriptor);
    return true;
  };
  const wrapper = function (this: unknown, ...args: Parameters<Compare>) {
    if (!active) return original.apply(this, args);
    calls[phase]++;
    const paired = args[4] === 0;
    if (paired) calls.paired++; else calls.fallback++;
    const calledPhase = phase, jumps = candidate.pairedStats.jumps, skipped = candidate.pairedStats.rangesSkipped;
    try { return (paired ? candidate.RangeSet.compare : original).apply(this, args); }
    catch (error) { failure = String(error); restore(); throw error; }
    finally { phaseStats[calledPhase].jumps += candidate.pairedStats.jumps - jumps;
      phaseStats[calledPhase].rangesSkipped += candidate.pairedStats.rangesSkipped - skipped; }
  } as Compare;
  Object.defineProperty(RangeSet, 'compare', { ...descriptor, value: wrapper });
  installed = owner;
  return {
    original,
    phase(value: Phase) { phase = value; },
    dispose: restore,
    snapshot() { return { active, owned: ownsMethod(), restored: hasDescriptor(original),
      ownershipLost, failure, calls: { ...calls }, stats: { ...candidate.pairedStats },
      phaseStats: Object.fromEntries(Object.entries(phaseStats).map(([key, value]) => [key, { ...value }])),
      version: candidate.packageVersion, sourceSHA256: candidate.sourceSHA256 }; },
  };
}
