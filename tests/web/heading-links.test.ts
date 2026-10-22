// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { ensureSyntaxTree, Language, defineLanguageFacet } from '@codemirror/language';
import { Parser, Tree } from '@lezer/common';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { linkTarget, followLink, linkNavigation } from '../../src/web/link-navigation';
import { footnoteField } from '../../src/web/footnotes';
import { livePreview } from '../../src/web/preview';
import { fromSource, normalize, sourceExtensions, sourceField, savedSource } from '../../src/web/source';

Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); vi.restoreAllMocks(); });
function state(source: string, preview = false) {
  const record = fromSource(source);
  let value = EditorState.create({ doc: normalize(record.raw), extensions: [documentLanguage(), footnoteField,
    sourceExtensions(record), history(), ...(preview ? [livePreview] : [])] });
  expect(ensureSyntaxTree(value, value.doc.length, 1000)).not.toBeNull(); return value.update({}).state;
}
function target(source: string, label = '[go]') {
  const value = state(source), position = value.doc.toString().indexOf(label) + 1;
  const result = linkTarget(value, position);
  return typeof result === 'object' && result.kind === 'heading' ? result.position : result;
}
it('uses package Unicode, duplicate, formatted, image-alt and empty heading slugs', () => {
  for (const [heading, fragment] of [['# 日本語 **Text**', encodeURIComponent('日本語-text')],
    ['# Hello\n\n# Hello', 'hello-1'], ['# Hello\n\n# Hello-1\n\n# Hello', 'hello-2'],
    ['# **Bold** ![Diagram](image.png) &amp; <em>Text</em>', 'bold-diagram--text'], ['#', '']]) {
    const source = `[go](#${fragment})\n\n${heading}`;
    const expected = fragment === '' ? 0 : heading.includes('\n\n') ? source.lastIndexOf('# Hello') : source.indexOf(heading);
    expect(target(source)).toBe(expected);
  }
  const empty = '[go](#-1)\n\n#\n\n#';
  expect(target(empty)).toBe(empty.lastIndexOf('#'));
});
it('resolves full, collapsed and shortcut references from the first package definition', () => {
  for (const link of ['[go][REF]', '[Ref][]', '[Ref]']) {
    const source = `${link}\n\n[ref]: #first\n[REF]: #second\n\n# First\n\n# Second`;
    expect(target(source, link)).toBe(source.indexOf('# First'));
  }
  const source = '[go][ref]\n\n[ref]: #first\n\n# First\n\n# Second', initial = state(source);
  const from = source.indexOf('#first');
  const changed = initial.update({ changes: { from, to: from + 6, insert: '#second' } }).state;
  expect(linkTarget(changed, 1)).toEqual({ kind: 'heading', position: changed.doc.toString().indexOf('# Second') });
});
it('matches package container heading bounds and skips metadata/code/note-definition headings', () => {
  const source = '---\ntitle: "# Target"\n---\n\n[go](#target)\n\n```md\n# Target\n```\n\n[^n]: Note\n\n    # Target\n\n> ## Target';
  expect(target(source)).toBe(source.lastIndexOf('## Target'));
  const setext = '[go](#target)\n\n- Item\n\n  Target\n  ------';
  expect(target(setext)).toBe(setext.indexOf('Target'));
  const protectedSource = '# Target\n\n[^n]: [go](#target)\n\nUse[^n].';
  expect(target(protectedSource)).toBeUndefined();
  const definitionOnly = '[go](#only)\n\n[^n]: Note\n\n    # Only\n\nUse[^n].';
  expect(target(definitionOnly)).toMatch(/not found/);
  const duplicate = '[go](#target-1)\n\n[^n]: Note\n\n    # Target\n\n# Target\n\n# Target\n\nUse[^n].';
  expect(target(duplicate)).toBe(duplicate.lastIndexOf('# Target'));
});
it('leaves source, selection, focus and history unchanged for failed targets', () => {
  const report = vi.fn();
  for (const destination of ['#missing', '#bad%ZZ', '#%2520', 'https://example.com']) {
    const source = `[go](${destination})\n\n# Target`, initial = state(source);
    view = new EditorView({ state: initial, parent: document.body });
    const button = document.createElement('button'); document.body.append(button); button.focus();
    expect(followLink(view, 1, report)).toBe(true);
    expect(view.state).toBe(initial); expect(document.activeElement).toBe(button); expect(undoDepth(view.state)).toBe(0);
    expect(savedSource(view.state.field(sourceField))).toBe(source); expect(report).toHaveBeenCalled();
    view.destroy(); view = undefined;
  }
});
it('retains exact source and edit history in both display modes, with Unicode and mixed endings', () => {
  const original = '\uFEFF[go](#target)\r\n\r\n# Target\r\n\rEnd\n';
  for (const preview of [false, true]) {
    view = new EditorView({ state: state(original, preview), parent: document.body });
    view.dispatch({ changes: { from: view.state.doc.length, insert: 'x' }, userEvent: 'input.type' });
    expect(followLink(view, 1, () => {})).toBe(true);
    expect(view.state.selection.main.head).toBe(view.state.doc.toString().indexOf('# Target'));
    expect(undoDepth(view.state)).toBe(1); expect(savedSource(view.state.field(sourceField))).toBe(original + 'x');
    expect(undo(view)).toBe(true); expect(savedSource(view.state.field(sourceField))).toBe(original);
    expect(redo(view)).toBe(true); expect(savedSource(view.state.field(sourceField))).toBe(original + 'x');
    view.destroy(); view = undefined;
  }
});
it('rejects cross-link selections, composition and busy commands and permits read-only navigation', () => {
  const source = '[go](#target)\n\n# Target';
  let initial = state(source);
  expect(linkTarget(initial.update({ selection: EditorSelection.range(1, 16) }).state, 1)).toMatch(/selection/);
  view = new EditorView({ state: initial, parent: document.body });
  Object.defineProperty(view, 'compositionStarted', { configurable: true, value: true });
  expect(followLink(view, 1, () => {})).toBe(true); expect(view.state).toBe(initial);
  Object.defineProperty(view, 'compositionStarted', { configurable: true, value: false });
  expect(followLink(view, 1, () => {}, () => 'Busy')).toBe(true); expect(view.state).toBe(initial);
  initial = EditorState.create({ doc: source, extensions: [documentLanguage(), footnoteField, sourceExtensions(fromSource(source)), EditorState.readOnly.of(true)] });
  ensureSyntaxTree(initial, initial.doc.length, 1000); view.setState(initial.update({}).state);
  expect(followLink(view, 1, () => {})).toBe(true); expect(view.state.selection.main.head).toBe(source.indexOf('# Target'));
});
it('uses the current document after a state switch and leaves plain text gestures unclaimed', () => {
  const report = vi.fn(), initial = state('[go](#target)\n\n# Target');
  view = new EditorView({ state: initial, parent: document.body });
  expect(followLink(view, initial.doc.length, report)).toBe(false);
  const replacement = state('[go](#target)\n\nOther text\n\n## Target'); view.setState(replacement);
  expect(followLink(view, 1, report)).toBe(true);
  expect(view.state.selection.main.head).toBe(replacement.doc.toString().indexOf('## Target'));
});
it('retains the complete state when the package cannot finish its syntax tree', () => {
  class PendingParser extends Parser {
    createParse() {
      let stoppedAt: number | null = null;
      return { advance: () => stoppedAt !== null ? Tree.empty : null, parsedPos: 0,
        get stoppedAt() { return stoppedAt; }, stopAt(position: number) { stoppedAt = position; } };
    }
  }
  const probe = new PendingParser().createParse();
  expect(probe.advance()).toBeNull(); probe.stopAt(0); expect(probe.advance()).toBe(Tree.empty);
  const source = '[go](#target)\n\n# Target';
  const initial = EditorState.create({ doc: source, extensions: [new Language(defineLanguageFacet(), new PendingParser()),
    sourceExtensions(fromSource(source)), history()] });
  expect(linkTarget(initial, 1)).toMatch(/parsing/);
  expect(initial.selection.main.head).toBe(0);
  expect(savedSource(initial.field(sourceField))).toBe(source); expect(undoDepth(initial)).toBe(0);
}, 3000);
it('routes Mod-Enter without a source edit', () => {
  const source = '[go](#target)\n\n# Target', report = vi.fn();
  let value = EditorState.create({ doc: source, selection: { anchor: 1 }, extensions: [documentLanguage(), footnoteField,
    sourceExtensions(fromSource(source)), history(), linkNavigation(report)] });
  ensureSyntaxTree(value, value.doc.length, 1000); value = value.update({}).state;
  view = new EditorView({ state: value, parent: document.body }); view.focus();
  view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));
  expect(view.state.selection.main.head).toBe(source.indexOf('# Target')); expect(undoDepth(view.state)).toBe(0);
});
