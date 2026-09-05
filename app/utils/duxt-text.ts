/**
 * A configured string that may also be a translation.
 *
 * Three shapes, because they serve three different consumers and none of them
 * is served well by the other two:
 *
 *  - a LITERAL — `'Guide'` — for the single-language site, which is most of
 *    them, and which must not have to learn i18n to name a navbar entry;
 *  - a KEY — `'nav.guide'` — for the site that already has locale files and
 *    wants its documentation chrome to live in them;
 *  - a RECORD — `{ 'en-GB': 'Guide', 'de-DE': 'Anleitung' }` — for the site
 *    with two languages and eight labels, where creating and registering a
 *    locale file per language costs more than it saves.
 *
 * A literal and a key are the same TYPE, and the difference between them is
 * decided by whether the key is registered, never by a heuristic on the text.
 */

/** How a string is looked up. Returns undefined when nothing is registered. */
export type DuxtTextLookup = (key: string) => string | undefined;

/**
 * Config keys whose values are prose.
 *
 * An allowlist rather than a walk over every string: `to`, `icon`, `variant`,
 * `prefix` and `collection` are also strings, and running a URL through a
 * translation lookup is how a link silently becomes something else.
 */
const TEXT_KEYS = new Set([
  'badge',
  'copyright',
  'description',
  'headline',
  'label',
  'title'
]);

/** One value: key if one is registered, own language, base language, or as written. */
export function resolveDuxtText(
  value: unknown,
  locale: string,
  lookup: DuxtTextLookup
): unknown {
  if (typeof value === 'string') return lookup(value) ?? value;

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, string>;
    if (Object.values(record).some((entry) => typeof entry !== 'string')) {
      return value;
    }

    // `pt-BR` falls back to any `pt-*` the record does carry, mirroring what
    // the locale FILES already do — a record written for `pt-PT` should not
    // leave a Brazilian reader with English.
    const base = locale.split('-')[0];
    const sameLanguage = Object.entries(record).find(
      ([code]) => code.split('-')[0] === base
    );

    return record[locale] ?? sameLanguage?.[1] ?? Object.values(record)[0];
  }

  return value;
}

/** The same, over a whole config tree: only the keys above are touched. */
export function resolveDuxtTexts<T>(
  node: T,
  locale: string,
  lookup: DuxtTextLookup
): T {
  if (Array.isArray(node)) {
    return node.map((entry) =>
      resolveDuxtTexts(entry, locale, lookup)
    ) as unknown as T;
  }

  if (!node || typeof node !== 'object') return node;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    result[key] = TEXT_KEYS.has(key)
      ? resolveDuxtText(value, locale, lookup)
      : resolveDuxtTexts(value, locale, lookup);
  }

  return result as T;
}

/**
 * A text field where a plain string is required — an aria-label, a title
 * attribute, a list key.
 *
 * The config type keeps `DuxtText` because that is what a consumer may WRITE;
 * by the time a component reads the value, `useDuxtConfig` has resolved it.
 * This states that narrowing without asserting it: an unresolved record yields
 * undefined rather than `[object Object]` in the DOM.
 */
export const asText = (value: DuxtText | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;
