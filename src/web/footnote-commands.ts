import { EditorSelection } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { editGuard } from './edit-guard';
import { footnotes, footnoteSource } from './footnotes';

export function insertFootnote(view: EditorView): string | null {
  const reason = editGuard(view); if (reason) return reason;
  const state = view.state, selection = state.selection.main;
  if (footnoteSource(state, selection.from, selection.to)) return 'Move outside footnote source before you insert a footnote.';
  if (state.doc.lineAt(selection.from).number !== state.doc.lineAt(selection.to).number)
    return 'Use one text line to insert a footnote.';
  const tree = ensureSyntaxTree(state, selection.to, 50);
  if (!tree) return 'Wait for Markdown parsing, then insert the footnote.';
  let node = tree.resolveInner(selection.to, -1);
  for (;;) {
    if (['Frontmatter', 'FencedCode', 'CodeBlock', 'HTMLBlock', 'Table', 'InlineCode', 'Link', 'Image'].includes(node.name))
      return 'Move to ordinary Markdown text before you insert a footnote.';
    if (!node.parent) break; node = node.parent;
  }
  const source = state.doc.toString(), occupied = source.toLowerCase();
  const identifiers = new Set(footnotes(state).definitions.map(note => note.identifier));
  let index = 1;
  while (occupied.includes(`[^note-${index}]`) || identifiers.has(`note-${index}`)) index++;
  const label = `note-${index}`, reference = `[^${label}]`, content = 'Note text';
  // Append a top-level definition without changing existing trailing whitespace.
  const at = selection.to, tail = at === source.length ? source + reference : source;
  const separator = tail.endsWith('\n\n') ? '' : tail.endsWith('\n') ? '\n' : '\n\n';
  const definition = `${separator}[^${label}]: ${content}\n`;
  const contentFrom = source.length + reference.length + separator.length + label.length + 5;
  const transaction = state.update({ changes: at === source.length
    ? { from: at, insert: reference + definition }
    : [{ from: at, insert: reference }, { from: source.length, insert: definition }],
    selection: EditorSelection.range(contentFrom, contentFrom + content.length),
    effects: EditorView.scrollIntoView(contentFrom), userEvent: 'input.footnote' });
  // The package must accept both additions in their actual Markdown context.
  // This also rejects math, escaped marks, and unclosed blocks at document end.
  const model = footnotes(transaction.state), added = model.definitions.find(note => note.label === label);
  const calls = added && model.references.filter(note => note.identifier === added.identifier);
  if (!added || added.duplicate || calls?.length !== 1 || calls[0].from !== at || calls[0].to !== at + reference.length)
    return 'This position cannot contain a footnote reference and definition. Edit the source directly.';
  view.dispatch(transaction); view.focus(); return null;
}

export function goToFootnote(view: EditorView): string | null {
  const reason = editGuard(view); if (reason) return reason;
  const selection = view.state.selection.main, model = footnotes(view.state);
  const reference = model.references.find(note => selection.from >= note.from && selection.to <= note.to);
  const definition = model.definitions.find(note => selection.from >= note.from && selection.to <= note.to);
  const target = reference ? model.definitions.find(note => !note.duplicate && note.identifier === reference.identifier)
    : definition ? model.references.find(note => note.identifier === definition.identifier) : undefined;
  if (!target) return 'Select a resolved footnote reference or definition first.';
  view.dispatch({ selection: { anchor: target.from }, effects: EditorView.scrollIntoView(target.from, { y: 'center' }) });
  view.focus(); return null;
}
