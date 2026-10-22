import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { ensureSyntaxTree } from '@codemirror/language';
import { documentImageEnvironment } from './renderers';
import { footnotes, overlaps } from './footnotes';
import { tableCellField, tableComposing } from './table';
import { webURL } from './web-links';
import { localLink } from './local-links';

export type LinkTarget = { kind: 'heading'; position: number } | { kind: 'web'; url: string } |
  { kind: 'file'; destination: string; fragment?: string };

// Return a source target, an explicit failure, or undefined outside a link.
export function linkTarget(state: EditorState, position: number): LinkTarget | string | undefined {
  const selection = state.selection;
  if (selection.ranges.length !== 1) return 'Use one selection to follow a heading link.';
  const tree = ensureSyntaxTree(state, state.doc.length, 50);
  if (!tree) return 'Wait for Markdown parsing, then follow the heading link.';
  let node = tree.resolveInner(position, 1);
  while (!['Link', 'Autolink'].includes(node.name) && node.parent) node = node.parent;
  if (!['Link', 'Autolink'].includes(node.name)) return;
  const range = { from: node.from, to: node.to };
  for (let parent = node.parent; parent; parent = parent.parent)
    if (['FencedCode', 'CodeBlock', 'HTMLBlock', 'Table', 'Frontmatter', 'Image'].includes(parent.name)) return;
  if (footnotes(state).definitions.some(note => overlaps(note, range))) return;
  if (!selection.main.empty && (selection.main.from < node.from || selection.main.to > node.to))
    return 'Keep the selection inside one heading link.';
  const bodyFrom = tree.topNode.getChild('Frontmatter')?.to || 0;
  const environment = documentImageEnvironment(state.doc, bodyFrom);
  const destination = environment.links?.get(`${node.from - bodyFrom}:${node.to - bodyFrom}`);
  if (destination === undefined) return 'This link has no accepted Markdown destination.';
  if (!destination.startsWith('#')) {
    try { return /^https?:/i.test(destination) ? { kind: 'web', url: webURL(destination) } : { kind: 'file', ...localLink(destination) }; }
    catch (error) { return `Cannot follow this link: ${String(error)}`; }
  }
  let fragment: string;
  try { fragment = decodeURIComponent(destination.slice(1)); }
  catch { return 'The heading link has an invalid percent escape.'; }
  return headingTarget(state, fragment);
}

// The fragment is already decoded. Match the adopted document's current source.
export function headingTarget(state: EditorState, fragment: string): { kind: 'heading'; position: number } | string {
  const tree = ensureSyntaxTree(state, state.doc.length, 50);
  if (!tree) return 'Wait for Markdown parsing, then follow the heading link.';
  const bodyFrom = tree.topNode.getChild('Frontmatter')?.to || 0;
  const environment = documentImageEnvironment(state.doc, bodyFrom);
  if (!fragment) return { kind: 'heading', position: bodyFrom };
  const target = environment.headingTargets?.get(fragment);
  if (!target) return 'The heading link target was not found.';
  const from = bodyFrom + target.from, to = bodyFrom + target.to;
  let heading = tree.resolveInner(from, 1);
  while (!/^(ATXHeading[1-6]|SetextHeading[12])$/.test(heading.name) && heading.parent) heading = heading.parent;
  if (heading.from !== from || heading.to !== to || !/^(ATXHeading[1-6]|SetextHeading[12])$/.test(heading.name))
    return 'The Markdown parsers do not agree on this heading.';
  return { kind: 'heading', position: from };
}

export function followLink(view: EditorView, position: number, report: (message: string) => void,
  blocked: () => string | null = () => null, openWeb?: (url: string) => void,
  openFile?: (destination: string, fragment?: string) => void) {
  const reason = blocked() || (view.compositionStarted || tableComposing(view) ? 'Finish text input, then follow the heading link.' :
    view.state.field(tableCellField, false) ? 'End the table cell edit, then follow the heading link.' : null);
  if (reason) { report(reason); return true; }
  const target = linkTarget(view.state, position);
  if (target === undefined) return false;
  if (typeof target === 'string') { report(target); return true; }
  if (target.kind === 'web') {
    if (openWeb) openWeb(target.url); else report('Open web links in the desktop app.');
    return true;
  }
  if (target.kind === 'file') {
    if (openFile) openFile(target.destination, target.fragment); else report('Open file links in the desktop app.');
    return true;
  }
  view.dispatch({ selection: { anchor: target.position }, effects: EditorView.scrollIntoView(target.position, { y: 'start' }) });
  view.focus(); report('Moved to the heading link target.'); return true;
}

export function linkNavigation(report: (message: string) => void, blocked: () => string | null = () => null,
  openWeb?: (url: string) => void, openFile?: (destination: string, fragment?: string) => void) {
  const mod = (event: MouseEvent | KeyboardEvent) => /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  return EditorView.domEventHandlers({ keydown(event, view) {
      if (event.defaultPrevented || event.key !== 'Enter' || !mod(event) || event.altKey || event.shiftKey || event.isComposing) return false;
      if (event.repeat) { event.preventDefault(); return true; }
      const result = followLink(view, view.state.selection.main.head, report, blocked, openWeb, openFile);
      if (result) event.preventDefault(); return result;
    }, mousedown(event, view) {
      if (event.defaultPrevented || event.button !== 0 || !mod(event) || event.altKey || event.shiftKey ||
        !(event.target instanceof Element) || event.target.closest('.preview-widget') || !view.contentDOM.contains(event.target)) return false;
      const position = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (position === null) return false;
      const result = followLink(view, position, report, blocked, openWeb, openFile);
      if (result) event.preventDefault(); return result;
    } });
}
