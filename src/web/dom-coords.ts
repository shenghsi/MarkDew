export function clickOffsetInNode(container: Node, point: { x: number; y: number }): number | null {
  const doc = container.ownerDocument || document;
  let targetNode: Node | null = null;
  let targetOffset = 0;
  if (typeof (doc as any).caretPositionFromPoint === 'function') {
    const pos = (doc as any).caretPositionFromPoint(point.x, point.y);
    if (pos && pos.offsetNode && container.contains(pos.offsetNode)) {
      targetNode = pos.offsetNode;
      targetOffset = pos.offset;
    }
  } else if (typeof (doc as any).caretRangeFromPoint === 'function') {
    const range = (doc as any).caretRangeFromPoint(point.x, point.y);
    if (range && range.startContainer && container.contains(range.startContainer)) {
      targetNode = range.startContainer;
      targetOffset = range.startOffset;
    }
  }
  if (!targetNode) return null;
  if (targetNode.nodeType !== Node.TEXT_NODE && targetNode.childNodes.length > 0) {
    const childIndex = Math.min(targetOffset, targetNode.childNodes.length - 1);
    const child = targetNode.childNodes[childIndex];
    if (child) {
      targetNode = child;
      targetOffset = targetOffset > childIndex ? (child.textContent?.length ?? 0) : 0;
    }
  }
  let offset = 0;
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let current: Node | null = walker.nextNode();
  while (current) {
    if (current === targetNode || current.contains(targetNode)) {
      return offset + Math.max(0, Math.min(targetOffset, current.textContent?.length ?? 0));
    }
    offset += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }
  return null;
}
