import type { MarkdownConfig } from '@lezer/markdown';

// A display equation fence is a line with only `$$`, as in a code fence.
export const mathFence = /^ {0,3}\$\$[ \t]*$/;
const lookahead = 200000;

// Top-level `$$` fences make a MathBlock, so blank lines can stay inside the
// equation. Without a closing fence the lines stay an ordinary paragraph.
export const mathBlockSyntax: MarkdownConfig = {
  defineNodes: [{ name: 'MathBlock', block: true }, 'MathMark'],
  parseBlock: [{
    name: 'MathBlock',
    before: 'FencedCode',
    endLeaf: (cx, line) => cx.parentType().name === 'Document' && mathFence.test(line.text) && closes(cx, line.text.length),
    parse(cx, line) {
      if (cx.parentType().name !== 'Document' || line.baseIndent !== 0 || !mathFence.test(line.text) || !closes(cx, line.text.length)) return false;
      const from = cx.lineStart + line.pos, marks = [cx.elt('MathMark', from, from + 2)];
      let to = cx.lineStart + line.text.length;
      while (cx.nextLine()) {
        if (line.baseIndent === 0 && mathFence.test(line.text)) {
          const at = cx.lineStart + line.pos;
          marks.push(cx.elt('MathMark', at, at + 2)); to = cx.lineStart + line.text.length;
          cx.nextLine(); break;
        }
      }
      cx.addElement(cx.elt('MathBlock', from, to, marks));
      return true;
    }
  }]
};

// BlockContext keeps its Input private in the type declarations, but the
// runtime object has it. Search a bounded range for a later fence line.
function closes(cx: unknown, lineEnd: number): boolean {
  const context = cx as { lineStart: number; input: { length: number; read(from: number, to: number): string } };
  const start = context.lineStart + lineEnd;
  const text = context.input.read(start, Math.min(context.input.length, start + lookahead));
  return /\n {0,3}\$\$[ \t]*(?=\n|$)/.test(text);
}
