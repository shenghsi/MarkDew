// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { documentLanguage } from '../../src/web/document-language';
import { livePreview, previewField } from '../../src/web/preview';
import { completeDocument, createIndex } from '../../src/web/preview-index';

it.skipIf(process.env.MARKDEW_INDEX_BENCH !== '1')('measures complete block-index creation separately from edits', () => {
  const block = '# Heading\n\nParagraph with **strong text**, `code`, and words.\n\n';
  for (const bytes of [100 * 1024, 1024 * 1024]) for (const note of [false, true]) {
    const source = (note ? 'Reference[^n].\n\n' : '') + block.repeat(Math.ceil(bytes / block.length)) +
      (note ? '\n[^n]: Note.\n' : '');
    let state = EditorState.create({ doc: source, extensions: [documentLanguage(), livePreview] });
    expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull();
    state = state.update({}).state;
    expect(completeDocument(state)).toBeDefined();
    const timings: number[] = [];
    let blocks = 0;
    for (let sample = 0; sample < 20; sample++) {
      const start = performance.now(), index = createIndex(state, state.field(previewField).decorations);
      timings.push(performance.now() - start);
      expect(!!index).toBe(!note); blocks = index?.blocks.size || 0;
    }
    const sorted = [...timings].sort((a, b) => a - b);
    console.log(JSON.stringify({ benchmark: 'preview-index-creation', node: process.version, platform: process.platform,
      arch: process.arch, requestedBytes: bytes, note, initialUnits: source.length, blocks, samples: 20,
      median: +((sorted[9] + sorted[10]) / 2).toFixed(3), p95: +sorted[18].toFixed(3),
      timings: timings.map(value => +value.toFixed(3)), units: 'ms',
      scope: 'complete index creation on a settled document; excludes parsing, source, decoration building, DOM and native frames; first sample included' }));
  }
}, 30000);
