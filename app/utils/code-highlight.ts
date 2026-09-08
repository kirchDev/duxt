/**
 * Highlight code the site builds at RUNTIME, with the themes the fences use.
 *
 * Content highlights every Markdown fence at build time, and three things on
 * this site never pass through it: the package-manager block's command, which
 * is assembled from a prop; the example bodies and responses the API reference
 * derives from a schema; and the `curl`/`fetch` sample the try-it client
 * rewrites on every keystroke. All three came out as flat grey text beside
 * fences that were coloured, which reads as the highlighter being switched off.
 *
 * BUILT ON `shiki/core`, not on the bundled entry, because this one runs in the
 * BROWSER too — the sample changes as the reader types, and the server cannot
 * re-render it. The bundled entry carries every grammar Shiki ships; the core
 * takes the three this site actually generates and the JavaScript regex engine,
 * which is what keeps the WASM out of the chunk. Loaded on demand either way,
 * and cached for the life of the process.
 *
 * `defaultColor: false` emits both themes as custom properties per token,
 * matching how Content's own output is styled.
 */
type Highlighter = {
  codeToHtml: (code: string, options: object) => string;
};

/** The languages this site generates. A fourth one is a line here. */
const LANGS = ['bash', 'json', 'typescript'] as const;

export type DuxtCodeLang = (typeof LANGS)[number] | 'ts';

let highlighter: Promise<Highlighter> | undefined;

async function load(): Promise<Highlighter> {
  const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] =
    await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript')
    ]);

  return createHighlighterCore({
    themes: [
      import('shiki/themes/github-light.mjs'),
      import('shiki/themes/github-dark.mjs')
    ],
    langs: [
      import('shiki/langs/bash.mjs'),
      import('shiki/langs/json.mjs'),
      import('shiki/langs/typescript.mjs')
    ],
    engine: createJavaScriptRegexEngine()
  }) as Promise<Highlighter>;
}

/**
 * The language, when it is one this site generates and highlights.
 *
 * Undefined for everything else, which is how a block asks for plain text
 * rather than for a grammar the core highlighter was never given: an unknown
 * `lang` makes Shiki throw, and a response body labelled `xml` must not take
 * the page with it.
 */
export function duxtCodeLang(lang?: string): DuxtCodeLang | undefined {
  if (!lang) return undefined;

  const value = lang.toLowerCase();
  if (value === 'ts' || value === 'js' || value === 'javascript') {
    return 'typescript';
  }
  if (value === 'sh' || value === 'shell' || value === 'curl') return 'bash';

  return (LANGS as readonly string[]).includes(value)
    ? (value as DuxtCodeLang)
    : undefined;
}

export async function highlightCode(
  code: string,
  lang: DuxtCodeLang = 'bash'
): Promise<string> {
  // One highlighter for the process: loading the grammars per call would repeat
  // the most expensive part of this for every command on the page.
  highlighter ??= load();

  const shiki = await highlighter;

  return shiki.codeToHtml(code, {
    lang: lang === 'ts' ? 'typescript' : lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false
  });
}
