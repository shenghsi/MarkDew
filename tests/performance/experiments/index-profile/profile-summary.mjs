import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const file=process.argv[2], bytes=readFileSync(file);
const profile = JSON.parse((file.endsWith('.gz')?gunzipSync(bytes):bytes).toString('utf8'));
const nodes = new Map(profile.nodes.map(node => [node.id, node])), parents = new Map();
for (const node of profile.nodes) for (const child of node.children || []) parents.set(child, node.id);
const stacks = new Map();
function stack(id) {
  if (stacks.has(id)) return stacks.get(id);
  const parent = parents.get(id), frames = [nodes.get(id).callFrame, ...(parent ? stack(parent) : [])];
  stacks.set(id, frames); return frames;
}
const has = (frames, name, suffix) => frames.some(frame => frame.functionName === name && frame.url.endsWith(suffix));
function stage(frames) {
  if (has(frames, 'updateIndex', '/src/web/preview-index.ts')) return 'local preview index';
  if (has(frames, 'update', '/src/web/preview.ts')) return 'full preview fallback';
  if (has(frames, 'update', '/src/web/source.ts')) return 'source record';
  if (has(frames, 'update', '/src/web/footnotes.ts')) return 'footnote model';
  if (frames.some(frame => frame.url.includes('/@codemirror/language/'))) return 'language parsing';
  return 'other state update';
}
const stages = new Map(), self = new Map();
let total = 0, plain = 0;
for (let index = 0; index < profile.samples.length; index++) {
  const frames = stack(profile.samples[index]), us = profile.timeDeltas[index]; total += us;
  if (!has(frames, 'applyPlainGrowth', '/tests/performance/preview-growth.test.ts')) continue;
  plain += us;
  const group = stage(frames); stages.set(group, (stages.get(group) || 0) + us);
  const leaf = frames[0], label = `${leaf.functionName || '(anonymous)'} @ ${leaf.url}:${leaf.lineNumber + 1}`;
  self.set(label, (self.get(label) || 0) + us);
}
const ordered = values => [...values].sort((left, right) => right[1] - left[1])
  .map(([name, us]) => ({ name, sampledMs: +(us / 1000).toFixed(3), percent: +(us / plain * 100).toFixed(2) }));
console.log(JSON.stringify({ scope: 'CPU samples under applyPlainGrowth: plain growing state updates only; excludes setup, footnote routes, fresh oracle, dirty comparison, DOM and unattached GC',
  allSampledMs: +(total / 1000).toFixed(3), plainStateUpdateSampledMs: +(plain / 1000).toFixed(3),
  stages: ordered(stages), self: ordered(self).slice(0, 25) }, null, 2));
