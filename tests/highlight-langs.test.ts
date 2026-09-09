import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { highlightLangs } from '../highlight-langs';

/**
 * Every language name the layer configures resolves to a grammar Content can
 * actually load.
 *
 * THE COUPLING THIS HOLDS. The names come from the layer's own `shiki`; the
 * grammars come from the `@shikijs/langs` that `@nuxt/content` resolves. Today
 * pnpm dedupes both to one 4.4.3, but they are two dependency edges, and the day
 * one moves ahead of the other an id exists on our side with no file on theirs.
 * Content imports the file eagerly for every configured language, so that day
 * ends in a build that throws — not a page that degrades. A test is cheap next
 * to that.
 *
 * RESOLVED FROM CONTENT'S OWN ENTRY, not from this repo's root. `@shikijs/langs`
 * is not a direct dependency here, and with pnpm's isolated node-linker asking
 * from the wrong place answers about the wrong copy. Content does
 * `import(`@shikijs/langs/${lang}`)` from inside its own module, so that is
 * where the question has to be asked from.
 */
const fromContent = createRequire(
  createRequire(import.meta.url).resolve('@nuxt/content')
);

describe('highlightLangs', () => {
  it('resolves every configured name to a grammar', () => {
    const missing = highlightLangs.filter((lang) => {
      try {
        fromContent.resolve(`@shikijs/langs/${lang}`);
        return false;
      } catch {
        return true;
      }
    });

    expect(missing).toEqual([]);
  });

  /**
   * The aliases are the whole point of listing them, so they are asserted by
   * name.
   *
   * `@nuxtjs/mdc` looks a fence's language up as an EXACT KEY in the record
   * built from this list, and only learns a grammar's own aliases once it has
   * been loaded. With ids alone, ```javascript``` coloured or did not depending
   * on whether a ```js``` fence came first in the same build — order-dependent,
   * and silent, because the warning behind it is `process.dev` only. A future
   * simplification down to `.map(l => l.id)` would restore exactly that fault
   * while every other test still passed.
   */
  it('carries the aliases, not only the canonical ids', () => {
    for (const alias of [
      'javascript',
      'js',
      'typescript',
      'ts',
      'markdown',
      'md',
      'yaml',
      'yml',
      'shell',
      'shellscript',
      'console',
      'zsh',
      'python',
      'py',
      'docker',
      'dockerfile'
    ]) {
      expect(highlightLangs, alias).toContain(alias);
    }
  });

  /**
   * The languages the layer's own documentation writes, and the ones the list
   * used to be hand-written from. A regression guard on the narrowing this
   * commit undid — 17 effective languages, shaped around Nuxt and PHP.
   */
  it('still covers what the hand-written list covered', () => {
    for (const lang of [
      'bash',
      'css',
      'diff',
      'html',
      'json',
      'jsonc',
      'mdc',
      'php',
      'sh',
      'scss',
      'vue'
    ]) {
      expect(highlightLangs, lang).toContain(lang);
    }
  });

  /** No duplicate work: Content de-duplicates, but a name twice is a mistake. */
  it('lists every name once', () => {
    expect(highlightLangs).toHaveLength(new Set(highlightLangs).size);
  });

  /**
   * The four aliases that are not subpaths stay out.
   *
   * Asserted by name rather than left to the resolution test above, because this
   * is the one exclusion a reader will be tempted to undo: the grammars behind
   * them exist under `cpp`, `csharp`, `fsharp` and `wenyan`, so the names look
   * like an oversight instead of a limit of the package's `exports`.
   */
  it('leaves out the names that cannot be a package subpath', () => {
    for (const alias of ['c++', 'c#', 'f#', '文言']) {
      expect(highlightLangs, alias).not.toContain(alias);
    }

    for (const id of ['cpp', 'csharp', 'fsharp', 'wenyan']) {
      expect(highlightLangs, id).toContain(id);
    }
  });
});
