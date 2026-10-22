import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

export async function loadPaired() {
  // Vite's SSR import.meta does not implement resolve. Resolve package roots
  // with Node, then select their declared ESM entries.
  const resolve = createRequire(import.meta.url).resolve;
  const packageURL = new URL('../package.json', pathToFileURL(resolve('@codemirror/state')));
  const info = JSON.parse(await readFile(packageURL, 'utf8')), version = info.version;
  const entry = new URL(info.exports.import, packageURL);
  assert.equal(version, '6.7.6');
  const source = await readFile(fileURLToPath(entry), 'utf8');
  const sourceSHA256 = createHash('sha256').update(source).digest('hex');
  assert.equal(sourceSHA256, 'cf4ffe7d177bf2c7c5da66c49be0811cc79a29e12cb658238876bbdcef12939c');
  const importStatement = "import { findClusterBreak as findClusterBreak$1 } from '@marijn/find-cluster-break';";
  assert.equal(source.split(importStatement).length, 2);assert.ok(source.startsWith(importStatement));
  const exports = source.match(/^export \{[^\n]*\};$/gm);
  assert.equal(exports?.length, 1);assert.ok(source.trimEnd().endsWith(exports[0]));
  let body = pairedSource(source).replace(importStatement, '').replace(exports[0], '');
  const diagnosticExport = 'export { pairedStats };';
  assert.equal(body.split(diagnosticExport).length, 2);body = body.replace(diagnosticExport, '');
  assert.ok(!/^\s*(import|export)\s/m.test(body));assert.ok(!/\bawait\b/.test(body));
  const dependency = createRequire(import.meta.url)('@marijn/find-cluster-break').findClusterBreak;
  assert.equal(typeof dependency, 'function');
  // A strict factory needs no dynamic-import callback from the Vitest VM.
  const factory = new Function('findClusterBreak$1', '"use strict";\n' + body + '\nreturn { RangeSet, pairedStats };');
  return { module: factory(dependency), version, sourceSHA256 };
}

// Transform a resolved in-memory copy of state 6.7.6. This is not an app patch.
export function pairedSource(source) {
  const replace = (from, to) => { assert.equal(source.split(from).length, 2, from); source = source.replace(from, to); };
  replace('function findSharedChunks(a, b, textDiff) {', 'function findSharedChunks(a, b, textDiff, allowPositive = false) {');
  replace('if (set.chunk[i].maxPoint <= 0)', 'if (allowPositive || set.chunk[i].maxPoint <= 0)');
  replace('let sharedChunks = findSharedChunks(a, b, textDiff);', `let sharedChunks = findSharedChunks(a, b, textDiff);
        let pairedChunks = minPointSize >= 0 && a.length === 1 && b.length === 1 &&
            a[0].nextLayer.isEmpty && b[0].nextLayer.isEmpty ? findSharedChunks(a, b, textDiff, true) : null;`);
  replace('compare(sideA, fromA, sideB, fromB, length, comparator)', 'compare(sideA, fromA, sideB, fromB, length, comparator, pairedChunks)');
  replace('function compare(a, startA, b, startB, length, comparator) {', 'function compare(a, startA, b, startB, length, comparator, pairedChunks = null) {');
  replace('for (let boundChange = false;;) {', `for (let boundChange = false;;) {
        if (!boundChange && pairedChunks) {
            let jumped = pairedPointJump(a, b, dPos, pos, endB, pairedChunks);
            if (jumped != null) pos = jumped;
        }`);
  return source + `
const pairedStats = { jumps: 0, rangesSkipped: 0 };
function pairedPointJump(a, b, delta, pos, end, shared) {
    // The caller's guard permits only one eligible layer on each side.
    // Thus no other eligible cursor can enter this shared chunk or its edges.
    if (!a.point || a.point !== b.point || a.to + delta !== b.to ||
        a.pointFrom + delta !== b.pointFrom || a.point.startSide !== b.point.startSide ||
        a.endSide !== b.endSide || a.active.length || b.active.length) return null;
    let x = a.cursor, y = b.cursor;
    if (!(x instanceof LayerCursor) || !(y instanceof LayerCursor) ||
        x.minPoint < 0 || x.minPoint !== y.minPoint ||
        !x.layer.nextLayer.isEmpty || !y.layer.nextLayer.isEmpty) return null;
    let xi = x.chunkIndex, yi = y.chunkIndex;
    let chunk = x.layer.chunk[xi];
    if (!chunk || chunk !== y.layer.chunk[yi] || chunk.maxPoint <= 0 || !shared.has(chunk) ||
        x.rangeIndex < 1 || x.rangeIndex !== y.rangeIndex) return null;
    let next = x.rangeIndex - 1, left = x.layer.chunkPos[xi], right = y.layer.chunkPos[yi];
    // A LayerCursor can hold the preceding chunk's last value after its index
    // advances. Check current bounds and value before using the new index.
    if (left + delta !== right || x.value !== chunk.value[next] || y.value !== chunk.value[next] ||
        x.from !== left + chunk.from[next] || y.from !== right + chunk.from[next] ||
        x.to !== left + chunk.to[next] || y.to !== right + chunk.to[next]) return null;
    let last = chunk.value.length - 1;
    while (last > next && (!chunk.value[last].point || chunk.to[last] - chunk.from[last] < x.minPoint ||
        chunk.to[last] === chunk.from[last])) last--;
    if (last <= next || !chunk.value[last].point || chunk.to[last] === chunk.from[last] ||
        right + chunk.to[last] >= end || right + chunk.from[last] <= pos) return null;
    const resume = (span, cursor, index, start) => {
        cursor.rangeIndex = index;
        cursor.next();
        span.to = start;
        span.point = null;
        span.next();
    };
    // Both cursors re-enter through the normal operations on the last common
    // positive point. Its full context remains for following boundary points.
    resume(a, x, last, left + chunk.from[last]);
    resume(b, y, last, right + chunk.from[last]);
    pairedStats.jumps++;
    pairedStats.rangesSkipped += last - next;
    return right + chunk.from[last];
}
export { pairedStats };
`;
}
