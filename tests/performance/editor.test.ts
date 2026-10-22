// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { EditorState, Extension } from '@codemirror/state';
import { history } from '@codemirror/commands';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { documentLanguage } from '../../src/web/document-language';
import { footnoteField, footnotes, freshFootnotes } from '../../src/web/footnotes';
import { collectCachedPreview, collectPreview, livePreview, previewDecorations, previewField, previewItems } from '../../src/web/preview';
import { headings } from '../../src/web/navigation';
import { fromSource, sourceExtensions, savedSource, sourceField } from '../../src/web/source';

type Route = 'source-record' | 'source-mode' | 'live-preview' | 'live-preview-note';
const samples = 20;
function fixture(size: number, note: boolean) {
  const block = '# Heading\n\nParagraph with **strong text**, `code`, and words.\n\n';
  const prefix = note ? 'Reference[^n].\n\n' : '', suffix = note ? '\n\n[^n]: A note.\n' : '';
  return prefix + block.repeat(Math.ceil(size / block.length)).slice(0, size - prefix.length - suffix.length) + suffix;
}
function create(source: string, route: Route) {
  const extensions: Extension[] = [sourceExtensions(fromSource(source)), history()];
  if (route !== 'source-record') extensions.push([documentLanguage(), footnoteField]);
  if (route.startsWith('live-preview')) extensions.push(livePreview);
  let state = EditorState.create({ doc: source, extensions });
  if (route !== 'source-record') {
    expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull();
    state = state.update({}).state;
    expect(syntaxTree(state).length).toBe(state.doc.length);
  }
  return state;
}
function stats(values: number[]) {
  values.sort((a, b) => a - b);
  return { median: +(0.5 * (values[9] + values[10])).toFixed(3), p95: +values[18].toFixed(3),
    min: +values[0].toFixed(3), max: +values[19].toFixed(3) };
}
it.skipIf(process.env.MARKDEW_BENCH !== '1')('measures settled editor-state updates without DOM layout or native input', async () => {
  console.log(JSON.stringify({ benchmark: 'editor-state', date: new Date().toISOString(), node: process.version,
    platform: process.platform, arch: process.arch, samples, units: 'ms', scope: 'state transaction, dirty comparison, and outline collection; no DOM, native IPC, layout, or screen frame' }));
  for (const bytes of [100 * 1024, 1024 * 1024]) for (const route of ['source-record', 'source-mode', 'live-preview', 'live-preview-note'] as const) {
    const original = fixture(bytes, route === 'live-preview-note');
    expect(original.length).toBe(bytes);
    const started = performance.now(), initial = create(original, route), setupMs = performance.now() - started;
    console.log(JSON.stringify({ bytes, route, setupMs: +setupMs.toFixed(3) }));
    for (const location of ['start', 'middle', 'end'] as const) {
      const position = location === 'start' ? 30 : location === 'middle' ? Math.floor(bytes / 2) : bytes - 30;
      let state = initial;
      const timings: number[] = [], updates: number[] = [], dirtyChecks: number[] = [], outline: number[] = [];
      for (let sample = 0; sample < samples; sample++) {
        const insert = sample % 2 ? 'Q' : 'Z', start = performance.now();
        state = state.update({ changes: { from: position, to: position + 1, insert }, selection: { anchor: position + 1 } }).state;
        const updated = performance.now();
        const dirty = savedSource(state.field(sourceField)) !== original;
        const checked = performance.now();
        if (route !== 'source-record') headings(state);
        const collected = performance.now();
        updates.push(updated - start); dirtyChecks.push(checked - updated); outline.push(collected - checked);
        timings.push(collected - start);
        expect(dirty).toBe(true);
        expect(savedSource(state.field(sourceField))).toBe(original.slice(0, position) + insert + original.slice(position + 1));
        // Let the runner publish progress between samples; this wait is off clock.
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      console.log(JSON.stringify({ bytes, route, location, ...stats(timings), stages: {
        update: stats(updates), dirty: stats(dirtyChecks), outline: stats(outline),
      } }));
    }
  }
}, 120000);

it.skipIf(process.env.MARKDEW_UNICODE_BENCH !== '1')('measures guarded Unicode word edits and the fresh footnote parser', async () => {
  console.log(JSON.stringify({ benchmark: 'unicode-footnote-state', date: new Date().toISOString(), node: process.version,
    platform: process.platform, arch: process.arch, samples, units: 'ms', scope: 'source-mode state transactions and separate fresh footnote parse; no preview, outline, DOM, IME, or screen frame' }));
  for (const utf16Units of [100 * 1024, 1024 * 1024]) {
    const prefix = 'A原文Z words[^n].\n\n', suffix = '\n\n[^n]: Note.\n';
    const source = prefix + fixture(utf16Units - prefix.length - suffix.length, false) + suffix;
    let state = create(source, 'source-mode');
    const updates: number[] = [], fresh: number[] = [], model = footnotes(state);
    for (let sample = 0; sample < samples; sample++) {
      const insert = ['中文', 'かな', '문장', '𠀀'][sample % 4];
      let start = performance.now();
      state = state.update({ changes: { from: 1, to: 3, insert }, selection: { anchor: 3 } }).state;
      updates.push(performance.now() - start);
      start = performance.now(); const reference = freshFootnotes(state); fresh.push(performance.now() - start);
      expect(footnotes(state)).toBe(model);
      expect(footnotes(state)).toEqual(reference);
      expect(savedSource(state.field(sourceField))).toBe(source.slice(0, 1) + insert + source.slice(3));
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    console.log(JSON.stringify({ utf16Units, initialUtf8Bytes: Buffer.byteLength(source), updates: stats(updates), freshParse: stats(fresh) }));
  }
}, 120000);

it.skipIf(process.env.MARKDEW_PROSE_BENCH !== '1')('measures prose separator edits and fresh parsing without DOM layout', async () => {
  for (const utf16Units of [100 * 1024, 1024 * 1024]) {
    const prefix = 'Alpha beta words[^n].\n\n', suffix = '\n\n[^n]: Note.\n';
    const source = prefix + fixture(utf16Units - prefix.length - suffix.length, false) + suffix;
    let state = create(source, 'source-mode');
    const updates: number[] = [], fresh: number[] = [], model = footnotes(state);
    for (let sample = 0; sample < samples; sample++) {
      const insert = sample % 2 ? ' ' : '\t';
      let start = performance.now();
      state = state.update({ changes: { from: 5, to: 6, insert }, selection: { anchor: 6 } }).state;
      updates.push(performance.now() - start);
      start = performance.now(); const reference = freshFootnotes(state); fresh.push(performance.now() - start);
      expect(footnotes(state)).toBe(model); expect(footnotes(state)).toEqual(reference);
      expect(savedSource(state.field(sourceField))).toBe(source.slice(0, 5) + insert + source.slice(6));
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    console.log(JSON.stringify({ benchmark: 'prose-separator-state', date: new Date().toISOString(),
      node: process.version, platform: process.platform, arch: process.arch, samples, utf16Units,
      units: 'ms', scope: 'source-mode state update and separate fresh parse; no preview, outline, DOM, IME or screen frame',
      updates: stats(updates), freshParse: stats(fresh) }));
  }
}, 120000);

it.skipIf(process.env.MARKDEW_PREVIEW_BENCH !== '1')('measures preview stages and selection updates without DOM layout', async () => {
  console.log(JSON.stringify({ benchmark: 'preview-state', date: new Date().toISOString(), node: process.version,
    platform: process.platform, arch: process.arch, samples, units: 'ms', scope: 'collection, full decoration construction, and selection-only state transactions; no DOM or screen frame' }));
  for (const bytes of [100 * 1024, 1024 * 1024]) {
    const source = fixture(bytes, false), initial = create(source, 'live-preview');
    const collection: number[] = [], cachedCollection: number[] = [], decoration: number[] = [], reusedDecoration: number[] = [], selection: number[] = [];
    const retainedItems = previewItems(initial);
    let state = initial;
    for (let sample = 0; sample < samples; sample++) {
      let start = performance.now();
      const items = collectPreview(initial, syntaxTree(initial));
      collection.push(performance.now() - start);
      start = performance.now(); collectCachedPreview(initial, syntaxTree(initial));
      cachedCollection.push(performance.now() - start);
      start = performance.now(); previewDecorations(initial, items);
      decoration.push(performance.now() - start);
      start = performance.now(); previewDecorations(initial, retainedItems, true);
      reusedDecoration.push(performance.now() - start);
      start = performance.now();
      state = state.update({ selection: { anchor: Math.floor((sample + 1) * bytes / (samples + 1)) } }).state;
      selection.push(performance.now() - start);
      expect(state.doc).toBe(initial.doc);
      expect(previewItems(state)).toBe(previewItems(initial));
      expect(savedSource(state.field(sourceField))).toBe(source);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    console.log(JSON.stringify({ bytes, collection: stats(collection), cachedCollection: stats(cachedCollection), decoration: stats(decoration), reusedDecoration: stats(reusedDecoration), selection: stats(selection) }));
  }
}, 120000);
