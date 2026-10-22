import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { yamlFrontmatter } from '@codemirror/lang-yaml';
import { languages } from '@codemirror/language-data';

// The upstream mixed parser owns both metadata and Markdown body boundaries.
export function documentLanguage() {
  return yamlFrontmatter({ content: markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: false }) });
}
