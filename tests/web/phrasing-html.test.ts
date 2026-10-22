// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorState, StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { invoke } from '@tauri-apps/api/core';
import { documentLanguage } from '../../src/web/document-language';
import { livePreview, previewField, collectPreview, collectCachedPreview, previewDecorations, previewItems } from '../../src/web/preview';
import { imageBasePath, imagePath, imageDocument, setImagePath } from '../../src/web/images';
import { fromSource, normalize, sourceExtensions, sourceField, savedSource } from '../../src/web/source';
import { inlineHTML } from '../../src/web/inline-html';
import * as phrasing from '../../src/web/phrasing-html';
import * as images from '../../src/web/images';
import { documentImageEnvironment, phrasingProjection } from '../../src/web/renderers';
import { rasterHeader } from './raster-fixtures';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => true }));
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.mocked(invoke).mockReset(); });
function state(source: string, display: Compartment) {
  const record = fromSource(source); let current = EditorState.create({ doc: normalize(record.raw), selection: { anchor: normalize(record.raw).length },
    extensions: [sourceExtensions(record), history(), documentLanguage(), display.of(livePreview), imagePath, imageBasePath.of('/tmp/document.md'), imageDocument.of(42)] });
  expect(ensureSyntaxTree(current, current.doc.length, 1000)).not.toBeNull(); return current.update({}).state;
}
function create(source: string) {
  const display = new Compartment(); view = new EditorView({ state: state(source, display), parent: document.body });
  return { editor: view, display, source: () => savedSource(view!.state.field(sourceField)) };
}
function checkDecorations(editor: EditorView) {
  const plan = editor.state.field(previewField);
  const actual = plan.decorations.iter(), expected = previewDecorations(editor.state,
    collectPreview(editor.state, syntaxTree(editor.state), plan.imageVersion)).iter();
  while (actual.value && expected.value) {
    expect([actual.from, actual.to]).toEqual([expected.from, expected.to]); expect(actual.value.eq(expected.value)).toBe(true);
    actual.next(); expected.next();
  }
  expect(actual.value).toBeNull(); expect(expected.value).toBeNull();
}
it('renders nested HTML and Markdown with MathJax and captured images without source or history edits', async () => {
  vi.mocked(invoke).mockResolvedValue(rasterHeader('png', 1, 1).buffer);
  const revoke = vi.fn(); vi.stubGlobal('URL', class extends URL { static createObjectURL = () => 'blob:phrasing'; static revokeObjectURL = revoke; });
  const original = '\uFEFFText **<span lang="ja">日本語😀 $\\frac{1}{2}$ ![図][asset]</span>**.\r\n\r\n[asset]: image.png "Caption"\r\n\rEnd\n';
  const { editor, source } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.preview-inline-html strong span[lang=ja] svg')).not.toBeNull());
  expect(document.querySelector('.preview-inline-html img')!.getAttribute('alt')).toBe('図');
  expect(invoke).toHaveBeenCalledExactlyOnceWith('read_image', { destination: 'image.png', documentPath: '/tmp/document.md', document: 42 });
  expect(document.querySelector('.preview-inline-html iframe')).toBeNull(); expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  const widget = document.querySelector<HTMLElement>('.preview-inline-html')!;
  widget.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  expect(document.querySelector('.preview-inline-html')).toBeNull(); expect(revoke).toHaveBeenCalledWith('blob:phrasing');
  editor.dispatch({ changes: { from: 0, insert: 'New ' }, userEvent: 'input.type' }); const edited = source();
  expect(undo(editor)).toBe(true); expect(source()).toBe(original); expect(redo(editor)).toBe(true); expect(source()).toBe(edited);
});
it('preserves heading levels and quote/list source ranges and cached/full preview equivalence', async () => {
  const original = '# Press <kbd>Enter</kbd>\n\nTitle <mark>marked</mark>\n---\n\n> Use <sub>2</sub> text.\n\n- Use <sup>2</sup> text.\n\nEnd';
  const { editor, source } = create(original);
  await vi.waitFor(() => expect(document.querySelectorAll('.preview-inline-html[data-ready=true]')).toHaveLength(4));
  expect(document.querySelector('.preview-inline-html h1 kbd')!.textContent).toBe('Enter');
  expect(document.querySelector('.preview-inline-html h2 mark')!.textContent).toBe('marked');
  const tree = ensureSyntaxTree(editor.state, editor.state.doc.length, 1000)!;
  const full = collectPreview(editor.state, tree), cached = collectCachedPreview(editor.state, tree);
  const sorted = (items: typeof full) => items.map(item => JSON.stringify(item)).sort();
  expect(sorted(cached)).toEqual(sorted(full));
  const actual = editor.state.field(previewField).decorations.iter(), expected = previewDecorations(editor.state, full).iter();
  while (actual.value && expected.value) {
    expect([actual.from, actual.to]).toEqual([expected.from, expected.to]); expect(actual.value.eq(expected.value)).toBe(true);
    actual.next(); expected.next();
  }
  expect(actual.value).toBeNull(); expect(expected.value).toBeNull();
  const items = previewItems(editor.state).filter(item => item.kind === 'inline-html');
  expect(items.map(item => editor.state.doc.sliceString(item.from, item.to))).toEqual(items.map(item => item.source));
  expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
});
it('refreshes accepted image definitions outside metadata and retains missing references as source', async () => {
  vi.mocked(invoke).mockResolvedValue(rasterHeader('png', 1, 1).buffer);
  vi.stubGlobal('URL', class extends URL { static createObjectURL = () => 'blob:reference'; static revokeObjectURL = vi.fn(); });
  const original = '---\n[asset]: wrong.png\n---\n\nUse <b>![pic][asset]</b> and <i>![missing][unknown]</i>.\n\n[asset]: first.png\n\nEnd';
  const { editor, source } = create(original);
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
  expect(vi.mocked(invoke).mock.calls[0][1]).toMatchObject({ destination: 'first.png' });
  expect(document.querySelector('.preview-inline-html i')!.textContent).toBe('![missing][unknown]');
  const at = editor.state.doc.toString().indexOf('first.png'); editor.dispatch({ changes: { from: at, to: at + 9, insert: 'other.png' } });
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
  expect(vi.mocked(invoke).mock.calls[1][1]).toMatchObject({ destination: 'other.png' });
  expect(source()).toBe(original.replace('first.png', 'other.png'));
});
it('removes authored slot attributes and actions and keeps unsupported CSS isolated without resource jobs', async () => {
  const original = 'Keep <span data-table-image="0" data-table-math="0" class="preview-image" id="app" onclick="bad()" title="kept">text</span> <a href="https://example.com">link</a>.\n\nUse <span style="color:red">red</span> text.\n\nBefore <svg>$hidden$ ![bad](bad.png)</svg> after.\n\nEnd';
  const { source } = create(original);
  await vi.waitFor(() => expect(document.querySelectorAll('.preview-inline-html[data-ready]')).toHaveLength(3));
  await vi.waitFor(() => expect(document.querySelector('.preview-inline-html iframe')).not.toBeNull());
  const first = document.querySelector('.preview-inline-html')!;
  expect(first.querySelector('[data-table-image], [data-table-math], [class], [id], [onclick], a, [href]')).toBeNull();
  const frame = document.querySelector('iframe')!; expect(frame.getAttribute('sandbox')).toBe('allow-same-origin'); expect(frame.srcdoc).toContain("default-src 'none'");
  expect(frame.srcdoc).toContain('color:red');
  expect(invoke).not.toHaveBeenCalled(); expect(source()).toBe(original);
});
it('cancels deferred validation success and failure on reveal, source edit, mode, removal, tab, path and Undo', async () => {
  const mount = phrasing.mountPhrasingHTML;
  for (const action of ['reveal', 'change', 'source', 'delete', 'tab', 'path', 'undo'] as const) for (const fail of [false, true]) {
    const requests: { resolve: () => void; reject: (reason: Error) => void }[] = [];
    vi.spyOn(phrasing, 'mountPhrasingHTML').mockImplementation((dom, preview, measure) => mount(dom, preview, measure,
      () => new Promise((resolve, reject) => requests.push({ resolve: () => resolve(inlineHTML), reject }))));
    const { editor, display } = create('Use <b>$x$ ![pic](image.png)</b>.\n\nEnd');
    await vi.waitFor(() => expect(requests).toHaveLength(1)); const old = document.querySelector<HTMLElement>('.preview-inline-html')!;
    if (action === 'reveal') old.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    if (action === 'change') editor.dispatch({ changes: { from: editor.state.doc.length, insert: ' more' } });
    if (action === 'source') editor.dispatch({ effects: display.reconfigure([]) });
    if (action === 'delete') editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: 'Removed' } });
    if (action === 'tab') editor.setState(state('Other document', new Compartment()));
    if (action === 'path') editor.dispatch({ effects: setImagePath.of('/other/document.md') });
    if (action === 'undo') { editor.dispatch({ changes: { from: 0, insert: 'New ' } }); undo(editor); }
    if (fail) requests[0].reject(new Error('late')); else requests[0].resolve();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(old.querySelector('svg, img, iframe')).toBeNull(); expect(invoke).not.toHaveBeenCalled();
    editor.destroy(); view = undefined; document.body.replaceChildren(); vi.restoreAllMocks();
  }
});
it('retains global footnote numbers in HTML without links or another note section', async () => {
  const original = 'First[^other].\n\nUse <b>note[^日本語] and again[^日本語]</b> and missing[^missing].\n\n[^other]: Other\n\n[^日本語]: Note\n\nEnd';
  const { source } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.preview-inline-html b sup')?.textContent).toBe('2'));
  expect(Array.from(document.querySelectorAll('.preview-inline-html b sup'), node => node.textContent)).toEqual(['2', '2']);
  const widget = document.querySelector('.preview-inline-html')!;
  expect(widget.textContent).toContain('missing[^missing]'); expect(widget.querySelector('a, section, [id], [href]')).toBeNull();
  expect(document.querySelectorAll('.preview-footnote-definition')).toHaveLength(2); expect(source()).toBe(original);
});
it('releases partially started resources before publishing an isolated failure fallback', async () => {
  const dispose = vi.fn(); let count = 0;
  vi.spyOn(images, 'mountImage').mockImplementation(() => { if (++count === 2) throw new Error('resource start'); return dispose; });
  const original = 'Use <b>![first](one.png) ![second](two.png)</b>.\n\nEnd';
  const { source, editor } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.preview-inline-html[data-ready=isolated]')).not.toBeNull());
  expect(dispose).toHaveBeenCalledTimes(1); expect(document.querySelector('iframe')!.getAttribute('sandbox')).toBe('allow-same-origin');
  expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
});
it('renders multiline quote and nested-list paragraphs from the full body tree with exact resource ranges', async () => {
  vi.mocked(invoke).mockResolvedValue(rasterHeader('png', 1, 1).buffer);
  vi.stubGlobal('URL', class extends URL { static createObjectURL = () => 'blob:container'; static revokeObjectURL = vi.fn(); });
  const original = '\uFEFF---\r\ntitle: containers\r\n---\r\n\r\nFirst[^other].\r\n\r\n> > # Head <kbd>Enter</kbd>\r\n> >\r\n> > Use <span lang="ja">日本語😀\r\n> > **continued** $\\frac{1}{2}$ ![図][asset] note[^日本語]</span>.\r\n> >\r\n> > Uncovered quote.\r\n\r\n- Outer\r\n  - Use <b>first\r\n    **continued** $y^2$</b>.\r\n\r\n[asset]: image.png\r\n\r\n[^other]: Other\r\n\r\n[^日本語]: Note\r\n\rEnd\n';
  const { editor, source, display } = create(original);
  await vi.waitFor(() => expect(document.querySelectorAll('.preview-inline-html[data-ready=true]')).toHaveLength(3));
  await vi.waitFor(() => expect(document.querySelectorAll('.preview-inline-html svg')).toHaveLength(2));
  const quote = document.querySelector<HTMLElement>('.preview-inline-html p span[lang=ja]')!.closest<HTMLElement>('.preview-inline-html')!;
  expect(quote.style.getPropertyValue('--quote-depth')).toBe('2'); expect(quote.classList.contains('md-quote')).toBe(true);
  expect(quote.textContent).toContain('continued'); expect(quote.textContent).not.toContain('>'); expect(quote.querySelector('sup')!.textContent).toBe('2');
  expect(document.querySelector('.preview-inline-html h1 kbd')!.textContent).toBe('Enter');
  expect(invoke).toHaveBeenCalledExactlyOnceWith('read_image', { destination: 'image.png', documentPath: '/tmp/document.md', document: 42 });
  expect(document.querySelector('.preview-inline-html iframe')).toBeNull();
  const remainingQuoteLines = Array.from(document.querySelectorAll<HTMLElement>('.cm-line.md-quote'));
  expect(remainingQuoteLines.some(line => line.textContent?.includes('Uncovered quote.'))).toBe(true);
  expect(remainingQuoteLines.every(line => !line.textContent?.includes('continued'))).toBe(true);
  expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  const prefix = editor.state.doc.toString().indexOf('> > Use');
  editor.dispatch({ selection: { anchor: prefix, head: prefix + 1 } });
  checkDecorations(editor);
  expect(document.querySelector('.preview-inline-html p span[lang=ja]')).toBeNull();
  expect(Array.from(document.querySelectorAll('.cm-line'), line => line.textContent)
    .some(text => text?.includes('> > **continued**'))).toBe(true);
  expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  editor.dispatch({ selection: { anchor: editor.state.doc.length } });
  checkDecorations(editor);
  await vi.waitFor(() => expect(document.querySelector('.preview-inline-html p span[lang=ja]')).not.toBeNull());
  const currentQuote = document.querySelector<HTMLElement>('.preview-inline-html p span[lang=ja]')!.closest<HTMLElement>('.preview-inline-html')!;
  currentQuote.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  const at = editor.state.doc.toString().indexOf('日本語😀'); editor.dispatch({ changes: { from: at, insert: '新😀 ' }, userEvent: 'input.type' });
  checkDecorations(editor);
  const edited = source(); expect(edited).toBe(original.replace('日本語😀', '新😀 日本語😀'));
  expect(undo(editor)).toBe(true); expect(source()).toBe(original); checkDecorations(editor);
  expect(redo(editor)).toBe(true); expect(source()).toBe(edited); checkDecorations(editor);
  editor.dispatch({ effects: display.reconfigure([]) }); expect(document.querySelector('.preview-inline-html')).toBeNull(); expect(source()).toBe(edited);
});
it('keeps cached AST immutable and refuses mismatched type, offsets and partial parser ranges', async () => {
  const { editor, source } = create('> Use <b>first\n> second</b>.\n\nEnd');
  await vi.waitFor(() => expect(document.querySelector('.preview-inline-html[data-ready=true]')).not.toBeNull());
  const environment = documentImageEnvironment(editor.state.doc, 0), before = JSON.stringify(Array.from(environment.phrasing!.entries()));
  const item = previewItems(editor.state).find(item => item.kind === 'inline-html')!;
  const block = { from: item.from, to: item.to, type: 'paragraph' as const };
  expect(phrasingProjection(item.source!, environment, '', undefined, [], block)).toBeDefined();
  expect(phrasingProjection(item.source!, environment, '', undefined, [], { ...block, type: 'heading' })).toBeUndefined();
  expect(phrasingProjection(item.source!, environment, '', undefined, [], { ...block, from: block.from + 1 })).toBeUndefined();
  expect(phrasingProjection(item.source!.slice(0, -1), environment, '', undefined, [], { ...block, to: block.to - 1 })).toBeUndefined();
  expect(JSON.stringify(Array.from(environment.phrasing!.entries()))).toBe(before);
  expect(documentImageEnvironment(editor.state.doc, 0)).toBe(environment); expect(source()).toBe('> Use <b>first\n> second</b>.\n\nEnd');
});
it('reveals prefix-only selections with an unchanged document and syntax tree through the incremental path', async () => {
  const original = '  Text <kbd>Enter</kbd>.\n\n## Other\n\nSome **strong** text.\n\nEnd';
  const { editor, source } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.preview-inline-html[data-ready=true]')).not.toBeNull());
  const doc = editor.state.doc, tree = syntaxTree(editor.state);
  const item = previewItems(editor.state).find(item => item.kind === 'inline-html')!;
  expect(item.from).toBeGreaterThan(item.revealFrom!);
  for (const selection of [{ anchor: 0, head: 1 }, { anchor: doc.length }, { anchor: 1 }, { anchor: doc.length }]) {
    editor.dispatch({ selection });
    expect(editor.state.field(previewField).groups!.length).toBeGreaterThan(2);
    expect(editor.state.doc).toBe(doc); expect(syntaxTree(editor.state)).toBe(tree); checkDecorations(editor);
    if (selection.anchor < item.from) expect(document.querySelector('.preview-inline-html')).toBeNull();
    else await vi.waitFor(() => expect(document.querySelector('.preview-inline-html[data-ready=true]')).not.toBeNull());
    expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  }
});
it('owns list markers once, retains loose paragraphs, and reveals owner source through incremental selections', async () => {
  const original = '\uFEFF3) Use <b>first\r\n   **continued**</b>.\r\n\r\n   Later <i>paragraph</i>.\r\n\r\n- Outer\r\n  - Inner <kbd>Enter</kbd>.\r\n\r\n> - Quote <mark>text</mark>.\r\n\r\n## Other\r\n\r\nSome **strong** text.\r\n\r\nEnd\n';
  const { editor, source, display } = create(original);
  await vi.waitFor(() => expect(document.querySelectorAll('.preview-inline-html[data-ready=true]')).toHaveLength(4));
  expect(Array.from(document.querySelectorAll('.md-list-marker'), node => node.textContent)).toEqual(['3)', '•', '•', '•']);
  const combined = Array.from(document.querySelectorAll<HTMLElement>('.preview-list-paragraph'));
  expect(combined).toHaveLength(3);
  expect(combined[0].querySelector(':scope > .md-list-marker')!.textContent).toBe('3)');
  expect(combined[0].querySelector('.preview-inline-html-body b strong')!.textContent).toBe('continued');
  expect(combined[1].style.getPropertyValue('--list-depth')).toBe('1');
  expect(combined[2].classList.contains('md-quote')).toBe(true);
  expect(document.querySelector('.preview-inline-html i')!.closest('.preview-list-paragraph')).toBeNull();
  for (const item of previewItems(editor.state).filter(item => item.kind === 'inline-html')) {
    expect(editor.state.doc.sliceString(item.from, item.to)).toBe(item.source);
    if (item.listMarkers) expect(item.replaceFrom).toBeLessThan(item.from);
  }
  checkDecorations(editor);
  const doc = editor.state.doc, tree = syntaxTree(editor.state);
  for (const at of [0, doc.length, doc.toString().indexOf('Later'), doc.length]) {
    editor.dispatch({ selection: { anchor: at } }); checkDecorations(editor);
    expect(editor.state.doc).toBe(doc); expect(syntaxTree(editor.state)).toBe(tree);
    expect(editor.state.field(previewField).groups!.length).toBeGreaterThan(2);
    if (at !== doc.length) expect(document.querySelectorAll('.preview-list-paragraph')).toHaveLength(2);
    else await vi.waitFor(() => expect(document.querySelectorAll('.preview-inline-html[data-ready=true]')).toHaveLength(4));
  }
  const marker = document.querySelector<HTMLButtonElement>('.preview-list-paragraph > .md-list-marker')!;
  const key = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }); marker.dispatchEvent(key);
  expect(key.defaultPrevented).toBe(false); // Native button activation retains its own click action.
  marker.click(); expect(editor.state.selection.main.head).toBe(0); checkDecorations(editor);
  expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  editor.dispatch({ selection: { anchor: editor.state.doc.length }, changes: { from: 0, insert: 'Before\n\n' }, userEvent: 'input.type' });
  checkDecorations(editor);
  await vi.waitFor(() => expect(document.querySelectorAll('.preview-list-paragraph[data-ready=true]')).toHaveLength(3));
  document.querySelector<HTMLButtonElement>('.preview-list-paragraph > .md-list-marker')!.click();
  expect(editor.state.selection.main.head).toBe(8); checkDecorations(editor);
  const edited = source(); expect(undo(editor)).toBe(true); expect(source()).toBe(original); checkDecorations(editor);
  expect(redo(editor)).toBe(true); expect(source()).toBe(edited); checkDecorations(editor);
  editor.dispatch({ effects: display.reconfigure([]) }); expect(document.querySelector('.md-list-marker')).toBeNull(); expect(source()).toBe(edited);
});
it('renders task HTML with one checkbox and one-character history patches, retaining input guards and fallback', async () => {
  const original = '\uFEFF- [ ] 日本語 <b>first\r\n  **continued** $x^2$</b>.\r\n- [X] Styled <span style="color:red">text</span>.\r\n\r\nEnd\n';
  const { editor, source } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.preview-list-paragraph[data-ready=true] svg')).not.toBeNull());
  await vi.waitFor(() => expect(document.querySelector('.preview-list-paragraph[data-ready=isolated] iframe')).not.toBeNull());
  expect(document.querySelectorAll('.md-task-toggle')).toHaveLength(2); expect(document.querySelector('.md-list-marker')).toBeNull();
  expect(document.querySelector('.preview-inline-html-body b strong')!.textContent).toBe('continued');
  const checkbox = document.querySelector<HTMLInputElement>('.md-task-toggle')!;
  Object.defineProperty(editor, 'compositionStarted', { configurable: true, value: true });
  checkbox.click(); expect(checkbox.checked).toBe(false); expect(source()).toBe(original);
  Object.defineProperty(editor, 'compositionStarted', { configurable: true, value: false });
  const lock = new Compartment();
  editor.dispatch({ effects: StateEffect.appendConfig.of(lock.of(EditorState.readOnly.of(true))) });
  checkbox.click(); expect(source()).toBe(original); expect(checkbox.checked).toBe(false);
  editor.dispatch({ effects: lock.reconfigure([]) });
  checkbox.click(); expect(source()).toBe(original.replace('[ ]', '[x]')); expect(undoDepth(editor.state)).toBe(1); checkDecorations(editor);
  expect(undo(editor)).toBe(true); expect(source()).toBe(original); checkDecorations(editor);
  expect(redo(editor)).toBe(true); expect(source()).toBe(original.replace('[ ]', '[x]')); checkDecorations(editor);
  checkbox.click(); expect(source()).toBe(original.replace('[ ]', '[x]')); // Removed checkbox cannot patch a current source record.
  editor.dispatch({ selection: { anchor: 0 } }); checkDecorations(editor);
  expect(document.querySelectorAll('.md-task-toggle')).toHaveLength(1); expect(undoDepth(editor.state)).toBe(1);
});
it('owns every same-line nested marker without overlapping widget replacements', async () => {
  for (const prefix of ['- - ', '1. - ', '- 3) ', '> 1. - [ ] ']) {
    const original = `${prefix}Use <kbd>Enter</kbd>.\n\n## Other\n\nSome **strong** text.\n\nEnd`;
    const { editor, source } = create(original);
    await vi.waitFor(() => expect(document.querySelector('.preview-list-paragraph[data-ready=true]')).not.toBeNull());
    const root = document.querySelector('.preview-list-paragraph')!;
    expect(root.querySelectorAll('.md-list-marker,.md-task-toggle')).toHaveLength(2);
    expect(document.querySelectorAll('.md-list-marker,.md-task-toggle')).toHaveLength(2);
    const plan = editor.state.field(previewField), combined = previewItems(editor.state).find(item => item.kind === 'inline-html')!;
    expect(combined.listMarkers).toHaveLength(2); expect(combined.listDepth).toBe(0);
    expect(combined.replaceFrom).toBe(0); checkDecorations(editor);
    const widgets: [number, number][] = [];
    for (const cursor = plan.decorations.iter(); cursor.value; cursor.next())
      if (cursor.value.spec.widget) widgets.push([cursor.from, cursor.to]);
    for (let i = 1; i < widgets.length; i++) expect(widgets[i][0]).toBeGreaterThanOrEqual(widgets[i - 1][1]);
    editor.dispatch({ selection: { anchor: prefix.length - 1 } }); checkDecorations(editor);
    expect(document.querySelector('.preview-list-paragraph')).toBeNull();
    expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
    editor.dispatch({ selection: { anchor: 0 } }); checkDecorations(editor);
    expect(document.querySelector('.preview-list-paragraph')).toBeNull();
    editor.dispatch({ selection: { anchor: editor.state.doc.length } }); checkDecorations(editor);
    await vi.waitFor(() => expect(document.querySelector('.preview-list-paragraph[data-ready=true]')).not.toBeNull());
    const marker = document.querySelector<HTMLButtonElement>('.preview-list-markers .md-list-marker')!;
    marker.click(); expect(editor.state.selection.main.head).toBe(prefix.startsWith('>') ? 2 : 0); checkDecorations(editor);
    editor.destroy(); view = undefined; document.body.replaceChildren();
  }
});
it('replaces first-line quote and indentation prefixes without empty line boxes and restores them on source reveal', async () => {
  const original = '\uFEFF> Text <b>one</b>.\r\n> > Nested <i>two</i>.\r\n\r\n  Title <kbd>Enter</kbd>\r\n===\r\n\r\nEnd\n';
  const { editor, source, display } = create(original);
  await vi.waitFor(() => expect(document.querySelectorAll('.preview-inline-html[data-ready=true]')).toHaveLength(3));
  const widgets = Array.from(document.querySelectorAll<HTMLElement>('.preview-inline-html'));
  expect(editor.contentDOM.firstElementChild).toBe(widgets[0]);
  expect(widgets[0].nextElementSibling).toBe(widgets[1]);
  const items = previewItems(editor.state).filter(item => item.kind === 'inline-html');
  expect(items.every(item => item.replaceFrom === editor.state.doc.lineAt(item.from).from)).toBe(true);
  expect(items.every(item => item.replaceFrom! < item.from)).toBe(true); checkDecorations(editor);
  const doc = editor.state.doc, tree = syntaxTree(editor.state);
  for (const item of items) {
    editor.dispatch({ selection: { anchor: item.replaceFrom! } }); checkDecorations(editor);
    expect(editor.state.doc).toBe(doc); expect(syntaxTree(editor.state)).toBe(tree);
    expect(document.querySelector(`.preview-inline-html[data-from="${item.from}"]`)).toBeNull();
    expect(Array.from(editor.contentDOM.querySelectorAll('.cm-line'), line => line.textContent)
      .some(text => text?.includes(editor.state.doc.lineAt(item.from).text))).toBe(true);
    editor.dispatch({ selection: { anchor: doc.length } }); checkDecorations(editor);
    await vi.waitFor(() => expect(document.querySelectorAll('.preview-inline-html[data-ready=true]')).toHaveLength(3));
  }
  editor.dispatch({ selection: { anchor: items[1].replaceFrom! }, changes: { from: items[1].from, insert: '新😀 ' }, userEvent: 'input.type' });
  const edited = source(); checkDecorations(editor);
  expect(undo(editor)).toBe(true); expect(source()).toBe(original); checkDecorations(editor);
  expect(redo(editor)).toBe(true); expect(source()).toBe(edited); checkDecorations(editor);
  editor.dispatch({ effects: display.reconfigure([]) }); expect(document.querySelector('.preview-inline-html')).toBeNull(); expect(source()).toBe(edited);
});
