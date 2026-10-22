import { EditorSelection, SelectionRange, StateField, Text, Transaction } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { SyntaxNode } from '@lezer/common';
import MarkdownIt from 'markdown-it';
import { editGuard } from './edit-guard';
import { SourceRecord, sourceField } from './source';
import { imageDestination } from './images';
import { mathRanges } from './math-ranges';
import { footnoteSource } from './footnotes';

let version = 0;
export const linkVersion = StateField.define<number>({
  create: () => ++version,
  update(value, transaction) { return transaction.docChanged || transaction.startState.field(sourceField) !== transaction.state.field(sourceField)
    ? ++version : value; },
});
const markdown = new MarkdownIt({ html: false });
export interface LinkFields { label: string; destination: string; title: string }
export interface LinkEdit extends LinkFields {
  kind: 'link' | 'image';
  doc: Text; record: SourceRecord; version: number; from: number; to: number;
  existing: boolean; reference: boolean; rawDestination: string; rawTitle: string;
  labelFrom: number; labelTo: number; destinationFrom: number; destinationTo: number;
  titleFrom?: number; titleTo?: number;
}
function directChildren(node: SyntaxNode) {
  const children: SyntaxNode[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) children.push(child);
  return children;
}
export function openLink(view: EditorView, kind: 'link' | 'image' = 'link', selection: SelectionRange = view.state.selection.main): LinkEdit | string {
  const reason = editGuard(view); if (reason) return reason;
  const state = view.state;
  if (footnoteSource(state, selection.from, selection.to)) return 'Edit footnote source directly.';
  const tree = ensureSyntaxTree(state, selection.to, 50);
  if (!tree) return 'Wait for Markdown parsing, then open link controls.';
  for (let node: SyntaxNode | null = tree.resolveInner(selection.from, 1); node; node = node.parent)
    if (['FencedCode', 'CodeBlock', 'HTMLBlock', 'Table', 'LinkReference', 'Autolink', 'Frontmatter'].includes(node.name)) return 'Edit this block as source.';
    else if (kind === 'link' && node.name === 'Image') return 'Use image controls to edit this image.';
    else if (kind === 'image' && ['Paragraph', 'ATXHeading1', 'ATXHeading2', 'ATXHeading3', 'ATXHeading4', 'ATXHeading5', 'ATXHeading6', 'SetextHeading1', 'SetextHeading2'].includes(node.name)) {
      if (mathRanges(state.doc.sliceString(node.from, node.to)).some(range => selection.from <= node.from + range.to && selection.to >= node.from + range.from)) return 'Edit formula source directly.';
    }
  let found: SyntaxNode | null = null;
  tree.iterate({ from: selection.from, to: selection.to, enter(ref) {
    if (ref.name === (kind === 'image' ? 'Image' : 'Link') && ref.from <= selection.from && ref.to >= selection.to) found = ref.node;
  } });
  const node = found as SyntaxNode | null, children = node ? directChildren(node) : [];
  const closeLabel = children.find(child => child.name === 'LinkMark' && state.doc.sliceString(child.from, child.to) === ']');
  const url = children.find(child => child.name === 'URL'), title = children.find(child => child.name === 'LinkTitle');
  const labelFrom = node ? node.from + (kind === 'image' ? 2 : 1) : selection.from, labelTo = closeLabel?.from ?? selection.to;
  const rawDestination = url ? state.doc.sliceString(url.from, url.to) : '';
  const rawTitle = title ? state.doc.sliceString(title.from, title.to) : '';
  const openDestination = children.find(child => child.name === 'LinkMark' && state.doc.sliceString(child.from, child.to) === '(');
  const edit: LinkEdit = { kind, doc: state.doc, record: state.field(sourceField), version: state.field(linkVersion),
    from: node?.from ?? selection.from, to: node?.to ?? selection.to, existing: !!node,
    reference: !!node && !children.some(child => child.name === 'LinkMark' && state.doc.sliceString(child.from, child.to) === '('),
    labelFrom, labelTo, label: state.doc.sliceString(labelFrom, labelTo), rawDestination, rawTitle,
    destinationFrom: url?.from ?? openDestination?.to ?? selection.from, destinationTo: url?.to ?? openDestination?.to ?? selection.from,
    titleFrom: title?.from, titleTo: title?.to,
    destination: markdown.utils.unescapeAll(rawDestination.startsWith('<') ? rawDestination.slice(1, -1) : rawDestination),
    title: rawTitle ? markdown.utils.unescapeAll(rawTitle.slice(1, -1)) : '' };
  if (/[\r\n]/.test(edit.label + edit.destination + edit.title)) return `Edit a multiline ${kind} as source.`;
  return edit;
}
export function linkCaptureCurrent(view: EditorView, edit: LinkEdit) {
  return view.state.doc === edit.doc && view.state.field(sourceField) === edit.record && view.state.field(linkVersion) === edit.version;
}
function guard(view: EditorView, edit: LinkEdit) {
  const reason = editGuard(view); if (reason) return reason;
  return linkCaptureCurrent(view, edit) ? null : `The document changed. Open ${edit.kind} controls again.`;
}
const escape = (text: string, punctuation: RegExp) => text.replace(/&/g, '&amp;').replace(punctuation, '\\$&');
export function planLink(view: EditorView, edit: LinkEdit, fields: LinkFields): Transaction | string | null {
  const reason = guard(view, edit); if (reason) return reason;
  const kind = edit.kind, labelOffset = kind === 'image' ? 2 : 1;
  if (edit.reference) return `Edit reference-${kind} destinations in source. Remove keeps the shared definition.`;
  if (/[\u0000-\u001f\u007f]/.test(fields.label + fields.destination + fields.title)) return `Use single-line ${kind} fields without control characters.`;
  if (edit.existing && fields.label === edit.label && fields.destination === edit.destination && fields.title === edit.title) return null;
  if (!fields.destination.trim()) return `Enter the ${kind} destination.`;
  if (/[<>]/.test(fields.destination)) return `Use %3C and %3E for angle brackets in the ${kind} destination.`;
  if (!markdown.validateLink(markdown.normalizeLink(markdown.utils.unescapeAll(fields.destination)))) return `Use a supported ${kind} destination.`;
  if (kind === 'image') try { imageDestination(markdown.normalizeLink(markdown.utils.unescapeAll(fields.destination))); }
  catch (error) { return String(error); }
  const destination = edit.existing && fields.destination === edit.destination ? edit.rawDestination : `<${escape(fields.destination, /[\\<>]/g)}>`;
  const title = edit.existing && fields.title === edit.title ? edit.rawTitle : fields.title ? `"${escape(fields.title, /[\\"]/g)}"` : '';
  const changes: { from: number; to?: number; insert: string }[] = [];
  if (edit.existing) {
    if (fields.label !== edit.label) changes.push({ from: edit.labelFrom, to: edit.labelTo, insert: fields.label });
    if (fields.destination !== edit.destination) changes.push({ from: edit.destinationFrom, to: edit.destinationTo, insert: destination });
    if (fields.title !== edit.title) changes.push(edit.titleFrom === undefined
      ? { from: edit.to - 1, insert: title ? ' ' + title : '' }
      : { from: edit.titleFrom, to: edit.titleTo, insert: title });
  } else changes.push({ from: edit.from, to: edit.to, insert: `${kind === 'image' ? '!' : ''}[${fields.label}](${destination}${title ? ' ' + title : ''})` });
  const planned = view.state.changes(changes), end = planned.mapPos(edit.to, 1);
  const transaction = view.state.update({ changes: planned,
    selection: EditorSelection.range(edit.from + labelOffset, edit.from + labelOffset + fields.label.length), userEvent: `input.${kind}` });
  const tree = ensureSyntaxTree(transaction.state, end, 50);
  let valid = false;
  tree?.iterate({ from: edit.from, to: end, enter(ref) {
    if (ref.name === (kind === 'image' ? 'Image' : 'Link') && ref.from === edit.from && ref.to === end) valid = true;
  } });
  const tokens = markdown.parseInline(transaction.state.doc.sliceString(edit.from, end), {})[0]?.children || [];
  const links = tokens.filter(token => token.type === (kind === 'image' ? 'image' : 'link_open'));
  if (!valid || links.length !== 1 || !markdown.validateLink(links[0].attrGet(kind === 'image' ? 'src' : 'href') || '')) return `Use valid ${kind} text and a supported destination.`;
  if (kind === 'image') try { imageDestination(links[0].attrGet('src') || ''); } catch (error) { return String(error); }
  return transaction;
}
export function applyLink(view: EditorView, edit: LinkEdit, fields: LinkFields): string | null {
  const transaction = planLink(view, edit, fields);
  if (typeof transaction === 'string' || transaction === null) return transaction;
  view.dispatch(transaction); view.focus(); return null;
}
export function removeLink(view: EditorView, edit: LinkEdit): string | null {
  const reason = guard(view, edit); if (reason) return reason;
  if (!edit.existing) return `There is no ${edit.kind} to remove.`;
  if (view.state.doc.sliceString(edit.from, edit.labelFrom) !== (edit.kind === 'image' ? '![' : '[')) return 'Open the controls again for this source range.';
  view.dispatch({ changes: [{ from: edit.from, to: edit.labelFrom }, { from: edit.labelTo, to: edit.to }],
    selection: EditorSelection.range(edit.from, edit.from + edit.label.length), userEvent: `input.${edit.kind}` });
  view.focus(); return null;
}
