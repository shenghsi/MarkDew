// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { documentLanguage } from '../../src/web/document-language';
import { footnoteField } from '../../src/web/footnotes';
import { localLink } from '../../src/web/local-links';
import { linkTarget, headingTarget } from '../../src/web/link-navigation';

it('validates encoded local paths and decodes fragments once', () => {
  expect(localLink('../日%20%2520%23.md#%E6%97%A5%2520')).toEqual({ destination: '../日%20%2520%23.md', fragment: '日%20' });
  for (const path of ['/notes/a.MD', 'C:%5Cnotes%5Ca.md', '%5C%5Cserver%5Cshare%5Ca.txt', 'a.markdown'])
    expect(localLink(path).destination).toBe(path);
  for (const bad of ['', 'x.png', 'a.md?x', 'file:///a.md', 'mailto:a.md', '//host/a.md', '%00.md', '%0a.md', '%ff.md', 'a.md#%xx', 'a.md#%00', 'a.md\n', 'x'.repeat(8193) + '.md'])
    expect(() => localLink(bad)).toThrow();
});
it('gets exact package destinations for direct and reference local links and reuses heading rules', () => {
  const source = '[direct](../a%23.md#target) and [ref][a]\n\n[a]: b.md#target-1\n\n# Target\n\n# Target';
  const state = EditorState.create({ doc: source, extensions: [documentLanguage(), footnoteField] });
  ensureSyntaxTree(state, state.doc.length, 1000);
  expect(linkTarget(state, 1)).toEqual({ kind: 'file', destination: '../a%23.md', fragment: 'target' });
  expect(linkTarget(state, source.indexOf('[ref]') + 1)).toEqual({ kind: 'file', destination: 'b.md', fragment: 'target-1' });
  expect(headingTarget(state, 'target-1')).toEqual({ kind: 'heading', position: source.lastIndexOf('# Target') });
  expect(headingTarget(state, 'missing')).toMatch(/not found/);
});
