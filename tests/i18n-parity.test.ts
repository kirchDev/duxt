import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Every language carries the whole vocabulary, and a region carries only its
 * deviations.
 *
 * The third test of the family `i18n-ownership` and `contrast` belong to: an
 * asset checked directly, because no gate in front of it can see the failure.
 * A key written into `en/duxt/*.json` and forgotten in the other four breaks
 * NOTHING — `fallbackLocale` renders the English word, the JSON stays valid,
 * and `lint`, `typecheck`, `build:app` and `check:a11y` all pass. The reviewer
 * cannot see it either: the diff holds the one file that changed, and the fault
 * consists precisely of the files that did not.
 *
 * What ships is a French interface with an English word in it, and the only
 * person who ever finds out is the reader.
 *
 * BOTH DIRECTIONS, because each finds a different fault. A key `en` has and
 * `fr` does not is a missing translation; a key `fr` has and `en` does not is a
 * translation of a string that no longer exists, kept alive by nobody looking.
 *
 * THE FILE LIST IS READ, NEVER LISTED — the same rule `i18n-ownership` follows,
 * so a sixteenth message file is covered the day it is written rather than the
 * day someone remembers this test.
 */

const localesDir = fileURLToPath(new URL('../i18n/locales', import.meta.url));

/** The language every other one is measured against. */
const REFERENCE = 'en';

/**
 * A directory naming a region — `pt-BR` — overrides the language before the
 * dash rather than standing on its own.
 *
 * The rule `nuxt.config.ts` already states in prose: i18n loads `pt` and then
 * `pt-BR` and deep-merges them, so Brazil ships the handful of words it spells
 * differently and inherits the rest. Which is why the two kinds of directory
 * are held to opposite standards below — equality for a language, a strict
 * subset for a region.
 */
const base = (lang: string) =>
  lang.includes('-') ? lang.split('-')[0]! : undefined;

/** Message files of one language directory, by name. */
function files(lang: string): string[] {
  return readdirSync(`${localesDir}/${lang}/duxt`)
    .filter((file) => file.endsWith('.json'))
    .sort();
}

/** One file's leaves, dotted path to value. */
function keys(lang: string, file: string): Map<string, string> {
  const json: unknown = JSON.parse(
    readFileSync(`${localesDir}/${lang}/duxt/${file}`, 'utf8')
  );
  const out = new Map<string, string>();

  const walk = (node: unknown, path: string) => {
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        walk(value, path ? `${path}.${key}` : key);
      }
      return;
    }

    out.set(path, String(node));
  };

  walk(json, '');

  return out;
}

const languages = readdirSync(localesDir).sort();
const whole = languages.filter((lang) => !base(lang) && lang !== REFERENCE);
const regions = languages.filter((lang) => base(lang));

describe('every language carries the whole vocabulary', () => {
  const reference = files(REFERENCE);

  it.each(whole)('%s ships the same message files as ' + REFERENCE, (lang) => {
    expect(files(lang)).toEqual(reference);
  });

  const pairs = whole.flatMap((lang) =>
    reference.map((file) => [lang, file] as const)
  );

  it.each(pairs)('%s/duxt/%s holds the same keys', (lang, file) => {
    const expected = [...keys(REFERENCE, file).keys()].sort();
    const actual = [...keys(lang, file).keys()].sort();

    expect(actual).toEqual(expected);
  });
});

describe('a region carries only its deviations', () => {
  const pairs = regions.flatMap((lang) =>
    files(lang).map((file) => [lang, file] as const)
  );

  it.each(pairs)('%s/duxt/%s exists in the base language', (lang, file) => {
    expect(files(base(lang)!)).toContain(file);
  });

  it.each(pairs)('%s/duxt/%s overrides nothing unknown', (lang, file) => {
    const known = keys(base(lang)!, file);
    const unknown = [...keys(lang, file).keys()].filter(
      (key) => !known.has(key)
    );

    expect(unknown).toEqual([]);
  });

  /**
   * An override repeating its base word for word overrides nothing — and it is
   * worse than nothing: reword the base and the copy silently keeps the old
   * text, which is the exact drift the merge exists to avoid.
   */
  it.each(pairs)('%s/duxt/%s repeats no word of the base', (lang, file) => {
    const known = keys(base(lang)!, file);
    const repeated = [...keys(lang, file)]
      .filter(([key, value]) => known.get(key) === value)
      .map(([key]) => key);

    expect(repeated).toEqual([]);
  });

  it.each(pairs)('%s/duxt/%s says something', (lang, file) => {
    expect(keys(lang, file).size).toBeGreaterThan(0);
  });
});
