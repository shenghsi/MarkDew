import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const directory = process.argv[2];
if (!directory) throw new Error('Supply the raw profile directory');
const files = readdirSync(directory).filter(file => file.endsWith('.cpuprofile')).sort();
if (files.length !== 60) throw new Error('Expected all 60 edit profiles');
const groups = new Map();
const has = (frames, name, suffix) => frames.some(frame => frame.functionName === name && frame.url.endsWith(suffix));
function stage(frames) {
  if (has(frames, 'previewDecorations', '/src/web/preview.ts')) return 'decoration construction';
  if (has(frames, 'collectCachedPreview', '/src/web/preview.ts')) return 'cached preview collection';
  if (has(frames, 'createIndex', '/src/web/preview-index.ts')) return 'preview index eligibility';
  if (has(frames, 'update', '/src/web/preview.ts')) return 'other preview work';
  if (has(frames, 'update', '/src/web/footnotes.ts')) return 'footnote model';
  if (has(frames, 'update', '/src/web/source.ts')) return 'source record';
  if (frames.some(frame => frame.url.includes('/@codemirror/language/'))) return 'language parsing';
  return 'other state or dirty comparison';
}
for (const file of files) {
  const match = /^(start|middle|end)-(\d+)\.cpuprofile$/.exec(file);
  if (!match || +match[2] >= 20) throw new Error(`Unexpected profile ${file}`);
  const group = groups.get(match[1]) || { files: 0, all: 0, accepted: 0, gc: 0, stages: new Map(), self: new Map() };
  group.files++;
  const profile = JSON.parse(readFileSync(join(directory, file), 'utf8'));
  const nodes = new Map(profile.nodes.map(node => [node.id, node])), parents = new Map();
  for (const node of profile.nodes) for (const child of node.children || []) parents.set(child, node.id);
  const stacks = new Map();
  function stack(id) {
    if (stacks.has(id)) return stacks.get(id);
    const parent = parents.get(id), frames = [nodes.get(id).callFrame, ...(parent ? stack(parent) : [])];
    stacks.set(id, frames); return frames;
  }
  if (profile.samples.length !== profile.timeDeltas.length) throw new Error('Incomplete sample deltas');
  for (let index = 0; index < profile.samples.length; index++) {
    const frames = stack(profile.samples[index]), us = profile.timeDeltas[index]; group.all += us;
    const accepted = has(frames, 'applyNoteGrowth', '/tests/performance/note-profile.test.ts');
    if (!accepted && frames.some(frame => frame.functionName === '(garbage collector)')) group.gc += us;
    if (!accepted) continue;
    group.accepted += us;
    const category = stage(frames); group.stages.set(category, (group.stages.get(category) || 0) + us);
    const leaf = frames[0], label = `${leaf.functionName || '(anonymous)'} @ ${leaf.url}:${leaf.lineNumber + 1}`;
    group.self.set(label, (group.self.get(label) || 0) + us);
  }
  groups.set(match[1], group);
}
const ordered = (values, total) => [...values].sort((a, b) => b[1] - a[1]).map(([name, us]) => ({ name, sampledMs: +(us / 1000).toFixed(3), percent: +(us / total * 100).toFixed(2) }));
for (const group of groups.values()) if (group.files !== 20 || !group.accepted) throw new Error('Missing route samples');
console.log(JSON.stringify({ scope: 'CPU samples with applyNoteGrowth ancestry only; profiling ends before each oracle. Unattached GC is separate, and no sampled total is an edit-latency result.',
  routes: [...groups].map(([location, group]) => ({ location, profiles: group.files, allSampledMs: +(group.all / 1000).toFixed(3), updateSampledMs: +(group.accepted / 1000).toFixed(3), unattachedGcSampledMs: +(group.gc / 1000).toFixed(3),
    stages: ordered(group.stages, group.accepted), self: ordered(group.self, group.accepted).slice(0, 25) })) }, null, 2));
