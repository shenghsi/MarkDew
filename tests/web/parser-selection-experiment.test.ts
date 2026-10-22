// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { EditorState, Transaction } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTree, getIndentation, foldable, language } from '@codemirror/language';
import { CompletionContext } from '@codemirror/autocomplete';
import { history, isolateHistory, undo, redo, undoDepth } from '@codemirror/commands';
import { languages } from '@codemirror/language-data';
import { classHighlighter, highlightTree } from '@lezer/highlight';
import { Parser, TreeFragment, Tree, NodeProp } from '@lezer/common';
import { documentLanguage } from '../../src/web/document-language';
import { fromSource, normalize, sourceExtensions, sourceField, savedSource } from '../../src/web/source';
import { collectPreview, previewDecorations } from '../performance/experiments/point-comparison/static-preview';
import { PackageParserSelector, selectedDocumentLanguage, selectParser } from '../performance/experiments/point-comparison/document-language';
import { RangeSet } from '@codemirror/state';
import { markdownLanguage } from '@codemirror/lang-markdown';
import { MountedMarkdownParser, mountedDocumentLanguage } from '../performance/experiments/point-comparison/mounted-document-language';

function state(source: string, selected: boolean | 'mounted') {
  const record = fromSource(source);
  let value = EditorState.create({ doc: normalize(record.raw), extensions: [sourceExtensions(record), history(),
    selected === 'mounted' ? mountedDocumentLanguage() : selected ? selectedDocumentLanguage() : documentLanguage()] });
  expect(ensureSyntaxTree(value, value.doc.length, 1000)).not.toBeNull();
  return value.update({}).state;
}
function nodes(tree: Tree) {
  const result: unknown[] = [];
  tree.iterate({ enter(ref) { if (!['Document', 'Body'].includes(ref.name)) result.push([ref.name, ref.from, ref.to]); } });
  return result;
}
function highlights(tree: Tree) {
  const result: unknown[] = [];
  highlightTree(tree, classHighlighter, (from, to, classes) => result.push([from, to, classes])); return result;
}
function services(value: EditorState) {
  const clean = (data: unknown) => JSON.parse(JSON.stringify(data, (_key, item) => typeof item === 'function'
    ? `function:${item.name}` : item instanceof RegExp ? `regexp:${item.source}/${item.flags}` : item));
  return Array.from({ length: value.doc.length + 1 }, (_, pos) =>
    [-1, 0, 1].map(side => ['commentTokens', 'indentOnInput', 'wordChars', 'closeBrackets', 'autocomplete']
      .map(key => clean(value.languageDataAt(key, pos, side as -1 | 0 | 1)))));
}
function equivalent(candidate: EditorState, original: EditorState) {
  expect(nodes(syntaxTree(candidate))).toEqual(nodes(syntaxTree(original)));
  expect(highlights(syntaxTree(candidate))).toEqual(highlights(syntaxTree(original)));
  expect(services(candidate)).toEqual(services(original));
  for (let pos = 0; pos <= candidate.doc.length; pos++)
    expect(getIndentation(candidate, pos), JSON.stringify({ doc: candidate.doc.toString(), pos })).toEqual(getIndentation(original, pos));
  for (let number = 1; number <= candidate.doc.lines; number++) {
    const line = candidate.doc.line(number);
    expect(getIndentation(candidate, line.from), JSON.stringify({ doc: candidate.doc.toString(), pos: line.from }))
      .toEqual(getIndentation(original, line.from));
    expect(foldable(candidate, line.from, line.to)).toEqual(foldable(original, line.from, line.to));
  }
  const decorations = (value: EditorState) => previewDecorations(value, collectPreview(value, syntaxTree(value)));
  expect(RangeSet.eq([decorations(candidate)], [decorations(original)])).toBe(true);
  expect(savedSource(candidate.field(sourceField))).toBe(savedSource(original.field(sourceField)));
}

it('retains package parsing, highlighting, services and full preview across prefix and resource fixtures', async () => {
  await languages.find(language => language.name === 'JavaScript')!.load();
  const fixtures = ['', '-', '--', '---', '---\n', '---\ntitle: x\n# Hidden', '---\n---\n# Body',
    '---\na: x\n...\n# Hidden', '---\na: x\n---   \n# Hidden', '\n---\na: x\n---\n# Body',
    ' ---\na: x\n---\n# Body', '\t---\nx: y\n---\n# Body', '\uFEFF---\r\ntitle: 日本語\r---\n# Body\rEnd',
    '# Heading\n\nParagraph **words** and `code`[^a].\n\n[^a]: Note\n', '日本語 *words* 😀\n',
    'Text\n---\n# Body', '> - parent\n>   - child\n', '<div>HTML</div>\n\n![alt](image.png)\n',
    '| A | B |\n| - | - |\n| x | y |\n', 'Math $x$\n\n$$\nx^2\n$$\n',
    '```mermaid\nflowchart LR\nA-->B\n```\n', '```javascript\nconst value = {nested: true};\n```\n',
    '---\nitems:\n- one\n---\n```javascript\nconst x = 1;\n```\n', '<di'];
  for (const source of fixtures) for (const profile of [true, 'mounted'] as const)
    equivalent(state(source, profile), state(source, false));
});

it.each([true, 'mounted'] as const)('retains actual completion results (%s)', async profile => {
  for (const source of ['<di', '---\na: x\n---\n<di', '```javascript\ncons\n```']) {
    const a = state(source, profile), b = state(source, false), pos = source.indexOf('cons') >= 0 ? source.indexOf('cons') + 4 : source.length;
    const results = async (value: EditorState) => Promise.all(value.languageDataAt('autocomplete', pos).map(async provider => {
      if (typeof provider !== 'function') return provider;
      const result = await provider(new CompletionContext(value, pos, true));
      return result && { from: result.from, to: result.to, options: result.options.map((option: { label: string; type?: string }) => [option.label, option.type]) };
    }));
    expect(await results(a)).toEqual(await results(b));
  }
});

it.each([true, 'mounted'] as const)('retains exact first-line parser switches, incomplete openers and Undo/Redo (%s)', profile => {
  const source = '\uFEFF# Body\r\n\rEnd'; let current = state(source, profile);
  const target = { get state() { return current; }, dispatch(transaction: Transaction) { current = transaction.state; } };
  const edits = [{ from: 0, insert: '-' }, { from: 1, insert: '-' }, { from: 2, insert: '-\ntitle: x\n---\n' },
    { from: 0, to: 3, insert: '#' }, { from: 0, to: 1, insert: '---' }, { from: 0, to: 19, insert: '' }];
  for (const changes of edits) {
    current = current.update({ changes, annotations: isolateHistory.of('full') }).state;
    expect(ensureSyntaxTree(current, current.doc.length, 1000)).not.toBeNull(); current = current.update({}).state;
    equivalent(current, state(savedSource(current.field(sourceField)), false));
  }
  const edited = savedSource(current.field(sourceField)), count = undoDepth(current);
  for (let i = 0; i < count; i++) { expect(undo(target)).toBe(true); ensureSyntaxTree(current, current.doc.length, 1000); current = current.update({}).state;
    equivalent(current, state(savedSource(current.field(sourceField)), false)); }
  expect(savedSource(current.field(sourceField))).toBe(source);
  for (let i = 0; i < count; i++) { expect(redo(target)).toBe(true); ensureSyntaxTree(current, current.doc.length, 1000); current = current.update({}).state;
    equivalent(current, state(savedSource(current.field(sourceField)), false)); }
  expect(savedSource(current.field(sourceField))).toBe(edited);
});

it('retains native activity and regions with the mounted public-tree adapter', () => {
  for (const source of ['', '-', '--', '---', '---\n', '# Heading\n\nWords.\n', '<di',
    '```javascript\nconst x = 1;\n```\n', '---\na: x\n---\n# Body\n']) {
    const a = state(source, 'mounted'), b = state(source, false);
    for (let pos = 0; pos <= a.doc.length; pos++) for (const side of [-1, 0, 1] as const) {
      expect(markdownLanguage.isActiveAt(a, pos, side)).toBe(markdownLanguage.isActiveAt(b, pos, side));
      expect(a.facet(language)!.isActiveAt(a, pos, side)).toBe(b.facet(language)!.isActiveAt(b, pos, side));
    }
    expect(markdownLanguage.findRegions(a)).toEqual(markdownLanguage.findRegions(b));
    expect(a.facet(language)!.findRegions(a)).toEqual(b.facet(language)!.findRegions(b));
  }
});

it('forwards native partial parses, ranges and root-specific fragments without shared choice state', () => {
  const support = selectedDocumentLanguage(), selector = support.language.parser as PackageParserSelector;
  expect(selector.roots.markdown).not.toBe(selector.roots.wrapper);
  const md = selector.markdownParser.parse('# Heading\n\nWords.\n'), yaml = selector.wrapperParser.parse('---\na: x\n---\nWords.\n');
  const fragments = [...TreeFragment.addTree(md), ...TreeFragment.addTree(yaml)];
  const native: ReturnType<Parser['startParse']>[] = [];
  const calls: unknown[] = [], parsers = [selector.markdownParser, selector.wrapperParser].map((parser, at) => new class extends Parser {
    createParse(...args: Parameters<Parser['createParse']>) {
      calls.push([at, args[1], args[2]]);
      const partial = parser.startParse(...args); native.push(partial); return partial;
    }
  });
  const probe = new PackageParserSelector(parsers[0], parsers[1]); calls.length = 0; native.length = 0;
  const input = (text: string) => ({ length: text.length, lineChunks: false, chunk: (from: number) => text.slice(from), read: (from: number, to: number) => text.slice(from, to) });
  const a = probe.startParse('# Heading\n\nWords.\n', fragments), b = probe.startParse('---\na: x\n---\nWords.\n', fragments);
  expect(a).toBe(native[0]); expect(b).toBe(native[1]);
  expect((calls[0] as unknown[])[2]).toEqual([{ from: 0, to: 18 }]);
  expect((calls[1] as unknown[])[2]).toEqual([{ from: 0, to: 20 }]);
  a.stopAt(10); b.stopAt(15); expect(a.stoppedAt).toBe(10); expect(b.stoppedAt).toBe(15);
  let ta: Tree | null = null, tb: Tree | null = null;
  while (!ta || !tb) { if (!ta) ta = a.advance(); if (!tb) tb = b.advance(); }
  expect(ta.type).toBe(probe.roots.markdown); expect(tb.type).toBe(probe.roots.wrapper);
  expect((calls[0] as unknown[])[1]).toEqual(TreeFragment.addTree(md));
  expect((calls[1] as unknown[])[1]).toEqual(TreeFragment.addTree(yaml));
  for (const ranges of [[{ from: 1, to: 3 }], [{ from: 0, to: 1 }, { from: 2, to: 3 }]])
    expect(selectParser(input('abc'), ranges)).toBe('wrapper');
  expect(selectParser(input('-'), [{ from: 0, to: 1 }])).toBe('wrapper');
});

it.each([true, 'mounted'] as const)('keeps parser choice independent in states that share one language support (%s)', profile => {
  const support = profile === 'mounted' ? mountedDocumentLanguage() : selectedDocumentLanguage();
  const create = (source: string) => {
    const record = fromSource(source);
    return EditorState.create({ doc: normalize(record.raw), extensions: [support, sourceExtensions(record), history()] });
  };
  const publish = (value: EditorState) => {
    expect(ensureSyntaxTree(value, value.doc.length, 1000)).not.toBeNull(); return value.update({}).state;
  };
  let a = publish(create('\uFEFF# 日本語\r\n\rWords.'));
  let b = publish(create('---\r\ntitle: x\r---\n# Other\n'));
  for (const insert of ['中', '𠀀', 'e\u0301']) {
    a = publish(a.update({ changes: { from: a.doc.length, insert } }).state);
    b = publish(b.update({ changes: { from: b.doc.length, insert } }).state);
    equivalent(a, state(savedSource(a.field(sourceField)), false));
    equivalent(b, state(savedSource(b.field(sourceField)), false));
  }
  a = publish(a.update({ changes: { from: 0, insert: '---\ntitle: new\n---\n' } }).state);
  b = publish(b.update({ changes: { from: 0, to: b.doc.toString().indexOf('# Other'), insert: '' } }).state);
  equivalent(a, state(savedSource(a.field(sourceField)), false));
  equivalent(b, state(savedSource(b.field(sourceField)), false));
});

it('publishes a useful mounted partial prefix with native boundary activity and services', () => {
  const prefix = '# Heading\n\nParagraph **words**.\n\n```javascript\nconst x = 1;\n```\n\n';
  const source = prefix + 'Paragraph words.\n\n'.repeat(2000), support = mountedDocumentLanguage();
  const parser = support.language.parser;
  support.language.parser = new class extends Parser {
    createParse(...args: Parameters<Parser['createParse']>) {
      const partial = parser.startParse(...args); partial.stopAt(Math.min(args[0].length, prefix.length + 32)); return partial;
    }
  };
  const candidate = EditorState.create({ doc: source, extensions: [support] }), tree = syntaxTree(candidate);
  expect(tree.length).toBeGreaterThanOrEqual(prefix.length); expect(tree.length).toBeLessThan(source.length);
  const original = state(source, false);
  for (let pos = 0; pos < prefix.length; pos++) {
    for (const side of [-1, 0, 1] as const) {
      expect(markdownLanguage.isActiveAt(candidate, pos, side)).toBe(markdownLanguage.isActiveAt(original, pos, side));
      expect(candidate.facet(language)!.isActiveAt(candidate, pos, side)).toBe(original.facet(language)!.isActiveAt(original, pos, side));
      for (const key of ['commentTokens', 'indentOnInput', 'wordChars', 'closeBrackets', 'autocomplete'])
        expect(candidate.languageDataAt(key, pos, side)).toEqual(original.languageDataAt(key, pos, side));
    }
    expect(getIndentation(candidate, pos)).toEqual(getIndentation(original, pos));
  }
  expect(markdownLanguage.findRegions(candidate)).toEqual([{ from: 0, to: tree.length }]);
  expect(syntaxTree(candidate)).toBe(tree);
});

it('retains fragment provenance and exact native partial-parser forwarding', () => {
  const support = mountedDocumentLanguage(), parser = support.language.parser as MountedMarkdownParser;
  const ordinary = '# Heading\n\nWords.\n', metadata = '---\na: x\n---\nWords.\n';
  const mdTree = parser.parse(ordinary), yamlTree = parser.parse(metadata);
  const foreign = (mountedDocumentLanguage().language.parser as MountedMarkdownParser).parse(ordinary);
  const fragments = [new TreeFragment(2, mdTree.length - 1, mdTree, -3, true, true),
    ...TreeFragment.addTree(yamlTree), ...TreeFragment.addTree(foreign)];
  let nativeMarkdown: ReturnType<Parser['startParse']> | undefined, nativeWrapper: ReturnType<Parser['startParse']> | undefined;
  const mdStart = parser.markdownParser.startParse.bind(parser.markdownParser), yamlStart = parser.wrapperParser.startParse.bind(parser.wrapperParser);
  const md = vi.spyOn(parser.markdownParser, 'startParse').mockImplementation((...args) => nativeMarkdown = mdStart(...args));
  const yaml = vi.spyOn(parser.wrapperParser, 'startParse').mockImplementation((...args) => nativeWrapper = yamlStart(...args));
  try {
    const a = parser.startParse(ordinary, fragments), b = parser.startParse(metadata, fragments);
    const nativeA = nativeMarkdown!, nativeB = nativeWrapper!;
    const advanceA = vi.spyOn(nativeA, 'advance'), advanceB = vi.spyOn(nativeB, 'advance');
    const passed = md.mock.calls[0][1]!;
    expect(passed).toHaveLength(1);
    expect({ from: passed[0].from, to: passed[0].to, offset: passed[0].offset,
      openStart: passed[0].openStart, openEnd: passed[0].openEnd }).toEqual({ from: 2, to: mdTree.length - 1, offset: -3, openStart: true, openEnd: true });
    let body = mdTree;
    while (!body.prop(NodeProp.mounted)) body = body.children[0] as Tree;
    expect(passed[0].tree).toBe(body.prop(NodeProp.mounted)!.tree);
    expect(yaml.mock.calls[0][1]).toEqual(TreeFragment.addTree(yamlTree));
    a.stopAt(10); b.stopAt(15);
    expect(a.stoppedAt).toBe(nativeA.stoppedAt); expect(b.stoppedAt).toBe(nativeB.stoppedAt);
    expect(() => a.stopAt(11)).toThrow(RangeError); expect(a.stoppedAt).toBe(nativeA.stoppedAt);
    let ta: Tree | null = null, tb: Tree | null = null;
    while (!ta || !tb) {
      if (!ta) ta = a.advance(); if (!tb) tb = b.advance();
      expect(a.parsedPos).toBe(nativeA.parsedPos); expect(b.parsedPos).toBe(nativeB.parsedPos);
    }
    expect(ta.type).toBe(mdTree.type); expect(tb.type).toBe(yamlTree.type);
    const nativeTree = advanceA.mock.results.at(-1)!.value as Tree;
    let mounted = ta;
    while (!mounted.prop(NodeProp.mounted)) mounted = mounted.children[0] as Tree;
    expect(mounted.prop(NodeProp.mounted)!.tree).toBe(nativeTree);
    expect(ta.length).toBe(nativeTree.length);
    expect(tb).toBe(advanceB.mock.results.at(-1)!.value);
    advanceA.mockRestore(); advanceB.mockRestore();
    parser.parse(ordinary, TreeFragment.addTree(yamlTree)); expect(md.mock.calls.at(-1)![1]).toEqual([]);
    parser.parse(metadata, TreeFragment.addTree(mdTree)); expect(yaml.mock.calls.at(-1)![1]).toEqual([]);
    for (const ranges of [[{ from: 1, to: 3 }], [{ from: 0, to: 1 }, { from: 2, to: 3 }]]) {
      parser.parse('abc', fragments, ranges); expect(yaml.mock.calls.at(-1)![2]).toEqual(ranges);
    }
  } finally { md.mockRestore(); yaml.mockRestore(); }
});

it('reuses shifted and clipped owned fragments without changing native syntax or highlighting', () => {
  const parser = mountedDocumentLanguage().language.parser;
  let source = '# Heading\n\nParagraph **words** and `code`.\n\nTail words.\n', tree = parser.parse(source);
  for (const insert of ['中', '𠀀', 'e\u0301', '\n\nNew paragraph.\n']) {
    const at = source.indexOf('words') + 2;
    const changes = [{ fromA: at, toA: at, fromB: at, toB: at + insert.length }];
    const shifted = TreeFragment.applyChanges(TreeFragment.addTree(tree), changes, 0);
    source = source.slice(0, at) + insert + source.slice(at);
    const clipped = shifted.filter(fragment => fragment.to > fragment.from + 1).map(fragment =>
      new TreeFragment(fragment.from, fragment.to - 1, fragment.tree, fragment.offset, fragment.openStart, true));
    tree = parser.parse(source, clipped);
    const oracle = documentLanguage().language.parser.parse(source);
    expect(nodes(tree)).toEqual(nodes(oracle)); expect(highlights(tree)).toEqual(highlights(oracle));
    expect(tree.length).toBe(source.length);
  }
});

it('rejects adoption because native language activity differs despite matching metadata', () => {
  for (const source of ['', '-', '--', '---', '---\n', '# Heading\n\nWords.\n', '<di',
    '```javascript\nconst x = 1;\n```\n', '---\na: x\n---\n# Body\n']) {
    const a = state(source, true), b = state(source, false);
    const differences: unknown[] = [];
    for (let pos = 0; pos <= a.doc.length; pos++) for (const side of [-1, 0, 1] as const) {
      const md = [markdownLanguage.isActiveAt(a, pos, side), markdownLanguage.isActiveAt(b, pos, side)];
      const wrapper = [a.facet(language)!.isActiveAt(a, pos, side), b.facet(language)!.isActiveAt(b, pos, side)];
      if (md[0] !== md[1] || wrapper[0] !== wrapper[1]) differences.push({ pos, side, md, wrapper });
    }
    const direct = ['#', '<', '`'].includes(source[0]);
    expect(differences, source).toEqual(direct ? [
      { pos: 0, side: -1, md: [true, false], wrapper: [false, true] },
      { pos: 0, side: 0, md: [true, false], wrapper: [false, true] },
      { pos: a.doc.length, side: 0, md: [true, false], wrapper: [false, true] },
      { pos: a.doc.length, side: 1, md: [true, false], wrapper: [false, true] },
    ] : []);
    expect(markdownLanguage.findRegions(a)).toEqual(markdownLanguage.findRegions(b));
    expect(a.facet(language)!.findRegions(a)).toEqual(b.facet(language)!.findRegions(b));
  }
});

it('retains services on a published partial Markdown prefix without settling the candidate', () => {
  const prefix = '# Heading\n\nParagraph **words**.\n\n```javascript\nconst x = 1;\n```\n\n';
  const source = prefix + 'Paragraph words.\n\n'.repeat(2000), support = selectedDocumentLanguage();
  const selector = support.language.parser as PackageParserSelector;
  const bounded = (parser: Parser) => new class extends Parser {
    createParse(...args: Parameters<Parser['createParse']>) {
      const partial = parser.startParse(...args); partial.stopAt(Math.min(args[0].length, prefix.length + 32)); return partial;
    }
  };
  support.language.parser = new PackageParserSelector(bounded(selector.markdownParser), bounded(selector.wrapperParser));
  const candidate = EditorState.create({ doc: source, extensions: [support] }), tree = syntaxTree(candidate);
  expect(tree.type).toBe(selector.roots.markdown);
  expect(tree.length).toBeGreaterThanOrEqual(prefix.length);
  expect(tree.length).toBeLessThan(candidate.doc.length);
  const original = state(source, false);
  for (let pos = 0; pos < prefix.length; pos++) {
    for (const side of [-1, 0, 1] as const)
      for (const key of ['commentTokens', 'indentOnInput', 'wordChars', 'closeBrackets', 'autocomplete'])
        expect(candidate.languageDataAt(key, pos, side)).toEqual(original.languageDataAt(key, pos, side));
    expect(getIndentation(candidate, pos)).toEqual(getIndentation(original, pos));
  }
  expect(syntaxTree(candidate)).toBe(tree);
});
