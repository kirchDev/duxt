/**
 * EVERY language Shiki ships, aliases included — the list Content highlights
 * fences with.
 *
 * Split from `nuxt.config.ts` for the reason `sources-resolve.ts` is split from
 * `sources.ts`: the config half imports `nuxt/config` and a Vite plugin, and a
 * test cannot load either. This half is data, so `tests/highlight-langs.test.ts`
 * can check the same array the build uses rather than a copy of it.
 *
 * A documentation layer does not know what its consumers document, and the
 * choice is not symmetric: `langs` is merged with defu across layers, so a
 * consumer can only ADD to this list, never remove from it. Too short a list
 * costs somebody a config change they will not discover; too long a list costs
 * them 0.3 s of build time.
 *
 * NOTHING REACHES A BROWSER. Content highlights fences at build time inside
 * rehype, so a grammar is a build-time cost and never a client byte — measured
 * at 358 ms and 39 MB of heap for the whole set, once per build, because
 * Content caches the highlighter on a hash of these options. That is why the
 * "load it on demand" rule that governs `mermaid` and CodeMirror does not apply
 * here, and why `app/utils/code-highlight.ts` — which DOES run in the browser —
 * still carries a hand-picked handful.
 *
 * THE ALIASES ARE LISTED BECAUSE THE LOOKUP IS AN EXACT KEY ACCESS.
 * `@nuxtjs/mdc` resolves a fence's language against the record built from this
 * very list, and learns a grammar's own aliases only after loading it. So
 * ```javascript``` used to colour only when a ```js``` fence happened to come
 * first in the same build — a fault that moved with file order, and fell back to
 * plain text silently, because the warning behind it is `process.dev` only.
 *
 * Read from `shiki` rather than typed out: a hand-written list goes stale at the
 * next release. What that buys instead is a coupling — the ids come from the
 * layer's `shiki`, the grammars from the `@shikijs/langs` that Content
 * resolves — and `tests/highlight-langs.test.ts` is what holds it, because an id
 * missing over there throws during the build rather than degrading.
 */
// Metadata and a lazy import map, not the grammars themselves: importing this
// costs 3 KB gzip and loads nothing.
import { type BundledLanguage, bundledLanguagesInfo } from 'shiki/langs';

/**
 * A name Content can turn into a package subpath.
 *
 * Content resolves each configured language as `@shikijs/langs/<name>`, and four
 * of Shiki's aliases cannot be a file there: `c++`, `c#`, `f#` and `文言`. They
 * are not missing grammars — `cpp`, `csharp`, `fsharp` and `wenyan` all exist —
 * only names no `exports` pattern can serve. Passing one through anyway is not a
 * fence that degrades but a BUILD THAT THROWS, because Content imports every
 * configured language eagerly when it creates the highlighter.
 *
 * A ```c++``` fence therefore colours only once `cpp` has loaded in the same
 * build, which is the order-dependence the alias list exists to remove. It
 * cannot be closed from here: Content keys its record by the string it was
 * given, and these four strings have no module to give it.
 */
const subpathSafe = /^[a-z0-9][a-z0-9._-]*$/;

/**
 * Cast because `bundledLanguagesInfo` types `id` and `aliases` as plain strings
 * while Content's `langs` takes the `BundledLanguage` union — which is built from
 * these very names, ids and aliases alike. So it narrows a string back to the
 * union it came from rather than asserting anything new, and the test beside this
 * file checks the values instead of trusting the cast.
 */
export const highlightLangs = [
  ...bundledLanguagesInfo.map((language) => language.id),
  ...bundledLanguagesInfo.flatMap((language) => language.aliases ?? [])
].filter((name) => subpathSafe.test(name)) as BundledLanguage[];
