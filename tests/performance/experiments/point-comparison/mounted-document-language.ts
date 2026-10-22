// Inactive public-tree adapter. No production installation; explicit browser fixture only.
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { yamlFrontmatter } from '@codemirror/lang-yaml';
import { languages } from '@codemirror/language-data';
import { Language, LanguageSupport } from '@codemirror/language';
import { Input, MountedTree, NodeProp, Parser, PartialParse, Tree, TreeFragment } from '@lezer/common';
import { selectParser } from './document-language';

type Provenance = { route: 'markdown'; inner: Tree } | { route: 'wrapper' };
export class MountedMarkdownParser extends Parser {
  private readonly provenance = new WeakMap<Tree, Provenance>();
  private readonly shape: Tree[] = [];
  constructor(readonly markdownParser: Parser, readonly wrapperParser: Parser) {
    super();
    // Learn only stable tree types/structure from the configured package.
    // Never copy context-sensitive per-tree properties from this control.
    let node = wrapperParser.parse('x');
    for (;;) {
      if (node.length !== 1) throw Error('Unsupported package wrapper length');
      this.shape.push(node);
      if (node.type.name === 'Body') {
        const mount = node.prop(NodeProp.mounted);
        if (node.children.length || !mount || mount.overlay !== null || mount.bracketed ||
          mount.parser !== markdownParser || mount.tree.length !== 1 ||
          node.propValues.length !== 1 || node.propValues[0][1] !== mount)
          throw Error('Unsupported package Body mount');
        break;
      }
      if (node.propValues.length || node.children.length !== 1 || !(node.children[0] instanceof Tree) || node.positions[0] !== 0)
        throw Error('Unsupported package wrapper structure');
      node = node.children[0];
    }
    if (this.shape[0].type.name !== 'Document' || !this.shape[0].type.isTop)
      throw Error('Unsupported package wrapper root');
  }
  createParse(input: Input, fragments: readonly TreeFragment[], ranges: Parameters<Parser['createParse']>[2]): PartialParse {
    const route = selectParser(input, ranges), parser = route === 'markdown' ? this.markdownParser : this.wrapperParser;
    const retained: TreeFragment[] = [];
    for (const fragment of fragments) {
      const origin = this.provenance.get(fragment.tree);
      if (origin?.route !== route) continue;
      retained.push(route === 'markdown' && origin.route === 'markdown'
        ? new TreeFragment(fragment.from, fragment.to, origin.inner, fragment.offset, fragment.openStart, fragment.openEnd)
        : fragment);
    }
    const native = parser.startParse(input, retained, ranges);
    return {
      get parsedPos() { return native.parsedPos; },
      get stoppedAt() { return native.stoppedAt; },
      stopAt: position => native.stopAt(position),
      advance: () => {
        const tree = native.advance();
        if (!tree) return null;
        if (route === 'wrapper') { this.provenance.set(tree, { route }); return tree; }
        let outer = new Tree(this.shape[this.shape.length - 1].type, [], [], tree.length,
          [[NodeProp.mounted, new MountedTree(tree, null, this.markdownParser)]]);
        for (let index = this.shape.length - 2; index >= 0; index--)
          outer = new Tree(this.shape[index].type, [outer], [0], tree.length);
        this.provenance.set(outer, { route, inner: tree });
        return outer;
      },
    };
  }
}

export function mountedDocumentLanguage() {
  const content = markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: false });
  const wrapper = yamlFrontmatter({ content });
  return new LanguageSupport(new Language(wrapper.language.data,
    new MountedMarkdownParser(content.language.parser, wrapper.language.parser)), wrapper.support);
}
