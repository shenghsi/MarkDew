import { EditorSelection } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { isolateHistory } from '@codemirror/commands';
import { EditorView } from '@codemirror/view';
import { editGuard } from './edit-guard';
import { footnoteSource } from './footnotes';
import { outerBlocks } from './outer-blocks';

export function codeBlock(view: EditorView): string | null {
  const reason = editGuard(view); if (reason) return reason;
  const state = view.state, selection = state.selection.main;
  const tree = ensureSyntaxTree(state, state.doc.length, 100);
  if (!tree) return 'Wait for Markdown parsing, then create the code block.';
  const original = outerBlocks(tree), last = selection.empty ? selection.to : selection.to - 1;
  const touched = original.filter(node => node.from <= last &&
    (node.to > selection.from || selection.empty && node.to === selection.from));
  if (touched.some(node => ['Frontmatter', 'FencedCode', 'CodeBlock'].includes(node.name)))
    return 'Edit metadata and existing code blocks as source.';
  const from = state.doc.lineAt(touched.reduce((at, node) => Math.min(at, node.from), selection.from)).from;
  const to = state.doc.lineAt(touched.reduce((at, node) => Math.max(at, node.to), last)).to;
  if (footnoteSource(state, from, to)) return 'Move outside footnote source before you create a code block.';
  const content = state.doc.sliceString(from, to);
  let length = 3;
  for (const match of content.matchAll(/`+/g)) length = Math.max(length, match[0].length + 1);
  const fence = '`'.repeat(length);
  const opening = fence + '\n', closing = '\n' + fence;
  const changes = from === to ? [{ from, insert: opening + closing }]
    : [{ from, insert: opening }, { from: to, insert: closing }];
  const map = state.changes(changes);
  const cursor = (position: number) => Math.max(from + opening.length, Math.min(position + opening.length, to + opening.length));
  const target = EditorSelection.range(cursor(selection.anchor), cursor(selection.head));
  const transaction = state.update({ changes, selection: target,
    effects: EditorView.scrollIntoView(target.head), annotations: isolateHistory.of('full'), userEvent: 'input.code-block' });
  if (JSON.stringify(transaction.changes.toJSON()) !== JSON.stringify(map.toJSON()) ||
    !transaction.state.selection.eq(EditorSelection.create([target]))) return 'The code block change was not accepted.';
  const parsed = ensureSyntaxTree(transaction.state, transaction.state.doc.length, 100);
  if (!parsed) return 'Wait for Markdown parsing, then create the code block.';
  const after = outerBlocks(parsed), end = to + opening.length + closing.length;
  const code = after.find(node => node.name === 'FencedCode' && node.from === from && node.to === end && node.parent?.name === 'Document');
  if (!code || transaction.state.doc.sliceString(from + opening.length, to + opening.length) !== content)
    return 'This selection cannot become a code block.';
  if (original.filter(node => !touched.includes(node)).some(node => !after.some(next =>
    next.name === node.name && next.from === map.mapPos(node.from, 1) && next.to === map.mapPos(node.to, -1) &&
    next.parent?.name === node.parent?.name))) return 'This change would affect another Markdown block.';
  view.dispatch(transaction); view.focus(); return null;
}
