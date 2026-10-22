import { EditorSelection } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { isolateHistory } from '@codemirror/commands';
import { EditorView } from '@codemirror/view';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import { editGuard } from './edit-guard';
import { footnoteSource } from './footnotes';
import { outerBlocks } from './outer-blocks';
import type { Format } from './formatting';

const sourceBlocks = ['FencedCode', 'CodeBlock', 'HTMLBlock', 'Table', 'Frontmatter', 'MathBlock'];
const wait = 'Wait for Markdown parsing, then repeat the command.';

export type LineKind = 'quote' | 'ordered' | 'bullet' | 'task';
const patterns: Record<LineKind, RegExp> = {
  quote: /^( {0,3})> ?/,
  task: /^( *)[-*+] \[[ xX]\] /,
  bullet: /^( *)[-*+] (?!\[[ xX]\] )/,
  ordered: /^( *)\d{1,9}[.)] /,
};
const listKinds: LineKind[] = ['task', 'bullet', 'ordered'];

// Add a quote or list marker to each selected line. If every line has it, remove it.
export function toggleLines(view: EditorView, kind: LineKind): string | null {
  const reason = editGuard(view); if (reason) return reason;
  const { state } = view, selection = state.selection.main;
  const tree = ensureSyntaxTree(state, state.doc.length, 100);
  if (!tree) return wait;
  const first = state.doc.lineAt(selection.from);
  const last = state.doc.lineAt(selection.to > selection.from && state.doc.lineAt(selection.to).from === selection.to ? selection.to - 1 : selection.to);
  if (footnoteSource(state, first.from, last.to)) return 'Edit footnote source directly.';
  let blocked = false;
  tree.iterate({ from: first.from, to: last.to, enter(ref) { if (sourceBlocks.includes(ref.name)) blocked = true; } });
  if (blocked) return 'Edit this block as source.';
  const lines = [];
  for (let number = first.number; number <= last.number; number++) lines.push(state.doc.line(number));
  const counted = lines.length > 1 ? lines.filter(line => line.text.trim()) : lines;
  const active = counted.length > 0 && counted.every(line => patterns[kind].test(line.text));
  const changes: { from: number; to?: number; insert: string }[] = [];
  let number = 0;
  for (const line of lines) {
    const blank = !line.text.trim();
    if (active) {
      const match = patterns[kind].exec(line.text);
      if (match) changes.push({ from: line.from + match[1].length, to: line.from + match[0].length, insert: '' });
      continue;
    }
    if (blank && lines.length > 1) { if (kind === 'quote') changes.push({ from: line.from, insert: '>' }); continue; }
    const marker = kind === 'quote' ? '> ' : kind === 'bullet' ? '- ' : kind === 'task' ? '- [ ] ' : `${++number}. `;
    if (kind === 'quote') {
      if (!patterns.quote.test(line.text)) changes.push({ from: line.from, insert: marker });
      continue;
    }
    const other = listKinds.map(name => patterns[name].exec(line.text)).find(Boolean);
    if (other) changes.push({ from: line.from + other[1].length, to: line.from + other[0].length, insert: marker });
    else {
      const indent = /^ */.exec(line.text)![0].length;
      changes.push({ from: line.from + indent, insert: marker });
    }
  }
  if (!changes.length) return null;
  view.dispatch(state.update({ changes, userEvent: 'input.format', scrollIntoView: true }));
  view.focus(); return null;
}

// Report the heading level or paragraph at the cursor, for the Paragraph menu.
export function currentFormat(view: EditorView): Format | null {
  const { state } = view, tree = ensureSyntaxTree(state, state.doc.length, 50);
  if (!tree) return null;
  for (let node = tree.resolveInner(state.selection.main.from, 1) as import('@lezer/common').SyntaxNode | null; node; node = node.parent) {
    const level = /^(?:ATXHeading|SetextHeading)([1-6])$/.exec(node.name)?.[1];
    if (level) return `h${level}` as Format;
    if (node.name === 'Paragraph') return 'paragraph';
    if (sourceBlocks.includes(node.name)) return null;
  }
  return null;
}

// Put a block on its own lines after the block at the cursor, or on a blank line.
function insertBlock(view: EditorView, text: string, cursor: number): string | null {
  const reason = editGuard(view); if (reason) return reason;
  const { state } = view, selection = state.selection.main;
  if (footnoteSource(state, selection.from, selection.to)) return 'Move outside footnote source before you insert a block.';
  const tree = ensureSyntaxTree(state, state.doc.length, 100);
  if (!tree) return wait;
  const target = selection.empty ? selection.to : selection.to - 1;
  const owner = outerBlocks(tree).find(node => node.from <= target && node.to >= target);
  if (owner?.name === 'Frontmatter') return 'Move outside metadata before you insert a block.';
  const line = state.doc.lineAt(owner ? owner.to : selection.to);
  if (!owner && line.text.trim()) return 'Move to a blank line or a block before you insert.';
  const at = owner ? line.to : line.from, end = owner ? at : line.to;
  const before = state.doc.sliceString(Math.max(0, at - 2), at);
  const left = at === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const right = state.doc.sliceString(end, Math.min(state.doc.length, end + 2));
  const tail = end === state.doc.length ? '' : right.startsWith('\n\n') ? '' : right.startsWith('\n') ? '\n' : '\n\n';
  view.dispatch({ changes: { from: at, to: end, insert: left + text + tail },
    selection: EditorSelection.cursor(at + left.length + cursor), scrollIntoView: true,
    userEvent: 'input', annotations: isolateHistory.of('full') });
  view.focus(); return null;
}

export const insertHorizontalLine = (view: EditorView) => insertBlock(view, '***', 3);

// A static list of links to the headings now in the document.
export function insertTableOfContents(view: EditorView): string | null {
  const tree = ensureSyntaxTree(view.state, view.state.doc.length, 100);
  if (!tree) return wait;
  const slugger = new GithubSlugger(), entries: { level: number; text: string; slug: string }[] = [];
  tree.iterate({ enter(ref) {
    const level = /^(?:ATXHeading|SetextHeading)([1-6])$/.exec(ref.name)?.[1];
    if (!level) return;
    const node = ref.node, marks = node.getChildren('HeaderMark');
    let from = node.from, to = node.to;
    if (ref.name.startsWith('ATX')) {
      if (marks[0]) from = marks[0].to;
      if (marks.length > 1) to = marks[marks.length - 1].from;
    } else to = marks[marks.length - 1]?.from ?? to;
    const text = view.state.doc.sliceString(from, to).trim();
    if (!text) return false;
    const plain = toString(fromMarkdown(text), { includeHtml: false });
    entries.push({ level: Number(level), text: plain, slug: slugger.slug(plain) });
    return false;
  } });
  if (!entries.length) return 'Add a heading before you insert a table of contents.';
  const top = Math.min(...entries.map(entry => entry.level));
  const list = entries.map(entry => `${'  '.repeat(entry.level - top)}- [${entry.text.replace(/[[\]\\]/g, '\\$&')}](#${entry.slug})`).join('\n');
  return insertBlock(view, list, list.length);
}

export function insertFrontMatter(view: EditorView): string | null {
  const reason = editGuard(view); if (reason) return reason;
  const tree = ensureSyntaxTree(view.state, view.state.doc.length, 100);
  if (!tree) return wait;
  if (outerBlocks(tree).some(node => node.name === 'Frontmatter')) return 'This document already has front matter.';
  const text = '---\n\n---\n' + (view.state.doc.length ? '\n' : '');
  view.dispatch({ changes: { from: 0, insert: text }, selection: EditorSelection.cursor(4),
    scrollIntoView: true, userEvent: 'input', annotations: isolateHistory.of('full') });
  view.focus(); return null;
}

// Add [text][n] at the selection and an empty definition at the end of the document.
export function insertLinkReference(view: EditorView): string | null {
  const reason = editGuard(view); if (reason) return reason;
  const { state } = view, selection = state.selection.main;
  if (state.doc.lineAt(selection.from).number !== state.doc.lineAt(selection.to).number)
    return 'Use one text line to insert a link reference.';
  if (footnoteSource(state, selection.from, selection.to)) return 'Move outside footnote source before you insert a link reference.';
  const tree = ensureSyntaxTree(state, state.doc.length, 100);
  if (!tree) return wait;
  for (let node: import('@lezer/common').SyntaxNode | null = tree.resolveInner(selection.from, 1); node; node = node.parent)
    if ([...sourceBlocks, 'InlineCode', 'Link', 'Image'].includes(node.name)) return 'Move to ordinary Markdown text before you insert a link reference.';
  const source = state.doc.toString();
  let label = 1;
  for (const match of source.matchAll(/^ {0,3}\[(\d+)\]:/gm)) label = Math.max(label, Number(match[1]) + 1);
  const text = state.sliceDoc(selection.from, selection.to) || 'link text';
  const insert = `[${text}][${label}]`;
  const end = state.doc.length, gap = source.endsWith('\n\n') ? '' : source.endsWith('\n') ? '\n' : '\n\n';
  view.dispatch({ changes: [{ from: selection.from, to: selection.to, insert }, { from: end, insert: `${gap}[${label}]: ` }],
    selection: EditorSelection.range(selection.from + 1, selection.from + 1 + text.length),
    scrollIntoView: true, userEvent: 'input', annotations: isolateHistory.of('full') });
  view.focus(); return null;
}

// Add an empty paragraph before or after the top-level block at the cursor.
export function insertParagraph(view: EditorView, where: 'before' | 'after'): string | null {
  const reason = editGuard(view); if (reason) return reason;
  const { state } = view, tree = ensureSyntaxTree(state, state.doc.length, 100);
  if (!tree) return wait;
  const target = state.selection.main.head;
  const owner = outerBlocks(tree).find(node => node.from <= target && node.to >= target);
  if (!owner) return 'Move into a block before you add a paragraph.';
  const at = where === 'before' ? state.doc.lineAt(owner.from).from : state.doc.lineAt(owner.to).to;
  view.dispatch({ changes: { from: at, insert: '\n\n' }, selection: EditorSelection.cursor(where === 'before' ? at : at + 2),
    scrollIntoView: true, userEvent: 'input', annotations: isolateHistory.of('full') });
  view.focus(); return null;
}
