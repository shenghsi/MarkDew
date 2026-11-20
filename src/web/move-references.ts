import { parser } from '@lezer/markdown';
import MarkdownIt from 'markdown-it';
import { mathRanges } from './math-ranges';

export interface ReferenceChange { from: number; to: number; insert: string }
const markdown = new MarkdownIt();
const slash = (path: string) => path.replace(/\\/g, '/');
function normalized(path: string): string {
  // Windows canonical paths can use the verbatim prefix. Links use normal drive paths.
  path = slash(path).replace(/^\/\/\?\/([a-z]:\/)/i, '$1').replace(/^\/\/\?\/UNC\//i, '//');
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part);
  }
  return (path.startsWith('/') ? '/' : '') + parts.join('/');
}
const parent = (path: string) => path.slice(0, path.lastIndexOf('/')) || '/';
const key = (path: string) => /^[a-z]:\//i.test(path) || typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? path.toLowerCase() : path;
function inside(path: string, folder: string): boolean { return key(path) === key(folder) || key(path).startsWith(key(folder) + '/'); }
export function movedPath(path: string, oldPath: string, newPath: string): string {
  return inside(path, oldPath) ? newPath + path.slice(oldPath.length) : path;
}
function relative(from: string, to: string): string {
  const a = from.split('/'), b = to.split('/');
  if (key(a[0]) !== key(b[0])) return to;
  let common = 0; while (common < a.length && common < b.length && key(a[common]) === key(b[common])) common++;
  return [...a.slice(common).map(() => '..'), ...b.slice(common)].join('/') || '.';
}
// Only parsed destinations change. Labels, titles, code, and source line endings stay intact.
export function moveReferenceChanges(source: string, documentPath: string, oldPath: string, newPath: string): ReferenceChange[] {
  documentPath = normalized(documentPath); oldPath = normalized(oldPath); newPath = normalized(newPath);
  const nextDocument = movedPath(documentPath, oldPath, newPath), changes: ReferenceChange[] = [];
  const formulas = source.includes('$') ? mathRanges(source) : [];
  function destination(from: number, to: number, html = false) {
    if (formulas.some(range => from >= range.from && to <= range.to)) return;
    const raw = source.slice(from, to), angle = !html && raw.startsWith('<') && raw.endsWith('>');
    const spelling = angle ? raw.slice(1, -1) : raw;
    const value = markdown.utils.unescapeAll(spelling);
    if (!value || value.startsWith('#') || value.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(value) && !/^[a-z]:[/\\]/i.test(value)) return;
    const suffixAt = value.search(/[?#]/), encoded = suffixAt < 0 ? value : value.slice(0, suffixAt), suffix = suffixAt < 0 ? '' : value.slice(suffixAt);
    let decoded: string; try { decoded = decodeURIComponent(encoded); } catch { return; }
    if (!decoded || /\p{Cc}/u.test(decoded)) return;
    const absolute = decoded.startsWith('/') || /^[a-z]:[/\\]/i.test(decoded);
    const target = normalized(absolute ? decoded : parent(documentPath) + '/' + decoded);
    const nextTarget = movedPath(target, oldPath, newPath);
    if (nextTarget === target && (absolute || parent(nextDocument) === parent(documentPath))) return;
    let next = absolute ? nextTarget : relative(parent(nextDocument), nextTarget);
    // Retain explicit ./ when the new destination is in or below the same folder.
    if (decoded.startsWith('./') && !next.startsWith('.') && !absolute) next = './' + next;
    next = next.split('/').map((part, index) => index === 0 && /^[a-z]:$/i.test(part) ? part : encodeURIComponent(part).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())).join('/') + suffix;
    if (html) next = next.replace(/&/g, '&amp;');
    else if (angle) next = '<' + next + '>';
    if (next !== raw) changes.push({ from, to, insert: next });
  }
  // Front matter is metadata, not document links.
  const front = /^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/.exec(source)?.[0].length || 0;
  parser.parse(source).iterate({ enter(node) {
    if (node.to <= front) return false;
    if (node.name === 'URL') destination(node.from, node.to);
    if (node.name === 'HTMLTag' || node.name === 'HTMLBlock') {
      const text = source.slice(node.from, node.to);
      if (/^\s*<(?:script|style|pre|code)(?:\s|>)/i.test(text)) return false;
      // Read attributes only inside tags, so text in an HTML block stays unchanged.
      const tags = /<(?:[a-z][\w:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
      for (const tag of text.matchAll(tags)) {
        const tagStart = /^<[a-z][\w:-]*/i.exec(tag[0])![0].length;
        const attrs = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        for (const attr of tag[0].slice(tagStart).matchAll(attrs)) {
          if (!/^(?:href|src)$/i.test(attr[1])) continue;
          const value = attr[2] ?? attr[3] ?? attr[4];
          if (value === undefined) continue;
          const start = node.from + tag.index! + tagStart + attr.index! + attr[0].indexOf('=') + 1;
          const offset = source.slice(start, node.from + tag.index! + tagStart + attr.index! + attr[0].length).indexOf(value);
          destination(start + offset, start + offset + value.length, true);
        }
      }
    }
  } });
  return changes.sort((a, b) => a.from - b.from);
}
export function applyReferenceChanges(source: string, changes: ReferenceChange[]): string {
  for (const change of [...changes].reverse()) source = source.slice(0, change.from) + change.insert + source.slice(change.to);
  return source;
}
