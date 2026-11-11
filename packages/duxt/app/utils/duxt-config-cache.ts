/**
 * The resolved config, computed once per reader position rather than once per
 * component.
 *
 * `useDuxtConfig()` used to be a computed of its own in every component that
 * called it — 34 of them on a docs page — and each one merged the whole config,
 * appended the generated sections and walked every text field again on every
 * navigation. On duxt.app that tree carries 110 resolved sources, and the work
 * came to roughly 40% of a client navigation and of every prerendered page.
 *
 * Three things make it cheap, and none of them changes an answer:
 *
 *  - the manifest is resolved for a locale ONCE. Sources do not depend on the
 *    page being read, only their display texts depend on the language;
 *  - the rest is resolved once per (locale, path) and shared by every caller;
 *  - a top-level key whose resolved value did not change between two paths
 *    keeps the SAME object, so a component reading only `sections` is not
 *    re-rendered because `footer` was rebuilt next to it.
 *
 * Pure, and outside the composable, so the equivalence with the old one-shot
 * resolution is a unit test rather than a claim.
 */
import { resolveDuxtTexts, type DuxtTextLookup } from './duxt-text';
import { withGeneratedSections } from './generated-sections';

type Plain = Record<string, unknown>;

/** How many positions are kept; a reader goes back and forth between a few. */
const LIMIT = 32;

export interface DuxtConfigCache {
  /** The config as one component sees it, for one path in one locale. */
  resolve(
    merged: DuxtConfig,
    path: string,
    locale: string,
    lookup: DuxtTextLookup,
    catalogue?: unknown
  ): DuxtConfigResolved;
}

export function createDuxtConfigCache(): DuxtConfigCache {
  // Everything below is valid for ONE merged config. A new one — a hot reload
  // of app.config in development — starts over.
  // The locale's message catalogue is part of the answer too: i18n loads a
  // language's messages lazily, and a result resolved before they arrived
  // holds raw keys. A new catalogue object therefore starts over as well.
  let owner: DuxtConfig | undefined;
  const catalogues = new Map<string, unknown>();
  const sources = new Map<string, unknown>();
  const results = new Map<string, DuxtConfigResolved>();
  const stable = new Map<
    string,
    Map<string, { json: string; value: unknown }>
  >();

  return {
    resolve(merged, path, locale, lookup, catalogue) {
      if (
        owner !== merged ||
        (catalogues.has(locale) && catalogues.get(locale) !== catalogue)
      ) {
        owner = merged;
        catalogues.clear();
        sources.clear();
        results.clear();
        stable.clear();
      }

      catalogues.set(locale, catalogue);
      const id = `${locale}\u0000${path}`;
      const hit = results.get(id);
      if (hit) {
        // Refresh its place, so the positions in use are the ones kept.
        results.delete(id);
        results.set(id, hit);
        return hit;
      }

      if (!sources.has(locale)) {
        sources.set(
          locale,
          resolveDuxtTexts(merged.resolvedSources ?? [], locale, lookup)
        );
      }

      // The generated entries are appended from the RAW manifest, exactly as
      // before, and resolved with the rest of the tree — only the manifest
      // itself is left out of the walk, because it was resolved above.
      const { resolvedSources: _resolvedSources, ...rest } =
        withGeneratedSections(merged, path) as unknown as Plain;
      const texts = resolveDuxtTexts(rest, locale, lookup) as Plain;

      let previous = stable.get(locale);
      if (!previous) stable.set(locale, (previous = new Map()));
      for (const [key, value] of Object.entries(texts)) {
        const json = JSON.stringify(value) ?? 'undefined';
        const known = previous.get(key);
        if (known && known.json === json) texts[key] = known.value;
        else previous.set(key, { json, value });
      }

      const result = {
        ...texts,
        ...('resolvedSources' in merged
          ? { resolvedSources: sources.get(locale) }
          : {})
      } as DuxtConfigResolved;

      results.set(id, result);
      if (results.size > LIMIT) {
        results.delete(results.keys().next().value!);
      }

      return result;
    }
  };
}
