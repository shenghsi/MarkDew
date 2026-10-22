import { expect, it, vi } from 'vitest';
import { embedDiagrams, mermaidBlocks } from '../../src/web/diagram-images';

const png = 'data:image/png;base64,iVBORw0KGgo=';
it('finds mermaid blocks, but not a fence inside another fence or other languages', () => {
  const markdown = '# T\n\n```mermaid\nflowchart LR\n  A-->B\n```\n\n````md\n```mermaid\nin code\n```\n````\n\n```js\nmermaid()\n```\n\n~~~ mermaid\nsequenceDiagram\n  A->>B: hi\n~~~\n\n```mermaid\nnever closed\n';
  const blocks = mermaidBlocks(markdown);
  expect(blocks.map(block => block.source)).toEqual(['flowchart LR\n  A-->B', 'sequenceDiagram\n  A->>B: hi']);
  expect(markdown.slice(blocks[0].from, blocks[0].to)).toBe('```mermaid\nflowchart LR\n  A-->B\n```');
  expect(mermaidBlocks('```mermaid\r\ngraph TD\r\n```\r\n')[0].source).toBe('graph TD');
  expect(mermaidBlocks('no fences here')).toEqual([]);
});

it('replaces each drawn diagram with an image and keeps a diagram that fails as code', async () => {
  const markdown = 'Before\n\n```mermaid\nA\n```\n\nMiddle\n\n```mermaid\nbad\n```\n\n```mermaid\nB\n```\nEnd';
  const draw = vi.fn(async (source: string) => { if (source === 'bad') throw new Error('syntax'); return png; });
  const progress = vi.fn();
  const result = await embedDiagrams(markdown, draw, progress);
  expect(result.drawn).toBe(2); expect(result.failed).toBe(1);
  expect(result.markdown).toBe(`Before\n\n![Mermaid diagram](${png})\n\nMiddle\n\n\`\`\`mermaid\nbad\n\`\`\`\n\n![Mermaid diagram](${png})\nEnd`);
  expect(progress.mock.calls).toEqual([[0, 3], [1, 3], [2, 3]]);
});

it('refuses a result that is not a PNG data URL', async () => {
  for (const bad of ['http://example.com/a.png', 'data:image/svg+xml;base64,AAAA', 'data:image/png;base64,AAAA)](x', '']) {
    const result = await embedDiagrams('```mermaid\nA\n```', async () => bad);
    expect(result.failed).toBe(1); expect(result.drawn).toBe(0); expect(result.markdown).toBe('```mermaid\nA\n```');
  }
});
