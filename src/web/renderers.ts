import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import { ImageInfo, imageInfo } from './images';
import { FormulaPreview } from './math-preview';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown } from 'mdast-util-math';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import type { Element, Nodes } from 'hast';
import type { Text } from '@codemirror/state';
import type { Heading, Paragraph } from 'mdast';
import GithubSlugger from 'github-slugger';
import { colorBoxesByShape, diagramRenderOptions, diagramSvgStyle, getDiagramSettings } from './diagram-settings';
import { toString } from 'mdast-util-to-string';

const markdown = new MarkdownIt({ html: true, linkify: false });
export const renderedMarkdown = (source: string) => DOMPurify.sanitize(markdown.render(source));
const tableMarkdown = new MarkdownIt({ html: false, linkify: false });
interface TableImageEnvironment { references?: object; definitions?: { type: 'definition'; identifier: string; url: string; title?: string | null }[]; tableImages?: ImageInfo[]; path?: string; document?: number;
  phrasing?: Map<string, Heading | Paragraph>; htmlBlocks?: Map<string, string>;
  links?: Map<string, string>; headingTargets?: Map<string, { from: number; to: number }> }
const tableTree = (source: string) => fromMarkdown(source, {
  extensions: [gfm({ singleTilde: false }), math()], mdastExtensions: [gfmFromMarkdown(), mathFromMarkdown()],
});
tableMarkdown.renderer.rules.image = (tokens, index, _options, environment: TableImageEnvironment) => {
  const image = imageInfo(tokens[index], environment.path || '', environment.document);
  if (!environment.tableImages) return tableMarkdown.utils.escapeHtml(image.alt);
  const slot = environment.tableImages.length; environment.tableImages.push(image);
  return `<span class="preview-image table-image" data-table-image="${slot}">${tableMarkdown.utils.escapeHtml(image.alt)}</span>`;
};
export const renderedTable = (source: string) => DOMPurify.sanitize(tableMarkdown.render(source), {
  FORBID_TAGS: ['a', 'img'], FORBID_ATTR: ['style', 'id', 'name', 'href', 'src', 'srcset'],
});
export function tableImageEnvironment(source: string): TableImageEnvironment {
  const environment: TableImageEnvironment = { definitions: [], phrasing: new Map(), htmlBlocks: new Map(), links: new Map(), headingTargets: new Map() };
  tableMarkdown.parse(source, environment);
  const tree = tableTree(source), accepted = new Set<string>(), slugger = new GithubSlugger();
  const references: { key: string; identifier: string }[] = [];
  function visit(node: typeof tree | typeof tree.children[number], parent?: typeof tree | typeof tree.children[number]) {
    if (node.type === 'paragraph' || node.type === 'heading')
      environment.phrasing!.set(`${node.position!.start.offset!}:${node.position!.end.offset!}`, node);
    const key = `${node.position?.start.offset}:${node.position?.end.offset}`;
    if (node.type === 'heading') environment.headingTargets!.set(slugger.slug(toString(node, { includeHtml: false })),
      { from: node.position!.start.offset!, to: node.position!.end.offset! });
    if (node.type === 'link') environment.links!.set(key, node.url);
    if (node.type === 'linkReference') references.push({ key, identifier: node.identifier });
    if (node.type === 'html' && parent && ['root', 'blockquote', 'listItem', 'list'].includes(parent.type))
      environment.htmlBlocks!.set(`${node.position!.start.offset!}:${node.position!.end.offset!}`, node.value);
    if (node.type === 'definition') {
      if (!accepted.has(node.identifier)) {
        accepted.add(node.identifier);
        environment.definitions!.push({ type: 'definition', identifier: node.identifier, url: node.url, title: node.title });
      }
    } else if (node.type !== 'footnoteDefinition' && 'children' in node) node.children.forEach(child => visit(child, node));
  }
  visit(tree);
  const destinations = new Map(environment.definitions!.map(node => [node.identifier, node.url]));
  for (const reference of references) {
    const destination = destinations.get(reference.identifier);
    if (destination !== undefined) environment.links!.set(reference.key, destination);
  }
  return environment;
}
const documentEnvironments = new WeakMap<Text, { bodyFrom: number; value: TableImageEnvironment }>();
export function documentImageEnvironment(doc: Text, bodyFrom: number): TableImageEnvironment {
  const old = documentEnvironments.get(doc);
  if (old?.bodyFrom === bodyFrom) return old.value;
  const value = tableImageEnvironment(doc.sliceString(bodyFrom));
  documentEnvironments.set(doc, { bodyFrom, value }); return value;
}
export function tableSourceTree(source: string, references: TableImageEnvironment) {
  // Dummy destinations resolve reference syntax. Accepted package definitions
  // supply the real destination and title, including container continuations.
  const definitions = references.definitions || [];
  // Package identifiers retain Markdown escapes. Do not escape them again.
  const labels = definitions.map(node => `[${node.identifier}]: /`);
  const tree = tableTree(source + '\n\n' + labels.join('\n\n'));
  tree.children = [...tree.children.filter(node => node.type !== 'definition'), ...definitions];
  return tree;
}
export function tableProjection(source: string, references: TableImageEnvironment, path: string, document?: number) {
  const tree = tableSourceTree(source, references);
  const definitions = references.definitions || [];
  const table = tree.children.find(node => node.type === 'table');
  const htmlCells = new Map<string, TableHTMLCell>();
  if (!table) return { html: renderedTable(source), images: [] as ImageInfo[], formulas: [] as FormulaPreview[], htmlCells };
  // Definition nodes supply package reference resolution but do not render.
  tree.children = [table, ...definitions];
  const { hast, images, formulas, controlled } = resourceProjection(tree, source, references, path, document);
  let row = 0;
  function collectCells(node: Nodes) {
    if (node.type === 'element' && node.tagName === 'tr') {
      node.children.filter((child): child is Element => child.type === 'element' && ['th', 'td'].includes(child.tagName)).forEach((cell, column) => {
        if (containsHTML(cell)) htmlCells.set(`${row}:${column}`, { tree: cell, controlled });
      });
      row++;
    } else if ('children' in node) node.children.forEach(collectCells);
  }
  collectCells(hast!);
  const html = DOMPurify.sanitize(toHtml(hast!), {
    FORBID_TAGS: ['a', 'img'], FORBID_ATTR: ['style', 'id', 'name', 'href', 'src', 'srcset'],
  });
  return { html, images, formulas, htmlCells };
}
export interface ProjectionNote { from: number; to: number; number: number }
export function phrasingProjection(source: string, references: TableImageEnvironment, path: string,
  document: number | undefined, notes: ProjectionNote[], block: { from: number; to: number; type: 'paragraph' | 'heading' }) {
  // Match both parsers exactly. Container prefixes belong to the original source,
  // while the accepted full-body AST supplies only the paragraph's content.
  const node = references.phrasing?.get(`${block.from}:${block.to}`);
  if (!node || node.type !== block.type || source.length !== block.to - block.from) return;
  const tree: ReturnType<typeof tableSourceTree> = { type: 'root', children: [node, ...(references.definitions || [])] };
  const result = resourceProjection(tree, source, references, path, document, notes, block.from);
  const elements = result.hast?.type === 'root' ? result.hast.children.filter(node => node.type !== 'text') : [];
  if (elements.length !== 1 || elements[0].type !== 'element') return;
  return { ...result, tree: elements[0] };
}
const containsHTML = (node: Nodes): boolean => node.type === 'raw' || 'children' in node && node.children.some(containsHTML);
function resourceProjection(tree: ReturnType<typeof tableSourceTree>, source: string,
  references: TableImageEnvironment, path: string, document?: number, notes: ProjectionNote[] = [], sourceOffset = 0) {
  const images: ImageInfo[] = [], formulas: FormulaPreview[] = [], controlled = new WeakSet<Element>();
  const controlledSlot = (node: Element) => { controlled.add(node); return node; };
  const raw = (node: { position?: { start: { offset?: number }; end: { offset?: number } } }) =>
    source.slice(node.position!.start.offset! - sourceOffset, node.position!.end.offset! - sourceOffset);
  const imageSlot = (node: { alt?: string | null; position?: { start: { offset?: number }; end: { offset?: number } } },
    destination: string, title?: string | null) => {
    // Markdown-it is used only for formatted alt text, never formula ranges or URLs.
    const token = tableMarkdown.parseInline(raw(node), references)[0]?.children?.find(child => child.type === 'image');
    const alt = token ? imageInfo(token, '').alt : node.alt || '';
    const slot = images.length;
    images.push({ destination, title: title || '', alt, path, ...(document === undefined ? {} : { document }) });
    return controlledSlot({ type: 'element', tagName: 'span', properties: { className: ['preview-image', 'table-image'], dataTableImage: slot },
      children: [{ type: 'text', value: alt }] });
  };
  const hast = toHast(tree, { allowDangerousHtml: true, handlers: {
    footnoteReference: (_state, node) => {
      const note = notes.find(note => note.from + sourceOffset === node.position?.start.offset && note.to + sourceOffset === node.position?.end.offset);
      return note ? controlledSlot({ type: 'element', tagName: 'sup', properties: { className: ['preview-footnote'], ariaLabel: `Footnote ${note.number}` },
        children: [{ type: 'text', value: String(note.number) }] }) : { type: 'text', value: raw(node) };
    },
    html: (_state, node) => ({ type: 'raw', value: node.value }),
    link: (state, node) => ({ type: 'element', tagName: 'span', properties: {}, children: state.all(node) }),
    linkReference: (state, node) => ({ type: 'element', tagName: 'span', properties: {}, children: state.all(node) }),
    image: (_state, node) => imageSlot(node, node.url, node.title),
    imageReference: (state, node) => {
      const definition = state.definitionById.get(node.identifier.toUpperCase());
      return definition ? imageSlot(node, definition.url, definition.title) : { type: 'text', value: raw(node) };
    },
    inlineMath: (_state, node) => {
      const slot = formulas.length, value = raw(node);
      formulas.push({ formula: node.value, source: value, display: false });
      return controlledSlot({ type: 'element', tagName: 'span', properties: { className: ['table-math'], dataTableMath: slot },
        children: [{ type: 'text', value }] });
    },
  } });
  return { hast, images, formulas, controlled };
}
export interface TableHTMLCell { tree: Element; controlled: WeakSet<Element> }
export function htmlFrame(source: string): string {
  const html = DOMPurify.sanitize(source, { ADD_TAGS: ['style'], FORCE_BODY: true,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'base', 'link', 'meta'],
    FORBID_ATTR: ['href', 'srcset', 'action', 'formaction'] });
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: https:; font-src data:; form-action 'none'; base-uri 'none'"><style>body{margin:0;padding:0;color:#24272c;font:16px system-ui}@media(prefers-color-scheme:dark){body{color:#f0f0f0}}p{margin:0}img{max-width:100%}</style></head><body>${html}</body></html>`;
}

export async function renderDiagram(source: string, target: 'screen' | 'print' = 'screen'): Promise<string> {
  const { renderAsync } = await import('pele/lazy');
  const settings = getDiagramSettings();
  const { svg } = await renderAsync(source, { links: false, images: false, ...diagramRenderOptions(settings) });
  // Pele's root SVG carries an inline style; the chosen colors and radius go in front of it.
  const styled = colorBoxesByShape(svg.replace(/^(<svg\b[^>]*?\sstyle=")/, `$1${diagramSvgStyle(settings, target)}`), settings, target);
  return DOMPurify.sanitize(styled, { USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['a', 'foreignObject'], FORBID_ATTR: ['href', 'xlink:href'] });
}

// A removed widget must never publish a result into a newer edit surface.
export function mountResult(dom: HTMLElement, result: Promise<string>, measure: () => void) {
  let alive = true;
  result.then(html => {
    if (!alive || !dom.isConnected) return;
    dom.innerHTML = html; dom.dataset.ready = 'true'; measure();
  }, error => {
    if (!alive || !dom.isConnected) return;
    dom.classList.add('preview-error'); dom.textContent = `Cannot render: ${String(error)}. Select to edit the source.`;
    dom.dataset.ready = 'error'; measure();
  });
  return () => { alive = false; };
}
