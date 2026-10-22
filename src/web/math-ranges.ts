import { fromMarkdown } from 'mdast-util-from-markdown';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown } from 'mdast-util-math';

export interface MathRange { from: number; to: number; formula: string; block: boolean }
const cache = new Map<string, MathRange[]>();
// Parse Markdown math with the upstream extension. Offsets are UTF-16, as in CodeMirror.
export function mathRanges(source: string): MathRange[] {
  const previous = cache.get(source);
  if (previous) return previous;
  const ranges: MathRange[] = [];
  const tree = fromMarkdown(source, { extensions: [math()], mdastExtensions: [mathFromMarkdown()] });
  function visit(node: typeof tree | typeof tree.children[number]) {
    if (node.type === 'math' || node.type === 'inlineMath') {
      ranges.push({ from: node.position!.start.offset!, to: node.position!.end.offset!,
        formula: node.value, block: node.type === 'math' });
    } else if ('children' in node) for (const child of node.children) visit(child);
  }
  visit(tree);
  if (cache.size >= 128) cache.delete(cache.keys().next().value!);
  if (source.length < 65536) cache.set(source, ranges);
  return ranges;
}
