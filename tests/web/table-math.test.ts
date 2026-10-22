// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, redo, undo, undoDepth } from '@codemirror/commands';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown } from 'mdast-util-math';
import { documentLanguage } from '../../src/web/document-language';
import { livePreview } from '../../src/web/preview';
import { tableEditor } from '../../src/web/table';
import * as mathPreview from '../../src/web/math-preview';
import { tableImageEnvironment, tableProjection } from '../../src/web/renderers';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

let view: EditorView | undefined;
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); vi.restoreAllMocks(); });
function state(source: string, display: Compartment) {
  const record = fromSource(source);
  return EditorState.create({ doc: normalize(record.raw), selection: { anchor: normalize(record.raw).length },
    extensions: [sourceExtensions(record), history(), documentLanguage(), display.of(livePreview)] });
}
function create(source: string) {
  const display = new Compartment();
  view = new EditorView({ parent: document.body, state: state(source, display) });
  return { editor: view, display, source: () => savedSource(view!.state.field(sourceField)),
    table: () => tableEditor(document.querySelector<HTMLElement>('.preview-table')!)! };
}
function packageFormulas(source: string) {
  const tree = fromMarkdown(source, { extensions: [gfm(), math()], mdastExtensions: [gfmFromMarkdown(), mathFromMarkdown()] });
  const formulas: string[] = [];
  function visit(node: typeof tree | typeof tree.children[number]) {
    if (node.type === 'inlineMath') formulas.push(node.value);
    else if ('children' in node) node.children.forEach(visit);
  }
  visit(tree); return formulas;
}

it('matches upstream GFM table formulas through inline contexts, UTF-16, code, escapes and labels', () => {
  for (const cell of ['$x_1$', '😀 **$x*y$** and $z$', '[label]: $x$', '# $x$', '    $x$',
    '\\$escaped$ and `$code$` and $real$', '[$x$](https://example.com/$dest$)',
    '![alt $x$](a.png) $y$', '[$x$][ref]', '$$x$$', '$a\\|b$',
    'Text $x_1 + \\frac{a}{b}$ tail', '<span data-table-math="0">raw</span> $x$']) {
    const source = '| A |\n| - |\n| ' + cell + ' |\n\n[ref]: https://example.com';
    const projection = tableProjection(source, tableImageEnvironment(source), '');
    expect(projection.formulas.map(formula => formula.formula), cell).toEqual(packageFormulas(source));
    const dom = document.createElement('div'); dom.innerHTML = projection.html;
    expect(dom.querySelectorAll('[data-table-math]')).toHaveLength(projection.formulas.length);
    expect(dom.querySelector('svg, a, img, [href], [src]')).toBeNull();
    if (cell.startsWith('![alt')) expect(projection.images[0].alt).toBe('alt $x$');
  }
  const escaped = tableProjection('| A |\n| - |\n| 😀 $a\\|b$ |', {}, '');
  expect(escaped.formulas[0].source).toBe('$a\\|b$');
});

it('renders MathJax fractions and AMS matrices in headers and cells without source or history changes', async () => {
  const original = '\uFEFF| $x^2$ | Notes |\r\n| - | - |\r\n| $\\frac{a}{b}$ | $\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}$ |\r\n\r\nEnd\n';
  const { source, editor } = create(original);
  await vi.waitFor(() => expect(document.querySelectorAll('.table-math svg')).toHaveLength(3));
  expect(document.querySelector('.table-math path')).not.toBeNull();
  expect(document.querySelector('.table-math [href], .table-math img')).toBeNull();
  expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
});

it('uses first accepted reference definitions with container titles and literal math in image alt text', () => {
  const table = '| A |\n| - |\n| ![**Alt** $x$][a] **[$y$][a]** $a\\|b$ |';
  const body = table + '\n\n> [a]: <first.png>\n>   "First title"\n\n[a]: later.png';
  const projection = tableProjection(table, tableImageEnvironment(body), '/notes/file.md', 7);
  expect(projection.images).toEqual([{ destination: 'first.png', title: 'First title', alt: 'Alt $x$', path: '/notes/file.md', document: 7 }]);
  expect(projection.formulas.map(formula => formula.formula)).toEqual(packageFormulas(body));
  expect(projection.formulas.map(formula => formula.source)).toEqual(['$y$', '$a\\|b$']);
  expect(projection.html).toContain('<strong>');
});

it('retains package reference labels with escaped punctuation and backslashes', () => {
  for (const label of ['a\\*b', 'a\\[b\\]', 'a\\\\b', 'A  B', 'a\\!b']) {
    const table = `| A |\n| - |\n| ![alt $x$][${label}] [$y$][${label}] |`;
    const body = table + `\n\n[${label}]: <image.png> "Title"`;
    const projection = tableProjection(table, tableImageEnvironment(body), '');
    expect(projection.images, label).toEqual([{ destination: 'image.png', title: 'Title', alt: 'alt $x$', path: '' }]);
    expect(projection.formulas.map(formula => formula.formula), label).toEqual(packageFormulas(body));
  }
});

it('keeps invalid formula source visible and retains adjacent formatting and image slots', async () => {
  const original = '| A |\n| - |\n| **Kept** $x$ $\\frac{broken$ ![图](https://example.com/a.png) |\n\nEnd';
  const { source, table } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.table-math.preview-error')).not.toBeNull());
  expect(document.querySelector('.table-math.preview-error')!.textContent).toBe('$\\frac{broken$');
  expect(document.querySelector('.table-math svg')).not.toBeNull();
  expect(document.querySelector('.preview-table strong')!.textContent).toBe('Kept');
  expect(document.querySelector('.table-image img')).not.toBeNull(); expect(source()).toBe(original);
  table().begin(1, 0); expect(table().child!.state.doc.toString()).toContain('$\\frac{broken$');
});

it('edits formula cell source with exact outer Undo and Redo across Source mode', async () => {
  const original = '\uFEFF| A | B |\r\n| - | - |\r\n| $x$ | words |\r\n\r\nEnd\n';
  const { table, editor, source, display } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.table-math svg')).not.toBeNull());
  document.querySelector('.table-math')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  const child = table().child!; expect(child.state.doc.toString()).toBe('$x$');
  child.dispatch({ changes: { from: 0, to: child.state.doc.length, insert: '$\\frac{y}{2}$' } });
  const changed = original.replace('$x$', '$\\frac{y}{2}$');
  expect(source()).toBe(changed); expect(undoDepth(editor.state)).toBe(1); expect(undoDepth(child.state)).toBe(0);
  undo(editor); expect(source()).toBe(original); expect(child.state.doc.toString()).toBe('$x$');
  redo(editor); expect(source()).toBe(changed);
  table().finish(); await vi.waitFor(() => expect(document.querySelector('.table-math svg')).not.toBeNull());
  editor.dispatch({ effects: display.reconfigure([]) }); undo(editor); expect(source()).toBe(original);
  redo(editor); expect(source()).toBe(changed); editor.dispatch({ effects: display.reconfigure(livePreview) });
  await vi.waitFor(() => expect(document.querySelector('.table-math svg')).not.toBeNull());
});

it('updates inactive formulas without replacing an active composing cell editor', async () => {
  const original = '| A | B |\n| - | - |\n| $x$ | words |\n\nEnd';
  const { editor, table, source } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.table-math svg')).not.toBeNull());
  table().begin(1, 1); const child = table().child!;
  Object.defineProperty(child, 'compositionStarted', { configurable: true, value: true });
  const at = editor.state.doc.toString().indexOf('$x$');
  editor.dispatch({ changes: { from: at, to: at + 3, insert: '$y^2$' } });
  await vi.waitFor(() => expect(document.querySelector('.table-math')?.getAttribute('aria-label')).toBe('Formula: y^2'));
  expect(table().child).toBe(child); expect(child.state.doc.toString()).toBe('words');
  expect(child.compositionStarted).toBe(true); expect(source()).toBe(original.replace('$x$', '$y^2$'));
});

it('discards delayed formula success and failure after cell editing, Source mode, removal, tab change and Undo', async () => {
  const mount = mathPreview.mountFormula;
  for (const action of ['cell', 'source', 'delete', 'tab', 'undo'] as const) for (const fail of [false, true]) {
    const requests: { resolve: (html: string) => void; reject: (error: Error) => void }[] = [];
    vi.spyOn(mathPreview, 'mountFormula').mockImplementation((dom, formula, measure) =>
      mount(dom, formula, measure, () => new Promise((resolve, reject) => requests.push({ resolve, reject }))));
    const { editor, display, table } = create('| A |\n| - |\n| $x$ |\n\nEnd');
    await vi.waitFor(() => expect(requests.length).toBe(1));
    const old = document.querySelector<HTMLElement>('.table-math')!;
    if (action === 'cell') table().begin(1, 0);
    if (action === 'source') editor.dispatch({ effects: display.reconfigure([]) });
    if (action === 'delete') editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: 'Removed' } });
    if (action === 'tab') editor.setState(state('New tab', new Compartment()));
    if (action === 'undo') {
      const at = editor.state.doc.toString().indexOf('$x$');
      editor.dispatch({ changes: { from: at, to: at + 3, insert: '$y$' } }); undo(editor);
    }
    if (fail) requests[0].reject(new Error('late')); else requests[0].resolve('<svg id="stale-table"></svg>');
    await Promise.resolve(); await Promise.resolve();
    expect(old.querySelector('svg')).toBeNull(); expect(old.classList.contains('preview-error')).toBe(false);
    expect(document.querySelector('#stale-table')).toBeNull();
    editor.destroy(); view = undefined; document.body.replaceChildren(); vi.restoreAllMocks();
  }
});

it('cancels before renderer work and strips formula link and resource actions', async () => {
  const dom = document.createElement('span'); document.body.append(dom);
  const formula = { formula: 'x', source: '$x$', display: false }, render = vi.fn(async () => '<svg></svg>');
  const cancel = mathPreview.mountFormula(dom, formula, vi.fn(), render);
  cancel(); await Promise.resolve(); expect(render).not.toHaveBeenCalled(); expect(dom.textContent).toBe('$x$');
  const measure = vi.fn();
  mathPreview.mountFormula(dom, formula, measure, async () => '<mjx-container><svg><a href="https://example.com"><path d="M0 0"/></a><script>bad()</script><foreignObject>bad</foreignObject></svg><img src="https://example.com/a"/></mjx-container>');
  await Promise.resolve(); await Promise.resolve();
  expect(dom.querySelector('a, img, script, foreignObject, [href], [src]')).toBeNull();
  expect(dom.querySelector('svg')).not.toBeNull(); expect(measure).toHaveBeenCalledOnce();
});
