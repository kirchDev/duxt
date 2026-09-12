import type { Nuxt } from '@nuxt/schema';
import { readContentCache } from '../content-cache';
import { duxtSearchRecords } from '../search-records';
import type { DuxtSearchRecordOptions } from '../search-records';
import type { DuxtResolvedSource } from '../sources-resolve';

/**
 * duxt's one build-time extension point, and the whole of it.
 *
 * Why there is exactly one hook rather than a registry of them, and why a
 * `duxt.plugins` API is not coming, is written where the contract is:
 * `search-records.ts`. This half only decides WHEN the payload is built and
 * makes sure it is built for nobody as rarely as possible.
 *
 * `build:done`, and the timing is the whole reason the hook can promise
 * anything:
 *
 *  - Content fills its parse cache from a `modules:done` listener, so at
 *    `build:done` every source, version, locale and generated section has been
 *    parsed — including the repositories Content downloaded into `.data/`,
 *    which nothing else on disk describes. Same seam `modules/validate.ts`
 *    reads, and for the same reason: `content:file:afterParse` fires only for
 *    files whose checksum CHANGED, so a listener built on it reports an empty
 *    site on every second build.
 *  - `@nuxt/nitro-server` runs the entire Nitro build — prerender and rollup —
 *    from a `build:done` listener it registers while bundling, which is long
 *    after every module has registered its own. Hooks run in registration
 *    order, so this one fires BEFORE Nitro produces anything, and a listener
 *    may still write a file into `public/` and have it copied into the output.
 */
const HOOK = 'duxt:search:records';

export default function duxtSearchRecordsModule(_options: unknown, nuxt: Nuxt) {
  nuxt.hook('build:done', async () => {
    if (!listening(nuxt)) return;

    // The manifest `modules/config.ts` already resolved, rather than a second
    // pass of its own: resolving it means `git ls-remote` for every source that
    // tracks a moving ref, and asking twice is both a second network round trip
    // and a second chance for the two answers to differ.
    const sources =
      (
        nuxt.options.appConfig.duxt as
          | { resolvedSources?: DuxtResolvedSource[] }
          | undefined
      )?.resolvedSources ?? [];

    if (!sources.length) return;

    const cached = readContentCache(
      nuxt,
      sources.map((source) => source.collection)
    );

    // No cache at all is not "an empty site": it is a run that parsed nothing.
    // Handing a provider zero records there would tell it to empty its index.
    if (!cached) return;

    await nuxt.callHook(
      HOOK,
      duxtSearchRecords(sources, cached, routing(nuxt))
    );
  });
}

/**
 * Is anybody listening?
 *
 * The payload is a pass over every parsed page of every language, and on a site
 * with no provider layer — which is every site until one is installed — nobody
 * ever reads it. Building it anyway would be the cost this layer charges for a
 * feature nobody turned on.
 *
 * Hookable keeps its registry private, so this reads a field it is not offered.
 * FAILING OPEN is the point of the shape: a registry that cannot be read costs
 * one wasted pass, while a wrong `false` means the hook silently never fires —
 * and a hook that never fires is a bug with no symptom, which is the failure
 * mode this layer spends most of its comments avoiding.
 */
function listening(nuxt: Nuxt): boolean {
  const registry = (
    nuxt.hooks as unknown as {
      _hooks?: Record<string, unknown[] | undefined>;
    }
  )._hooks;

  return !registry || Boolean(registry[HOOK]?.length);
}

/**
 * What the site's routing does to a path, read where it is actually true.
 *
 * `nuxt.options.i18n.locales` is the WRONG list and looks like the right one.
 * @nuxtjs/i18n collects `i18n.locales` from every layer itself and never reads
 * the merged copy, which is why `restrictLocales` in `modules/config.ts`
 * filters the per-layer configs instead — and therefore why a site that narrowed
 * itself to two languages still has seven in `nuxt.options.i18n`. Reading that
 * would index every translation the layer ships at URLs the site does not route.
 */
function routing(nuxt: Nuxt): DuxtSearchRecordOptions {
  const codeOf = (locale: unknown) =>
    typeof locale === 'string'
      ? locale
      : (locale as { code?: string } | null)?.code;

  const locales = [
    ...new Set(
      nuxt.options._layers
        .flatMap(
          (entry) =>
            (entry.config as { i18n?: { locales?: unknown[] } }).i18n
              ?.locales ?? []
        )
        .map(codeOf)
        .filter(Boolean) as string[]
    )
  ];

  const i18n = nuxt.options.i18n as
    | { defaultLocale?: string; strategy?: string }
    | undefined;

  // A consumer may have dropped i18n entirely. One language, no segment, and
  // the content is whatever language it was written in.
  const defaultLocale = i18n?.defaultLocale ?? locales[0] ?? 'en';

  return {
    locales: locales.length ? locales : [defaultLocale],
    defaultLocale,
    strategy: i18n?.strategy as DuxtSearchRecordOptions['strategy']
  };
}
