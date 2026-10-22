import { SyntaxNode, Tree } from '@lezer/common';

export function outerBlocks(tree: Tree): SyntaxNode[] {
  const result: SyntaxNode[] = [];
  // The front matter language mounts a Markdown Document below its outer root.
  const collect = (node: SyntaxNode) => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.name === 'Document') collect(child); else result.push(child);
    }
  };
  collect(tree.topNode); return result;
}
