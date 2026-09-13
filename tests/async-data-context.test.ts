import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * NO COMPOSABLE BELOW THE FIRST AWAIT OF AN ASYNC-DATA HANDLER.
 *
 * Nuxt hands a `useAsyncData` handler the instance synchronously and loses it
 * at the first `await`: nothing restores it there, because the handler is not a
 * `<script setup>` block the compiler rewrites. A `use…()` call below that line
 * throws NUXT_E1001, the handler settles as an error, and `data` stays `null` —
 * no crash, no failed build, just a component that draws nothing.
 *
 * That is exactly how the sidebar vanished from every page: the navigation
 * handler called `useDuxtConfig()` after `queryCollectionNavigation`, the tree
 * became a NuxtError in the payload, and the docs layout's `items.length > 1`
 * quietly went false. `pnpm check` builds the site and passes, because a
 * missing sidebar fails nothing. So the rule is held here, over the source.
 *
 * The scan is textual, not a parse: it finds the handler (inline, or a `const`
 * it names), strips comments, and looks for a `use[A-Z]…(` call after the first
 * `await`. That is enough for the shapes this layer writes, and a handler too
 * clever for it is a handler worth simplifying.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|vue)$/.test(name) ? [path] : [];
  });
}

/** Comments out, so a composable NAMED in prose is not a composable called. */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

/** The text from `open` to its matching bracket, brackets included. */
function balanced(source: string, open: number): string {
  const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
  const stack: string[] = [];

  for (let i = open; i < source.length; i++) {
    const char = source[i]!;
    if (pairs[char]) stack.push(pairs[char]);
    else if (char === stack.at(-1)) {
      stack.pop();
      if (stack.length === 0) return source.slice(open, i + 1);
    }
  }

  return source.slice(open);
}

/** The top-level arguments of a call, split on commas at depth zero. */
function args(call: string): string[] {
  const inner = call.slice(1, -1);
  const out: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < inner.length; i++) {
    const char = inner[i]!;
    if ('({['.includes(char)) depth++;
    else if (')}]'.includes(char)) depth--;
    else if (char === ',' && depth === 0) {
      out.push(inner.slice(start, i));
      start = i + 1;
    }
  }

  out.push(inner.slice(start));
  return out.map((part) => part.trim());
}

/**
 * Every composable a handler calls after its first `await`.
 *
 * `source` is a whole file; each `useAsyncData`/`useLazyAsyncData` call in it
 * is inspected. A handler passed by name is looked up as a `const` in the same
 * file.
 */
export function composablesAfterAwait(source: string): string[] {
  const code = stripComments(source);
  const found: string[] = [];

  for (const match of code.matchAll(
    /\buse(?:Lazy)?AsyncData\s*(?:<[^(]*>)?\(/g
  )) {
    const call = balanced(code, match.index! + match[0].length - 1);
    const [, handler] = args(call);
    if (!handler) continue;

    let body = handler;
    if (/^[A-Za-z_$][\w$]*$/.test(handler)) {
      const definition = code.search(
        new RegExp(`\\bconst\\s+${handler}\\b[^=]*=`)
      );
      if (definition === -1) continue;
      const brace = code.indexOf('{', definition);
      body = balanced(code, brace);
    }

    const awaited = body.search(/\bawait\b/);
    if (awaited === -1) continue;

    for (const use of body.slice(awaited).matchAll(/\b(use[A-Z]\w*)\s*\(/g)) {
      found.push(use[1]!);
    }
  }

  return found;
}

describe('composablesAfterAwait', () => {
  it('finds a composable called below the first await of an inline handler', () => {
    const source = `
      const { data } = await useAsyncData('key', async () => {
        const tree = await queryCollectionNavigation('docs');
        return useDuxtConfig().resolvedSources ?? tree;
      });
    `;
    expect(composablesAfterAwait(source)).toEqual(['useDuxtConfig']);
  });

  it('follows a handler passed by name', () => {
    const source = `
      const handler = async (): Promise<Item[]> => {
        const { base } = useNavigationSource().value;
        const tree = await queryCollectionNavigation(base);
        const config = useAppConfig();
        return tree;
      };
      export function useNav() {
        return useAsyncData<Item[]>(() => 'key', handler, { watch: [a] });
      }
    `;
    expect(composablesAfterAwait(source)).toEqual(['useAppConfig']);
  });

  it('allows every composable read before the await', () => {
    const source = `
      const handler = async () => {
        const { base } = useNavigationSource().value;
        return await queryCollection(base).all();
      };
      useAsyncData('key', handler);
    `;
    expect(composablesAfterAwait(source)).toEqual([]);
  });

  it('ignores a composable that is only named in a comment', () => {
    const source = `
      useAsyncData('key', async () => {
        const rows = await queryCollection('docs').all();
        // useDuxtConfig() used to be called here.
        /* and useAppConfig() here */
        return rows;
      });
    `;
    expect(composablesAfterAwait(source)).toEqual([]);
  });
});

describe('async-data handlers in the layer', () => {
  const sources = files(join(root, 'app'));

  it('scans at least the navigation handler', () => {
    // A scan that matches nothing passes everything.
    const navigation = readFileSync(
      join(root, 'app/composables/useDuxtNavigation.ts'),
      'utf8'
    );
    expect(navigation).toMatch(/useAsyncData/);
    expect(composablesAfterAwait(navigation)).toEqual([]);
  });

  it.each(sources.map((path) => [relative(root, path), path]))(
    '%s calls no composable after an await inside a handler',
    (_name, path) => {
      expect(composablesAfterAwait(readFileSync(path, 'utf8'))).toEqual([]);
    }
  );
});
