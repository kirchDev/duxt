import type { Nuxt } from '@nuxt/schema';
import type { DuxtSearchRecord } from '@kirchdev/duxt/search-records';

/**
 * The first consumer of `duxt:search:records`, and the reason it is here.
 *
 * A hook nobody listens to is a hook nobody runs: the layer skips building the
 * payload entirely while its registry is empty, so without a listener in this
 * site not one line of `modules/search-records.ts` would execute in `pnpm
 * check` — the extension surface would ship having never been exercised against
 * real content. This site is the layer's own consumer and its development
 * target, so the listener belongs here rather than in the layer.
 *
 * It DELIBERATELY BUILDS NO INDEX. Pagefind, Typesense and Meilisearch are each
 * a provider layer of their own; what this proves is the seam — that the hook
 * fires once, after every source, version, locale and generated section has
 * been parsed, with records a provider could upload. The count in the build log
 * is the assertion: a build that prints `0 records` has a broken hook, and a
 * build that prints nothing at all has a hook that never fired.
 */
export default function wwwSearchRecords(_options: unknown, nuxt: Nuxt) {
  nuxt.hook('duxt:search:records', (records: readonly DuxtSearchRecord[]) => {
    const sources = new Set(records.map((record) => record.source));
    const locales = new Set(records.map((record) => record.locale));

    console.info(
      `[www] duxt:search:records — ${records.length} records across ` +
        `${sources.size} source${sources.size === 1 ? '' : 's'} and ` +
        `${locales.size} language${locales.size === 1 ? '' : 's'}`
    );
  });
}
