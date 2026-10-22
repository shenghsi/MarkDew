// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { Session } from 'node:inspector';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EditorState } from '@codemirror/state';
import { history } from '@codemirror/commands';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { documentLanguage } from '../../src/web/document-language';
import { collectPreview, livePreview, previewDecorations, previewField } from '../../src/web/preview';
import { footnotes } from '../../src/web/footnotes';
import { fromSource, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

// A named boundary permits attribution without counting inspector overhead,
// setup, or the independent oracle. This is a CPU diagnostic, not a time gate.
function applyNoteGrowth(state: EditorState, at: number, insert: string, baseline: string) {
  const next = state.update({ changes: { from: at, insert }, selection: { anchor: at + insert.length }, userEvent: 'input.type' }).state;
  return { state: next, dirty: savedSource(next.field(sourceField)) !== baseline };
}
it.skipIf(process.env.MARKDEW_NOTE_PROFILE !== '1')('profiles all growing note edits with independent source and decoration checks', async () => {
  const directory = process.env.MARKDEW_PROFILE_DIR;
  if (!directory) throw new Error('Set MARKDEW_PROFILE_DIR to an existing output directory');
  const block = '# Heading\n\nParagraph with **strong text**, `code`, and words.\n\n';
  const bytes = 1024 * 1024, prefix = 'Reference[^n].\n\n', suffix = '\n\n[^n]: A note.\n';
  const original = prefix + block.repeat(Math.ceil(bytes / block.length)).slice(0, bytes - prefix.length - suffix.length) + suffix;
  let initial = EditorState.create({ doc: original, selection: { anchor: original.length }, extensions: [sourceExtensions(fromSource(original)), history(), documentLanguage(), livePreview] });
  expect(ensureSyntaxTree(initial, initial.doc.length, 10000)).not.toBeNull(); initial = initial.update({}).state;
  const session = new Session(); session.connect();
  const post = (method: string, parameters: object = {}) => new Promise<any>((resolve, reject) => session.post(method as any, parameters, (error, result) => error ? reject(error) : resolve(result)));
  try {
    await post('Profiler.enable'); await post('Profiler.setSamplingInterval', { interval: 1000 });
    for (const location of ['start', 'middle', 'end']) {
      let state = initial, expected = original;
      let at = (location === 'end' ? original.lastIndexOf('Paragraph') : original.indexOf('Paragraph', location === 'middle' ? bytes / 2 : 0)) + 3;
      const publishedLengths: number[] = [], footnoteReuse: boolean[] = [], modes: string[] = [];
      for (let sample = 0; sample < 20; sample++) {
        const insert = sample % 2 ? '中' : 'Z', prior = footnotes(state);
        await post('Profiler.start');
        const result = applyNoteGrowth(state, at, insert, original);
        const { profile } = await post('Profiler.stop');
        // Raw generated diagnostics belong to the explicit output directory.
        writeFileSync(join(directory, `${location}-${sample}.cpuprofile`), JSON.stringify(profile));
        state = result.state; expected = expected.slice(0, at) + insert + expected.slice(at); at += insert.length;
        expect(result.dirty).toBe(true); expect(savedSource(state.field(sourceField))).toBe(expected);
        const tree = syntaxTree(state); publishedLengths.push(tree.length);
        expect(tree.length).toBe(state.doc.length);
        footnoteReuse.push(footnotes(state) === prior); modes.push(state.field(previewField).mode);
        const actual = state.field(previewField).decorations.iter(), reference = previewDecorations(state, collectPreview(state, tree)).iter();
        while (actual.value && reference.value) {
          expect(actual.from).toBe(reference.from); expect(actual.to).toBe(reference.to); expect(actual.value.eq(reference.value)).toBe(true);
          actual.next(); reference.next();
        }
        expect(actual.value).toBeNull(); expect(reference.value).toBeNull();
      }
      console.log(JSON.stringify({ diagnostic: 'note-edit-cpu', location, bytes, samples: 20, publishedLengths, footnoteReuse, modes,
        node: process.version, platform: process.platform, arch: process.arch, scope: 'CPU samples under applyNoteGrowth, state transaction and dirty comparison; excludes setup, oracle, inspector, DOM, native input and frames' }));
    }
  } finally { session.disconnect(); }
}, 180000);
