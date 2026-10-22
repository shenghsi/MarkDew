import { EditorView } from '@codemirror/view';
import { ensureSyntaxTree } from '@codemirror/language';
import { insertNewlineContinueMarkupCommand } from '@codemirror/lang-markdown';
import type { SyntaxNode } from '@lezer/common';
import { isolateHistory } from '@codemirror/commands';
import { previewField } from './preview';
import { tableComposing } from './table';
import { sourceOffset, restoreSource, sourceField, viewOffset } from './source';
import { definitionAt } from './footnotes';

type ListEdit = { from: number; to: number; text: string };

// Continue a flat list marker. Leading-zero width stays; a task becomes unchecked.
function listPrefix(text: string): { original: string; next: string } | undefined {
  const bullet = /^([-*+])([ \t]*)([\s\S]*)$/.exec(text);
  if (bullet) {
    if (!bullet[2]) return undefined;
    const base = bullet[1] + bullet[2], task = /^\[([ xX])\]([ \t]*)([\s\S]*)$/.exec(bullet[3]);
    if (!task || !(task[2] || !task[3])) return { original: base, next: base };
    return { original: `${base}[${task[1]}]${task[2]}`, next: `${base}[ ]${task[2]}` };
  }
  const ordered = /^(\d{1,9})([.)])([ \t]+)/.exec(text);
  if (!ordered || Number(ordered[1]) >= 999999999) return undefined;
  const marker = ordered[2] + ordered[3];
  return { original: ordered[1] + marker,
    next: String(Number(ordered[1]) + 1).padStart(ordered[1].length, '0') + marker };
}

// Plan Return at the end of a flat list item or ordinary line. An empty item loses its marker.
export function listReturnEdit(line: { from: number; to: number; text: string }, from: number, to: number): ListEdit {
  const prefix = from === to && from === line.to ? listPrefix(line.text) : undefined;
  if (!prefix) return { from, to, text: '\n' };
  return prefix.original === line.text ? { from: line.from, to, text: '' } : { from, to, text: '\n' + prefix.next };
}

export function listReturn(view: EditorView): boolean {
  if (view.compositionStarted || view.state.readOnly || view.state.selection.ranges.length !== 1) return false;
  const record = view.state.field(sourceField), selection = view.state.selection.main;
  const line = view.state.doc.lineAt(selection.from);
  const { from, to, text } = listReturnEdit(line, selection.from, selection.to);
  const after = sourceOffset(record, line.to), before = sourceOffset(record, line.from);
  const ending = /^(\r\n|\r|\n)/.exec(record.raw.slice(after, after + 2))?.[0]
    || (record.raw.slice(before - 2, before) === '\r\n' ? '\r\n' : before ? record.raw[before - 1] : '') || '\n';
  const rawText = text.replace(/\n/g, ending);
  const start = sourceOffset(record, from), end = sourceOffset(record, to);
  const raw = record.raw.slice(0, start) + rawText + record.raw.slice(end);
  view.dispatch({ changes: { from, to, insert: text },
    selection: { anchor: viewOffset(raw, start + rawText.length) },
    effects: restoreSource.of({ ...record, raw }), userEvent: 'input' });
  return true;
}

const continueMarkup = insertNewlineContinueMarkupCommand({ nonTightLists: false });
export function markdownReturn(view: EditorView): boolean {
  if (view.compositionStarted || tableComposing(view) || view.state.readOnly || view.state.selection.ranges.length !== 1) return false;
  const { state } = view, selection = state.selection.main;
  const plain = () => {
    view.dispatch(state.update(state.replaceSelection('\n'), { scrollIntoView: true, userEvent: 'input' }));
    return true;
  };
  if (definitionAt(state, selection.from)) return plain();
  // Complete the tree before asking the package to continue a container.
  const tree = ensureSyntaxTree(state, state.doc.length, 50);
  if (!tree) return plain();

  const line = state.doc.lineAt(selection.from);
  const fenceMatch = /^([ ]{0,3})(`{3,}|~{3,})(.*)$/.exec(line.text);
  if (fenceMatch) {
    const indent = fenceMatch[1];
    const fenceChars = fenceMatch[2];
    const info = fenceMatch[3];
    const validFence = fenceChars[0] === '`' ? !info.includes('`') : !info.includes('~');
    const fenceStart = line.from + indent.length;
    const fenceEnd = fenceStart + fenceChars.length;
    const trimmedLineEnd = line.from + line.text.trimEnd().length;
    if (validFence && selection.empty && selection.from >= trimmedLineEnd && selection.from >= fenceEnd) {
      let fencedCodeNode: SyntaxNode | null = null;
      for (let n: SyntaxNode | null = tree.resolveInner(fenceStart, 1); n; n = n.parent) {
        if (n.name === 'FencedCode') {
          fencedCodeNode = n;
          break;
        }
      }
      if (fencedCodeNode && fencedCodeNode.from >= line.from && fencedCodeNode.from <= line.to) {
        let markCount = 0;
        for (let child = fencedCodeNode.firstChild; child; child = child.nextSibling) {
          if (child.name === 'CodeMark') markCount++;
        }
        const codeChild = fencedCodeNode.getChild('CodeText');
        const fenceChar = fenceChars[0];
        const fenceLen = fenceChars.length;
        const swallowed = codeChild ? new RegExp(`(?:^|\\n)[ ]{0,3}${fenceChar}{${fenceLen},}`).test(state.doc.sliceString(codeChild.from, codeChild.to)) : false;
        if (markCount <= 1 || swallowed) {
          const insert = '\n' + indent + '\n' + indent + fenceChars;
          view.dispatch({
            changes: [
              { from: trimmedLineEnd, to: line.to, insert }
            ],
            selection: { anchor: trimmedLineEnd + 1 + indent.length },
            scrollIntoView: true,
            userEvent: 'input'
          });
          return true;
        }
      }
    }
  }

  let items = 0, container = false, continuation = false;
  for (let node = tree.resolveInner(selection.from, -1); node; node = node.parent!) {
    if (['FencedCode', 'CodeBlock', 'HTMLBlock', 'Table', 'Frontmatter'].includes(node.name)) return plain();
    if (node.name === 'Blockquote') container = true;
    if (node.name === 'ListItem') { items++; if (node.from < line.from) continuation = true; }
  }
  if (container || items > 1 || continuation) return continueMarkup(view) || plain();
  return listReturn(view);
}

// A closed code block that ends the document hides its fences in live preview,
// so no line exists below it. ArrowDown from its last line adds that line.
export function exitCodeBlockDown(view: EditorView): boolean {
  if (view.compositionStarted || tableComposing(view) || view.state.readOnly || view.state.selection.ranges.length !== 1) return false;
  if (!view.state.field(previewField, false)) return false;
  const { state } = view, selection = state.selection.main;
  if (!selection.empty) return false;
  const tree = ensureSyntaxTree(state, state.doc.length, 50);
  if (!tree) return false;
  let code: SyntaxNode | null = null;
  for (let n: SyntaxNode | null = tree.resolveInner(selection.from, -1); n; n = n.parent) {
    if (n.name === 'FencedCode') { code = n; break; }
  }
  if (!code || code.parent?.name !== 'Document' || code.to !== state.doc.length || code.getChildren('CodeMark').length !== 2) return false;
  const closing = state.doc.lineAt(code.to), last = closing.number > 1 ? state.doc.line(closing.number - 1) : closing;
  if (state.doc.lineAt(selection.from).number < last.number) return false;
  view.dispatch({
    changes: { from: state.doc.length, insert: '\n' },
    selection: { anchor: state.doc.length + 1 },
    scrollIntoView: true,
    userEvent: 'input.code-block-exit',
    annotations: isolateHistory.of('full')
  });
  return true;
}

export function markdownBackspace(view: EditorView): boolean {
  if (view.compositionStarted || tableComposing(view) || view.state.readOnly || view.state.selection.ranges.length !== 1) return false;
  if (!view.state.field(previewField, false)) return false;
  const { state } = view, selection = state.selection.main;
  if (!selection.empty) return false;

  const tree = ensureSyntaxTree(state, state.doc.length, 50);
  if (!tree) return false;

  let fencedCodeNode: SyntaxNode | null = null;
  for (let n: SyntaxNode | null = tree.resolveInner(selection.from, -1); n; n = n.parent) {
    if (n.name === 'FencedCode') {
      fencedCodeNode = n;
      break;
    }
  }
  if (!fencedCodeNode) {
    for (let n: SyntaxNode | null = tree.resolveInner(selection.from, 1); n; n = n.parent) {
      if (n.name === 'FencedCode') {
        fencedCodeNode = n;
        break;
      }
    }
  }
  if (!fencedCodeNode) return false;

  let markCount = 0;
  let firstMark: SyntaxNode | null = null;
  let closingMark: SyntaxNode | null = null;
  for (let child = fencedCodeNode.firstChild; child; child = child.nextSibling) {
    if (child.name === 'CodeMark') {
      markCount++;
      if (!firstMark) firstMark = child;
      closingMark = child;
    }
  }
  if (markCount <= 1 || !closingMark || firstMark === closingMark) return false;

  const codeChild = fencedCodeNode.getChild('CodeText');
  const fenceStr = firstMark ? state.doc.sliceString(firstMark.from, firstMark.to) : '```';
  const fenceChar = fenceStr[0];
  const fenceLen = fenceStr.length;
  const swallowed = codeChild ? new RegExp(`(?:^|\\n)[ ]{0,3}${fenceChar}{${fenceLen},}`).test(state.doc.sliceString(codeChild.from, codeChild.to)) : false;
  if (swallowed) return false;

  const startLine = state.doc.lineAt(fencedCodeNode.from);
  const endPos = (fencedCodeNode.to > fencedCodeNode.from && state.doc.lineAt(fencedCodeNode.to).from === fencedCodeNode.to)
    ? fencedCodeNode.to - 1
    : fencedCodeNode.to;
  const endLine = state.doc.lineAt(endPos);

  if (selection.from < startLine.from || selection.from > endLine.to) return false;

  const codeContent = state.doc.sliceString(startLine.to, endLine.from);
  const hasCode = /\S/.test(codeContent);

  if (hasCode) {
    if (endLine.number > startLine.number + 1) {
      const firstCodeLine = state.doc.line(startLine.number + 1);
      if (selection.from === firstCodeLine.from) return true;
    }
    return false;
  }

  if (endLine.number > startLine.number + 2) {
    const firstCodeLine = state.doc.line(startLine.number + 1);
    if (selection.from > firstCodeLine.to) return false;
  }

  const from = startLine.from;
  const to = Math.min(endLine.to + 1, state.doc.length);

  view.dispatch({
    changes: { from, to, insert: '' },
    selection: { anchor: from },
    scrollIntoView: true,
    userEvent: 'delete.code-block',
    annotations: isolateHistory.of('full')
  });
  return true;
}

