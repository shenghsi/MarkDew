import { EditorView } from '@codemirror/view';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown } from 'mdast-util-math';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import { toString } from 'mdast-util-to-string';
import type { Nodes } from 'mdast';
import { editGuard } from './edit-guard';

const parse = (source: string) => fromMarkdown(source, { extensions: [gfm(), math()], mdastExtensions: [gfmFromMarkdown(), mathFromMarkdown()] });

export function markdownToHtml(source: string): string {
  return toHtml(toHast(parse(source), { allowDangerousHtml: true }), { allowDangerousHtml: true });
}

// Blocks join with line breaks; inline Markdown marks are gone.
function plain(node: Nodes): string {
  switch (node.type) {
    case 'root': case 'blockquote': return node.children.map(plain).join('\n\n');
    case 'list': return node.children.map(plain).join('\n');
    case 'listItem': return node.children.map(plain).join('\n');
    case 'table': return node.children.map(row => 'children' in row ? row.children.map(cell => toString(cell)).join('\t') : '').join('\n');
    case 'code': case 'math': return node.value;
    case 'thematicBreak': case 'yaml': return '';
    default: return toString(node);
  }
}
export const markdownToPlainText = (source: string) => plain(parse(source)).trim();

async function writeText(text: string) {
  await navigator.clipboard.writeText(text);
}

export type CopyKind = 'markdown' | 'html' | 'unstyled' | 'plain';
export async function copySelection(view: EditorView, kind: CopyKind | 'raw'): Promise<string | null> {
  const { from, to } = view.state.selection.main;
  if (from === to) return 'Select text to copy.';
  const source = view.state.sliceDoc(from, to);
  try {
    if (kind === 'raw' || kind === 'markdown') await writeText(source);
    else if (kind === 'html') await writeText(markdownToHtml(source));
    else if (kind === 'plain') await writeText(markdownToPlainText(source));
    else {
      const html = markdownToHtml(source), text = markdownToPlainText(source);
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard.write) await writeText(text);
      else await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
    }
  } catch (reason) { return `Cannot write to the clipboard. ${String(reason)}`; }
  return null;
}

export async function cutSelection(view: EditorView): Promise<string | null> {
  const reason = editGuard(view); if (reason) return reason;
  const { from, to } = view.state.selection.main;
  const failed = await copySelection(view, 'raw'); if (failed) return failed;
  if (view.state.selection.main.from !== from || view.state.selection.main.to !== to) return 'The selection changed. Cut again.';
  view.dispatch({ changes: { from, to, insert: '' }, userEvent: 'delete.cut', scrollIntoView: true });
  view.focus(); return null;
}

export function deleteSelection(view: EditorView): string | null {
  const reason = editGuard(view); if (reason) return reason;
  const { from, to } = view.state.selection.main;
  if (from === to) return null;
  view.dispatch({ changes: { from, to, insert: '' }, userEvent: 'delete.selection', scrollIntoView: true });
  view.focus(); return null;
}

export async function pasteText(view: EditorView): Promise<string | null> {
  const reason = editGuard(view); if (reason) return reason;
  let text: string;
  try { text = await navigator.clipboard.readText(); }
  catch (error) { return `Cannot read the clipboard. ${String(error)}`; }
  if (view.state.readOnly || view.compositionStarted) return 'Finish text input, then paste.';
  if (!text) return null;
  view.dispatch(view.state.update(view.state.replaceSelection(text.replace(/\r\n?/g, '\n')), { userEvent: 'input.paste', scrollIntoView: true }));
  view.focus(); return null;
}
