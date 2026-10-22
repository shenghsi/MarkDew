// Rejected inactive package parser selection. Native language activity differs
// at document boundaries. Do not install this in production or browser trials.
// Production uses the YAML wrapper throughout.
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { yamlFrontmatter } from '@codemirror/lang-yaml';
import { languages } from '@codemirror/language-data';
import { Language, LanguageSupport, language, syntaxTree, indentNodeProp } from '@codemirror/language';
import { MarkdownParser } from '@lezer/markdown';
import { EditorState, Extension } from '@codemirror/state';
import { Input, Parser, TreeFragment } from '@lezer/common';

type Ranges = Parameters<Parser['createParse']>[2];
export function selectParser(input: Input, ranges: Ranges): 'wrapper' | 'markdown' {
  if (ranges.length !== 1 || ranges[0].from !== 0 || ranges[0].to !== input.length) return 'wrapper';
  const first = input.read(0, Math.min(1, input.length));
  // Ambiguous prefixes stay with the package. This is no front-matter grammar.
  return !first || /[\s\uFEFF-]/.test(first) ? 'wrapper' : 'markdown';
}

export class PackageParserSelector extends Parser {
  readonly roots;
  constructor(readonly markdownParser: Parser, readonly wrapperParser: Parser) {
    super();
    this.roots = { markdown: markdownParser.parse('').type, wrapper: wrapperParser.parse('').type };
    if (this.roots.markdown === this.roots.wrapper) throw Error('Package parser root identities are not distinct');
  }
  createParse(input: Input, fragments: readonly TreeFragment[], ranges: Ranges) {
    const selected = selectParser(input, ranges), parser = selected === 'wrapper' ? this.wrapperParser : this.markdownParser;
    // Each fragment carries its own root identity. Concurrent states share no
    // mutable parser-choice record. Return the native PartialParse unchanged.
    return parser.startParse(input, fragments.filter(fragment => fragment.tree.type === this.roots[selected]), ranges);
  }
}

class BoundaryLanguage extends Language {
  declare readonly extension: Extension;
  constructor(data: Language['data'], parser: PackageParserSelector) {
    super(data, parser, [], 'package-markdown-selection');
    // Obtain the native provider through its public facet. Keep its nested
    // metadata and sublanguage behavior; do not copy that package algorithm.
    const providers = EditorState.create({ extensions: this.extension }).facet(EditorState.languageData);
    if (providers.length !== 1) throw Error('Native language metadata provider is ambiguous');
    const native = providers[0];
    this.extension = [language.of(this), EditorState.languageData.of((state, pos, side) => {
      if (syntaxTree(state).type === parser.roots.markdown &&
        ((pos === 0 && side <= 0) || (pos === state.doc.length && side >= 0))) return state.facet(data);
      return native(state, pos, side);
    })];
  }
}

export function selectedDocumentLanguage() {
  const content = markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: false });
  const wrapper = yamlFrontmatter({ content });
  // The wrapper's outer root supplies zero indentation where the Markdown
  // root returns null. Keep that tested service behavior on the direct route.
  const direct = (content.language.parser as MarkdownParser).configure({ props: [indentNodeProp.add({
    Document: context => context.pos === 0 || context.pos === context.state.doc.length ? 0 : null,
  })] });
  return new LanguageSupport(new BoundaryLanguage(wrapper.language.data,
    new PackageParserSelector(direct, wrapper.language.parser)), wrapper.support);
}
