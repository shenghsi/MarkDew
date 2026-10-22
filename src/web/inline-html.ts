import { raw } from 'hast-util-raw';
import { Tokenizer } from 'parse5';
import type { Element, ElementContent, Root, RootContent } from 'hast';

interface ProjectionSlot { type: 'projectionSlot'; key: number }
declare module 'hast' {
  interface ElementContentMap { projectionSlot: ProjectionSlot }
  interface RootContentMap { projectionSlot: ProjectionSlot }
}

const semantic = new Set(['span', 'b', 'strong', 'i', 'em', 'u', 's', 'del',
  'small', 'sub', 'sup', 'kbd', 'code', 'samp', 'var', 'mark', 'abbr', 'cite',
  'q', 'time', 'br', 'wbr', 'a']);

const blocks = new Set([...semantic, 'div', 'section', 'article', 'p',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li',
  'pre', 'table', 'caption', 'colgroup', 'col', 'thead', 'tbody', 'tfoot',
  'tr', 'td', 'th', 'dl', 'dt', 'dd', 'hr', 'figure', 'figcaption',
  'details', 'summary', 'center', 'font']);

// Block preview and export use an inert fragment, with no slots or resources.
// Validate the complete package-parsed tree before publication.
export function blockHTML(source: string): Element | undefined {
  // Fragment parsing can discard document wrappers and their attributes.
  // Package tokens reject them before that repair can hide unsupported input.
  let accepted = true;
  const ignore = () => {};
  const tokenizer = new Tokenizer({}, {
    onComment: ignore, onCharacter: ignore, onNullCharacter: ignore,
    onWhitespaceCharacter: ignore, onEof: ignore,
    onDoctype: () => { accepted = false; },
    onStartTag: token => { if (!blocks.has(token.tagName) || token.attrs.some(attr => attr.name === 'style')) accepted = false; },
    onEndTag: token => { if (!blocks.has(token.tagName)) accepted = false; },
  });
  tokenizer.write(source, true);
  if (!accepted) return undefined;
  let parsed: Root | RootContent;
  try { parsed = raw({ type: 'root', children: [{ type: 'raw', value: source }] }); }
  catch { return undefined; }
  if (parsed.type !== 'root') return undefined;
  function validate(node: RootContent | ElementContent): boolean {
    if (node.type === 'text' || node.type === 'comment') return true;
    if (node.type !== 'element' || !blocks.has(node.tagName) || Object.hasOwn(node.properties, 'style')) return false;
    const properties = Object.fromEntries(Object.entries(node.properties)
      .filter(([key]) => ['dir', 'lang', 'title', 'align', 'open', 'color', 'face', 'size', 'clear'].includes(key)));
    for (const [key, value] of Object.entries(node.properties)) {
      if ((node.tagName === 'td' || node.tagName === 'th') && ['colSpan', 'rowSpan'].includes(key) ||
        (node.tagName === 'col' || node.tagName === 'colgroup') && key === 'span') {
        if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 1000) return false;
        properties[key] = value;
      } else if (node.tagName === 'ol' && key === 'start') {
        if (typeof value !== 'number' || !Number.isSafeInteger(value) || Math.abs(value) > 1000000000) return false;
        properties[key] = value;
      }
    }
    node.properties = properties;
    return node.children.every(validate);
  }
  if (!parsed.children.every(validate)) return undefined;
  return { type: 'element', tagName: 'div', properties: {}, children: parsed.children as ElementContent[] };
}

// Parse a complete phrasing fragment, so opening and closing HTML tags can
// enclose Markdown and controlled renderer slots. Authored HTML cannot create
// a custom HAST node. The upstream parser clones pass-through nodes; private
// keys, complete membership, order, and supported ancestry establish provenance.
export function inlineHTML(element: Element, controlled: WeakSet<Element>, rejectStyles = false): Element | undefined {
  const slots = new Map<number, Element>();
  function protect(node: ElementContent): ElementContent {
    if (node.type !== 'element') return node;
    if (controlled.has(node) || node.tagName === 'input') {
      const key = slots.size; slots.set(key, node); return { type: 'projectionSlot', key };
    }
    return { ...node, children: node.children.map(protect) };
  }
  const input: Root = { type: 'root', children: [{ type: 'element', tagName: 'span',
    properties: {}, children: element.children.map(protect) }] };
  let parsed: Root | RootContent;
  try { parsed = raw(input, { passThrough: ['projectionSlot'] }); } catch { return undefined; }
  if (parsed.type !== 'root' || parsed.children.length !== 1) return undefined;
  const wrapper = parsed.children[0];
  if (wrapper.type !== 'element' || wrapper.tagName !== 'span') return undefined;
  let next = 0;
  function validate(node: ElementContent): boolean {
    if (node.type === 'projectionSlot') return node.key === next++ && slots.has(node.key);
    if (node.type === 'text') return true;
    if (node.type === 'comment') return true;
    if (node.type !== 'element' || !semantic.has(node.tagName)) return false;
    if (rejectStyles && Object.hasOwn(node.properties, 'style')) return false;
    // No authored classes, IDs, styles, data attributes, resources, or actions
    // enter the application DOM. These three attributes affect text only.
    node.properties = Object.fromEntries(Object.entries(node.properties)
      .filter(([key]) => ['dir', 'lang', 'title'].includes(key)));
    return node.children.every(validate);
  }
  if (!wrapper.children.every(validate) || next !== slots.size) return undefined;
  function expand(node: ElementContent): ElementContent {
    if (node.type === 'projectionSlot') return slots.get(node.key)!;
    return node.type === 'element' ? { ...node, children: node.children.map(expand) } : node;
  }
  return { ...element, children: wrapper.children.map(expand) };
}
