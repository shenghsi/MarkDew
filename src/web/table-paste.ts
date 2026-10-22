import { tableSourceTree, tableImageEnvironment } from './renderers';

const prefix = '| A |\n| - |\n| ';
export function cellPasteContext(text: string, from: number, to: number, references: ReturnType<typeof tableImageEnvironment>) {
  const tree = tableSourceTree(prefix + text + ' |', references);
  let valid = true;
  function visit(node: typeof tree | typeof tree.children[number]) {
    const start = (node.position?.start.offset ?? 0) - prefix.length, end = (node.position?.end.offset ?? 0) - prefix.length;
    if (['link', 'linkReference', 'image', 'imageReference', 'inlineCode', 'inlineMath', 'html'].includes(node.type)
      && (from === to ? start < from && from < end : start < to && end > from)) valid = false;
    if ('children' in node) node.children.forEach(visit);
  }
  visit(tree); return valid;
}

// Check the exact inserted range, including enclosing code, math, or link syntax.
export function cellImageRange(text: string, from: number, to: number, destination: string, references: ReturnType<typeof tableImageEnvironment>) {
  const tree = tableSourceTree(prefix + text + ' |', references);
  let valid = false;
  function visit(node: typeof tree | typeof tree.children[number], protectedSource = false) {
    if (node.type === 'image' && !protectedSource && node.url === destination
      && node.position?.start.offset === prefix.length + from && node.position?.end.offset === prefix.length + to) valid = true;
    if ('children' in node) node.children.forEach(child => visit(child, protectedSource || node.type === 'link' || node.type === 'linkReference'));
  }
  visit(tree); return valid;
}
