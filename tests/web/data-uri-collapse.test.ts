// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { collapseDataUris } from '../../src/web/data-uri-collapse';

Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); });
const data = 'A'.repeat(4000);
const editor = (doc: string) => view = new EditorView({ parent: document.body,
  state: EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage }), collapseDataUris] }) });

it('shows a long base64 payload as a small label and leaves the document text alone', () => {
  const source = `Text\n\n![](<data:image/png;base64,${data}>)\n\nEnd`, v = editor(source);
  expect(v.state.doc.toString()).toBe(source);
  expect(v.dom.querySelector('.cm-data-collapsed')?.textContent).toBe('image data · 2.9 KB');
  expect(v.contentDOM.textContent).not.toContain('AAAAAAAAAA');
  expect(v.contentDOM.textContent).toContain('![](<data:image/png;base64,');
  // The label is atomic: the cursor moves over the whole payload.
  const start = source.indexOf(';base64,') + 8;
  expect(v.state.facet(EditorView.atomicRanges)[0](v)!.iter().from).toBe(start);
});
it('keeps short data and ordinary text visible, and follows document edits', () => {
  const v = editor('![](<data:image/png;base64,iVBORw0KGgo=>) plain');
  expect(v.dom.querySelector('.cm-data-collapsed')).toBeNull();
  v.dispatch({ changes: { from: 0, insert: `![](<data:image/png;base64,${data}>) ` } });
  expect(v.dom.querySelectorAll('.cm-data-collapsed')).toHaveLength(1);
  v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: 'gone' } });
  expect(v.dom.querySelector('.cm-data-collapsed')).toBeNull();
});

import { shortDestination } from '../../src/web/images';
it('names the type and size of a long data URI in image messages, and leaves other destinations alone', () => {
  expect(shortDestination('data:image/png;base64,' + 'A'.repeat(5000))).toBe('data:image/png;base64,… (5000 characters)');
  expect(shortDestination('data:image/png;base64,iVBOR')).toBe('data:image/png;base64,iVBOR');
  expect(shortDestination('doc.assets/image-' + 'a'.repeat(200) + '.png')).toHaveLength(221);
});
