import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  duxtShortcuts,
  shortcutKeys
} from '../app/composables/useDuxtShortcuts';

/**
 * What the reader is told about the keys, measured against the keys.
 *
 * `shortcuts.test.ts` proves the bindings behave; this proves the SURFACE
 * around them is honest — the one definition is the only thing listening, every
 * action has a word in every language, and the documentation names the same
 * keys the layer binds. Three faults that break nothing and that no gate in
 * front of them can see, which is the family `contrast`, `i18n-parity` and
 * `i18n-ownership` belong to.
 *
 * The failure this exists for is a shortcut that WORKS and that nobody can
 * find, or a page that promises one the layer stopped binding. Both ship green.
 */

const root = fileURLToPath(new URL('..', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walk(full);

    return /\.(vue|ts)$/.test(entry.name) ? [full] : [];
  });
}

/**
 * One definition, or none at all.
 *
 * A global `keydown` anywhere else is a key the sheet cannot list, the
 * documentation cannot describe and the policy cannot switch off — invisible
 * precisely because it works. shadcn's own `SidebarProvider` shipped one
 * (`⌘/Ctrl+B`, toggling a sidebar this layer never mounts), which is how the
 * rule got written down.
 *
 * Not a lint rule, because the thing being forbidden is legal everywhere else:
 * a LOCAL handler on an element is how a component owns its own keys, and only
 * a listener on `window` or `document` reaches a reader who never opted in.
 */
const GLOBAL_KEYDOWN =
  /(?:window|document|globalThis)\.addEventListener\(\s*['"]keydown|useEventListener\(\s*['"]keydown/;

describe('the layer binds no key its one definition does not know', () => {
  const definition = `${root}app/composables/useDuxtShortcuts.ts`;

  const offenders = ['app', 'server', 'modules']
    .flatMap((dir) => walk(`${root}${dir}`))
    .filter((file) => file !== definition)
    .filter((file) => GLOBAL_KEYDOWN.test(readFileSync(file, 'utf8')))
    .map((file) => file.slice(root.length));

  it('registers every global keydown through useDuxtShortcuts', () => {
    expect(offenders).toEqual([]);
  });
});

describe('every shortcut has a word in every language', () => {
  const localesDir = `${root}i18n/locales`;

  /** One file's leaves, dotted path to value. */
  function keys(lang: string, file: string): Set<string> {
    const json: unknown = JSON.parse(
      readFileSync(`${localesDir}/${lang}/duxt/${file}`, 'utf8')
    );
    const out = new Set<string>();

    const collect = (node: unknown, path: string) => {
      if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) {
          collect(value, path ? `${path}.${key}` : key);
        }
        return;
      }

      out.add(path);
    };

    collect(json, '');

    return out;
  }

  const languages = readdirSync(localesDir)
    .filter((lang) => !lang.includes('-'))
    .sort();

  const pairs = languages.flatMap((lang) =>
    duxtShortcuts.map((shortcut) => [lang, shortcut.label] as const)
  );

  it.each(pairs)('%s says what %s means', (lang, label) => {
    expect([...keys(lang, 'shortcuts.json')]).toContain(label);
  });
});

/**
 * The documentation names the keys the layer binds — in every language it is
 * served in.
 *
 * The page is a table of `<kbd>` cells, one row per binding, and the check is
 * over the SET of glyphs rather than their order: a binding added with no row,
 * a row left behind by a binding that went away, and a translation that quietly
 * kept the old key all read as the same failure, which is the right answer for
 * all three.
 *
 * Both modifier spellings are expected, because the page is a file and a file
 * has no keyboard to ask — it has to show `⌘` and `Ctrl` where the interface
 * picks one.
 */
describe('the documentation names the keys the layer binds', () => {
  const docsDir = `${root}docs`;
  const page = '2.concepts/12.keyboard-shortcuts.md';

  const locales = [
    '',
    ...readdirSync(docsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^[a-z]{2}$/.test(entry.name))
      .map((entry) => entry.name)
      .sort()
  ];

  /** The first table in the page, as rows of cells. */
  function table(markdown: string): string[][] {
    const rows = markdown
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('|'));

    return rows
      .filter((line) => !/^\|[\s:|-]+\|$/.test(line))
      .slice(1)
      .map((line) =>
        line
          .slice(1, -1)
          .split('|')
          .map((cell) => cell.trim())
      );
  }

  const expected = new Set(
    duxtShortcuts.flatMap((shortcut) => [
      ...shortcutKeys(shortcut, 'mac'),
      ...shortcutKeys(shortcut, 'other')
    ])
  );

  it.each(locales)('%s documents one row per binding', (locale) => {
    const rows = table(
      readFileSync(`${docsDir}/${locale ? `${locale}/` : ''}${page}`, 'utf8')
    );

    expect(rows).toHaveLength(duxtShortcuts.length);
  });

  it.each(locales)('%s names every key and no other', (locale) => {
    const markdown = readFileSync(
      `${docsDir}/${locale ? `${locale}/` : ''}${page}`,
      'utf8'
    );

    const drawn = new Set(
      [...markdown.matchAll(/<kbd>([^<]+)<\/kbd>/g)].map((match) => match[1]!)
    );

    expect([...drawn].sort()).toEqual([...expected].sort());
  });
});
