import { EditorSelection } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { SyntaxNode } from '@lezer/common';
import { editGuard } from './edit-guard';
import { footnoteSource } from './footnotes';

export type Format = 'bold' | 'italic' | 'strike' | 'code' | 'paragraph' | `h${1 | 2 | 3 | 4 | 5 | 6}`;
export function format(view: EditorView, kind: Format): string | null {
  const state = view.state;
  const reason = editGuard(view); if (reason) return reason;
  const selection = state.selection.main, headingCommand = kind === 'paragraph' || /^h[1-6]$/.test(kind);
  const tree = ensureSyntaxTree(state, headingCommand ? state.doc.length : selection.to, 100);
  if (footnoteSource(state, selection.from, selection.to)) return 'Edit footnote source directly.';
  if (!tree) return 'Wait for Markdown parsing, then repeat the format command.';
  let block: SyntaxNode | null = tree.resolveInner(selection.from, 1);
  while (block) {
    if (['FencedCode', 'CodeBlock', 'HTMLBlock', 'Table', 'Frontmatter'].includes(block.name)) return 'Edit this block as source.';
    if (block.name === 'InlineCode' && (kind === 'bold' || kind === 'italic' || kind === 'strike'))
      return kind === 'strike' ? 'Edit code text as source.' : 'Code text does not use emphasis marks.';
    block = block.parent;
  }
  if (headingCommand) {
    const line = state.doc.lineAt(selection.from);
    const last = state.doc.lineAt(selection.to > selection.from && state.doc.lineAt(selection.to).from === selection.to ? selection.to - 1 : selection.to);
    if (last.number !== line.number) return 'Select one line to change its heading level.';
    let heading: SyntaxNode | null = null, paragraph: SyntaxNode | null = null;
    tree.iterate({ from: line.from, to: line.to, enter(ref) {
      if (/^(ATXHeading[1-6]|SetextHeading[12])$/.test(ref.name)) heading = ref.node;
      if (ref.name === 'Paragraph') paragraph = ref.node;
    } });
    const owner = (heading || paragraph) as SyntaxNode | null;
    if (!owner || state.doc.lineAt(owner.from).number !== line.number)
      return 'Select the first text line of a paragraph or heading.';
    const containers = new Set(['Document', 'Blockquote', 'BulletList', 'OrderedList', 'ListItem']);
    for (let parent = owner.parent; parent; parent = parent.parent)
      if (!containers.has(parent.name)) return 'Edit this block as source.';
    const prefix = kind === 'paragraph' ? '' : '#'.repeat(Number(kind.slice(1))) + ' ';
    const changes: { from: number; to?: number; insert: string }[] = [];
    const node = heading as SyntaxNode | null;
    if (node?.name.startsWith('SetextHeading')) {
      const markerLine = state.doc.lineAt(node.lastChild!.from);
      if (state.doc.lineAt(node.from).number !== line.number || markerLine.number !== line.number + 1)
        return 'Select the text line of a single-line underlined heading.';
      changes.push({ from: node.from, insert: prefix }, markerLine.to < state.doc.length
        ? { from: markerLine.from, to: markerLine.to + 1, insert: '' }
        : { from: line.to, to: node.to, insert: '' });
    } else if (node) {
      const first = node.firstChild!, tail = node.lastChild!;
      let end = first.to;
      while (end < line.to && /[ \t]/.test(state.doc.sliceString(end, end + 1))) end++;
      changes.push({ from: node.from, to: end, insert: prefix });
      if (tail.name === 'HeaderMark' && tail.from !== first.from) {
        let start = tail.from;
        while (start > end && /[ \t]/.test(state.doc.sliceString(start - 1, start))) start--;
        changes.push({ from: start, to: tail.to, insert: '' });
      }
    } else {
      if (!line.text.trim()) return 'Type heading text first.';
      changes.push({ from: owner.from, insert: prefix });
    }
    const transaction = state.update({ changes, userEvent: 'input.format' });
    if (JSON.stringify(transaction.changes.toJSON()) !== JSON.stringify(state.changes(changes).toJSON()))
      return 'The format change was not accepted.';
    if (transaction.docChanged) {
      const candidate = ensureSyntaxTree(transaction.state, transaction.state.doc.length, 100);
      if (!candidate) return 'Wait for Markdown parsing, then repeat the format command.';
      const at = transaction.changes.mapPos(owner.from, -1);
      let next: SyntaxNode | null = candidate.resolveInner(at, 1);
      const wanted = kind === 'paragraph' ? 'Paragraph' : `ATXHeading${kind.slice(1)}`;
      while (next && next.name !== wanted) next = next.parent;
      if (!next || next.from !== at) return 'This change cannot retain the Markdown block.';
      let before = owner.parent, after = next.parent;
      while (before && after) {
        // A removed EOF underline can leave its preceding newline outside the
        // container. The retained text line then supplies its exact new end.
        const end = node?.name.startsWith('SetextHeading') && before.name !== 'Document' && before.to === node.to
          ? transaction.changes.mapPos(line.to, -1) : transaction.changes.mapPos(before.to, 1);
        if (before.name !== after.name || transaction.changes.mapPos(before.from, -1) !== after.from || end !== after.to)
          return 'This change cannot retain the Markdown container.';
        before = before.parent; after = after.parent;
      }
      if (before || after) return 'This change cannot retain the Markdown container.';
      view.dispatch(transaction);
    }
    view.focus(); return null;
  }
  let { from, to } = selection;
  if (state.doc.sliceString(from, to).includes('\n')) return 'Select text on one line for inline formatting.';
  const type = { bold: 'StrongEmphasis', italic: 'Emphasis', strike: 'Strikethrough', code: 'InlineCode' }[kind as 'bold' | 'italic' | 'strike' | 'code'];
  let span: SyntaxNode | null = null;
  tree.iterate({ from, to, enter(ref) {
    if (ref.name === type && ref.from <= from && ref.to >= to) span = ref.node;
  } });
  const node = span as SyntaxNode | null;
  if (node) {
    const first = node.firstChild!, last = node.lastChild!;
    let left = first.to, right = last.from;
    const content = state.doc.sliceString(left, right);
    if (kind === 'code' && content.startsWith(' ') && content.endsWith(' ') && /[^ ]/.test(content)) { left++; right--; }
    view.dispatch({ changes: [{ from: first.from, to: left }, { from: right, to: last.to }], userEvent: 'input.format' });
    view.focus(); return null;
  }
  let text = state.doc.sliceString(from, to), mark = kind === 'bold' ? '**' : kind === 'strike' ? '~~' : '*', padding = '';
  if (kind === 'code') {
    mark = '`'.repeat(Math.max(0, ...Array.from(text.matchAll(/`+/g), match => match[0].length)) + 1);
    if (text.startsWith('`') || text.endsWith('`') || /^ .* $/.test(text) && /[^ ]/.test(text)) padding = ' ';
  } else if (text) {
    const leading = /^\s*/.exec(text)![0].length, trailing = /\s*$/.exec(text)![0].length;
    if (leading === text.length) return 'Select text with visible characters.';
    from += leading; to -= trailing; text = state.doc.sliceString(from, to);
  }
  const marks = kind === 'code' || kind === 'strike' ? [mark] : [mark, kind === 'bold' ? '__' : '_'];
  for (const delimiter of marks) {
    const prefix = delimiter + padding, insert = prefix + text + padding + delimiter;
    const transaction = state.update({ changes: { from, to, insert },
      selection: selection.anchor <= selection.head ? EditorSelection.range(from + prefix.length, to + prefix.length)
        : EditorSelection.range(to + prefix.length, from + prefix.length), userEvent: 'input.format' });
    let valid = !text;
    if (text) {
      const candidate = ensureSyntaxTree(transaction.state, from + insert.length, 50);
      candidate?.iterate({ from, to: from + insert.length, enter(ref) {
        if (ref.name === type && ref.from === from && ref.to === from + insert.length) valid = true;
      } });
    }
    if (valid) { view.dispatch(transaction); view.focus(); return null; }
  }
  return 'This selection cannot use these Markdown marks.';
}
