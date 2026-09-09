import { grammars as generated } from '#build/duxt-grammars.mjs';

/**
 * The generated map, annotated here rather than trusted from the declaration.
 *
 * `writeGrammars` writes both the module and its `.d.ts`, and the file cannot
 * import Shiki's own types to describe itself with — so the shape is stated at
 * the one place that uses it.
 */
const grammars = generated as Record<string, () => Promise<unknown>>;

/**
 * Highlight code the site builds at RUNTIME, with the themes the fences use.
 *
 * Content highlights every Markdown fence at build time, and three things on
 * this site never pass through it: the package-manager block's command, which
 * is assembled from a prop; the example bodies and responses the API reference
 * derives from a schema; and the request samples the try-it client rewrites on
 * every keystroke. All of them came out as flat grey text beside fences that
 * were coloured, which reads as the highlighter being switched off.
 *
 * BUILT ON `shiki/core`, not on the bundled entry, because this one runs in the
 * BROWSER too — the sample changes as the reader types, and the server cannot
 * re-render it. The bundled entry carries every grammar Shiki ships; the core
 * takes only what this site actually generates, plus the JavaScript regex
 * engine, which is what keeps the WASM out of the chunk. Loaded on demand either
 * way, and cached for the life of the process.
 *
 * THE GRAMMAR SET IS GENERATED, from the samples a site configured — see
 * `writeGrammars` in `modules/config.ts`. It used to be three names hard-coded
 * here, which was right while the samples were `curl` and `fetch` and wrong the
 * moment `duxt.requestSamples` became a list a consumer writes: a Python sample
 * needs a Python grammar, and nobody wants to ship one to a site that has no
 * Python sample. Every language in the map is bytes a reader downloads, which is
 * exactly why the map is not simply all of Shiki.
 *
 * `defaultColor: false` emits both themes as custom properties per token,
 * matching how Content's own output is styled.
 */
type Highlighter = {
  codeToHtml: (code: string, options: object) => string;
};

/**
 * Spellings that are not grammar names.
 *
 * Shiki resolves its own aliases once a grammar is loaded, but the map above is
 * keyed by the names the samples declare — so a `ts` fence has to be pointed at
 * `typescript` before the lookup, not after it.
 */
const aliases: Record<string, string> = {
  curl: 'bash',
  js: 'typescript',
  javascript: 'typescript',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript'
};

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
    // Cast because the generated module is written by `writeGrammars` and
    // cannot import Shiki's `LanguageRegistration` to type itself with — the
    // values ARE those modules, which is what the loaders resolve to.
    langs: Object.values(grammars).map((grammar) => grammar()) as Parameters<
      typeof createHighlighterCore
    >[0]['langs'],
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
export function duxtCodeLang(lang?: string): string | undefined {
  if (!lang) return undefined;

  const value = lang.toLowerCase();
  const resolved = aliases[value] ?? value;

  return resolved in grammars ? resolved : undefined;
}

export async function highlightCode(
  code: string,
  lang = 'bash'
): Promise<string> {
  // One highlighter for the process: loading the grammars per call would repeat
  // the most expensive part of this for every command on the page.
  highlighter ??= load();

  const shiki = await highlighter;

  return shiki.codeToHtml(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false
  });
}
