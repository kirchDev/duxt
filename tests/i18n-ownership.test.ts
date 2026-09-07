import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { duxtDefaults } from '../app/utils/duxt-config';

/**
 * The layer's defaults name no project, and the locale files translate nothing
 * but the interface.
 *
 * The rule this enforces is written into `app/utils/duxt-config.ts`:
 * `duxt.defaults.*` translates the interface the layer draws, never content a
 * site writes. It was broken once already, and quietly — the landing headline,
 * six feature cards, a "Resources" dropdown of duxt's own tech stack, the site
 * name and a `v0.0.0` badge all shipped as defaults, so a stranger extending
 * the layer got a site advertising somebody else's project.
 *
 * NOTHING ELSE CAN SEE IT. `pnpm build:app` and `pnpm check:a11y` both run over
 * `www/`, which overrides every leaking key — the only site in this repo that
 * renders the defaults is the one that never renders them. Same argument
 * `tests/contrast.test.ts` makes about jsdom, and the same answer: check the
 * asset itself, here rather than in a gate.
 *
 * The regex assertions below are the cheap half and catch only the loud
 * failures. `INVENTORY` is the half that enforces the rule, because ownership
 * is not a vocabulary: "The framework underneath", "Extend, don't scaffold" and
 * `'v0.0.0'` name no product and hold no URL, yet every one of them was a leak.
 */

const localesDir = fileURLToPath(new URL('../i18n/locales', import.meta.url));

/** Every `<lang>/duxt/<file>.json`, read rather than listed, so a new file is covered. */
function localeFiles(): [string, unknown][] {
  const files: [string, unknown][] = [];

  for (const lang of readdirSync(localesDir)) {
    const dir = `${localesDir}/${lang}/duxt`;

    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      files.push([
        `${lang}/duxt/${file}`,
        JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'))
      ]);
    }
  }

  return files;
}

/** Leaf string VALUES with their dotted path. Never keys — every file wraps in `duxt`. */
function strings(node: unknown, path = ''): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  if (!node || typeof node !== 'object') return [];

  return Object.entries(node as Record<string, unknown>).flatMap(
    ([key, value]) => strings(value, path ? `${path}.${key}` : key)
  );
}

const URL_LIKE = /https?:\/\/|\bwww\.|\.(?:com|dev|app|org|io|net)\b/i;
const PRODUCTS = /\b(duxt|nuxt|shadcn|tailwind|mdc|kirch)\b/i;

/**
 * Product names the interface may say, each because the layer DRAWS the thing.
 *
 * A fourth entry needs a sentence here saying which control the layer renders
 * that cannot be named any other way. If one cannot be written, the string is
 * a leak.
 */
const ALLOW = new Set([
  'Markdown', // `page.copy.view` — the format the button hands you
  'ChatGPT', // `page.copy.chatgpt` — the button's destination
  'Claude' // `page.copy.claude` — the button's destination
]);

/** An internal key resolved at render time, not a rendered string. */
const isKey = (value: string) => value.startsWith('duxt.defaults.');

const named = (value: string) =>
  PRODUCTS.test(value) && ![...ALLOW].some((word) => value.includes(word));

describe('the layer ships no site content', () => {
  const defaults = strings(duxtDefaults);

  it.each(defaults)('duxtDefaults.%s holds no URL', (_path, value) => {
    expect(URL_LIKE.test(value), `"${value}" carries a URL`).toBe(false);
  });

  it.each(defaults)('duxtDefaults.%s names no product', (_path, value) => {
    expect(isKey(value) || !named(value), `"${value}" names a product`).toBe(
      true
    );
  });

  const values = localeFiles().flatMap(([file, json]) =>
    strings(json).map(([path, value]) => [`${file} → ${path}`, value] as const)
  );

  it.each(values)('%s holds no URL', (_where, value) => {
    expect(URL_LIKE.test(value), `"${value}" carries a URL`).toBe(false);
  });

  it.each(values)('%s names no product', (_where, value) => {
    expect(named(value), `"${value}" names a product`).toBe(false);
  });
});

/**
 * Every shipped key is reachable, and every default points at one that exists.
 *
 * The BACKWARD direction runs over every key, and is the one that finds things:
 * a key nothing points at is a string five languages carry and no site can
 * reach. `duxt.nav.anchor` was exactly that — the heading anchors became their
 * own links, the `aria-label` went with them, and the translations stayed.
 *
 * The FORWARD direction is asserted only for `duxt.defaults.*`, deliberately.
 * A regex over source cannot tell an i18n key from a config path: `duxt.footer`
 * `.copyright` is a field and `duxt.footer.poweredBy` is a key, and they are the
 * same shape. Under `duxt.defaults.*` there is no ambiguity — those literals are
 * VALUES in `duxtDefaults`, so every one of them is a key by construction.
 * Missing keys elsewhere are vue-i18n's job, which prints them at runtime.
 *
 * The source of truth is the SOURCE, read here rather than restated.
 */
const sources = ['app', 'server', 'modules'].flatMap((dir) =>
  walk(fileURLToPath(new URL(`../${dir}`, import.meta.url)))
);

/**
 * `server/devtools/preview.ts` is excluded: it is a FIXTURE, and the keys in it
 * belong to a site that does not exist — `duxt.page.translate`, `duxt.nav.close`
 * and `duxt.page.updated` are invented so the i18n panel has a consumer's
 * translations to show beside the layer's.
 */
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walk(full);
    if (entry.name === 'preview.ts') return [];

    return /\.(vue|ts)$/.test(entry.name) ? [readFileSync(full, 'utf8')] : [];
  });
}

/**
 * Keys built at runtime, which no literal search can see.
 *
 * Each is a template whose tail is a value — `duxt.version.${kind}` in
 * `DuxtVersionBanner.vue`, the two `status`/`titles` maps beside it. Listed as
 * prefixes and nowhere else: a fourth entry means somebody added a computed key,
 * and it should cost a line here saying so.
 */
const COMPUTED = [
  'duxt.version.',
  'duxt.version.status.',
  'duxt.version.titles.'
];

describe('every key is reachable', () => {
  const used = new Set([
    ...sources.flatMap((file) => file.match(/duxt\.[a-zA-Z][a-zA-Z.]*/g) ?? []),
    ...strings(duxtDefaults)
      .map(([, value]) => value)
      .filter(isKey)
  ]);

  const shipped = localeFiles()
    .filter(([file]) => file.startsWith('en/'))
    .flatMap(([, json]) => strings(json).map(([path]) => path));

  it('ships nothing nothing points at', () => {
    expect(
      shipped.filter(
        (key) => !used.has(key) && !COMPUTED.some((p) => key.startsWith(p))
      )
    ).toEqual([]);
  });

  it('defaults point at nothing the English locale lacks', () => {
    const named = [
      ...strings(duxtDefaults)
        .map(([, value]) => value)
        .filter(isKey),
      // `index.vue` calls these three through `$t()` with no config field behind
      // them, so they are named rather than derived.
      'duxt.defaults.landing.preview',
      'duxt.defaults.landing.previewOpen',
      'duxt.defaults.landing.featuresTitle'
    ];

    expect(named.filter((key) => !shipped.includes(key))).toEqual([]);
  });
});

/**
 * The inventory — the only assertion that enforces OWNERSHIP rather than
 * vocabulary, and the only one that would have caught `version: 'v0.0.0'`.
 *
 * Adding a key costs an edit here plus a sentence saying why the LAYER draws
 * that string. That cost is the mechanism: it is what makes somebody stop and
 * ask whether the string belongs to the layer or to the site.
 *
 * This is not a shrinking set — `title` was ADDED by the migration that emptied
 * the rest, because a name the layer cannot know still has to render as a word.
 */
const INVENTORY = [
  'title', // A neutral stand-in; an unset title prints `undefined` in six places
  'navigation.docs', // The one navbar entry that names the interface, not a tree
  'landing.actions.docs', // "Read the docs" is true of every site on this layer
  'landing.preview', // The embedded window's accessible name
  'landing.previewOpen', // The button on it
  'landing.featuresTitle', // The heading over a grid the SITE fills
  'aside.title' // "Community" heads a block that draws nothing until filled
];

describe('the layer draws exactly this much text', () => {
  it('ships the agreed defaults and nothing more', () => {
    const [, en] =
      localeFiles().find(([file]) => file === 'en/duxt/defaults.json') ?? [];

    const shipped = strings(en)
      .map(([path]) => path.replace(/^duxt\.defaults\./, ''))
      .sort();

    expect(shipped).toEqual([...INVENTORY].sort());
  });

  it('defaults no config field the inventory does not cover', () => {
    expect(Object.keys(duxtDefaults).sort()).toEqual(
      [
        'aside',
        'breadcrumb',
        'landing',
        'links',
        'navigation',
        'packageManagers',
        'sections',
        'title'
      ].sort()
    );
  });
});
