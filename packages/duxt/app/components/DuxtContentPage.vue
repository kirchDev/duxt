<script setup lang="ts">
import templates from '#build/duxt-page-templates';
import type { DuxtLoadedPage } from '@duxt/utils/page-types';
const props = defineProps<{
  fallbackPage?: () => Promise<DuxtLoadedPage | null>;
}>();
const { collection, source, fallbacks, translates } = useDuxtCollection();

const path = useDuxtPath();
const duxt = useDuxtConfig();
const localeLink = useDuxtLink();
const { absolute } = useDuxtSiteUrl();
const { locale } = useI18n();

/**
 * The page, in the best language this site has it in.
 *
 * A translated tree is rarely complete, and a reader who followed a link into
 * one should not be punished for the gap with a 404 — Starlight is the only
 * one of the comparable generators that says so out loud, and it is right.
 * `fallbacks` is empty on a site without translations, so this is one query
 * there, exactly as before.
 */
const { data: found } = await useAsyncData<DuxtLoadedPage | null>(
  () => `docs-${locale.value}-${path.value}`,
  async () => {
    // Source OBJECTS, not names: the language each one carries is what the
    // banner compares against, and the first entry has one too.
    const chain = [source.value, ...fallbacks.value].filter(Boolean);

    // The manifest can be absent for a tick after a hot reload, and a page that
    // exists must not 404 over that: the collection name carries its own
    // fallback, so query that rather than nothing at all.
    const entries = chain.length
      ? chain
      : [{ collection: collection.value, locale: undefined }];

    for (const entry of entries) {
      const hit = await queryCollection(entry!.collection as DuxtCollectionArg)
        .path(path.value)
        .first();

      // The language actually delivered, which is what the banner compares
      // against — NOT the position in the chain. A locale the sources do not
      // translate at all has the original as its first entry, and a reader
      // asking for Spanish and getting English has to be told so even though
      // nothing fell back.
      //
      // `asked` travels WITH the hit. `locale` changes the instant the reader
      // picks a language, while this query — and therefore `from` — is still
      // the previous language's result, so comparing the delivered language
      // against the LIVE locale reports every switch as untranslated for the
      // tick between the two. Freezing the language that was asked for into
      // the same object keeps the pair consistent at every moment.
      if (hit) return { page: hit, from: entry!.locale, asked: locale.value };
    }

    const supplied = await props.fallbackPage?.();
    if (supplied) return supplied;

    // `null`, not `undefined`: Nuxt reads a handler that resolves to nothing as
    // one that failed to return (E3006) and repeats the query on the client.
    // No page in any language is a real answer — the 404 below.
    return null;
  },
  { watch: [collection, path] }
);

const page = computed(() => found.value?.page);
const pageType = computed(() =>
  duxtPageType(page.value, source.value, duxt.resolvedPageTypes ?? {})
);
const template = computed(
  () => templates[pageType.value.template as keyof typeof templates]
);

/** True when the reader is being shown a language they did not ask for. */
const untranslated = computed(() => {
  if (!translates.value || !found.value) return false;

  // Compared by LANGUAGE, not by code: a `de/` folder serves `de-DE`, and a
  // reader there is not looking at a foreign language just because the folder
  // names no region. Same rule as the locale files, and as `localeChain`.
  const delivered = found.value.from;
  if (!delivered) return true;

  return delivered.split('-')[0] !== found.value.asked.split('-')[0];
});

if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
    // Fatal on the CLIENT only. A client-side navigation needs it to replace
    // the page with the error page; the server renders that page for any
    // error thrown here. Fatal on the server, Nitro files every missing URL
    // as a sensitive failure and logs it with a stack trace — in dev and in
    // production alike, one line per bot probing a path that does not exist.
    fatal: import.meta.client
  });
}

// Feeds the search dialog's empty state.
const { remember } = useRecentPages(duxt.search?.recentPages);
onMounted(() =>
  remember({ path: path.value, title: page.value?.title ?? path.value })
);

const { current, shouldIndex, preferredPath } = useDuxtVersion();

// The social card. Rendered from the layer's own template unless the consumer
// ships a component of the same name — see `OgImage/Duxt.satori.vue`.
//
// `defineOgImage`, not `defineOgImageComponent`: the latter is deprecated in
// nuxt-og-image v6 and warns once per render. Same arguments, same behaviour.
defineOgImage('Duxt', {
  title: page.value.title,
  description: page.value.description,
  site: duxt.title,
  version: current.value?.version ?? ''
});
const trail = await useDuxtBreadcrumb(() => path.value);

/**
 * The half nuxt-seo-utils cannot infer.
 *
 * It derives `og:title`, `og:description` and the Twitter pair from the title
 * and description below, so those are gone from here — what is left is what
 * only this page knows. `og:url` is THIS page; the canonical below is the page
 * a crawler should keep, and on an old version those are deliberately not the
 * same URL.
 *
 * `robots` is the version half: an older or dead version of a page asks not to
 * be indexed, so a search engine stops offering v0.7.0 where the reader wanted
 * today's docs. An untranslated page is the SAME page under another URL, and
 * indexing it once per locale is duplicate content.
 */
useSeoMeta({
  title: () => page.value?.title,
  description: () => page.value?.description,
  ogType: 'article',
  ogUrl: () => absolute(localeLink(path.value) ?? path.value),
  robots: () =>
    shouldIndex.value && !untranslated.value ? undefined : 'noindex, follow'
});

/**
 * THE CANONICAL IS OURS, not the module's.
 *
 * nuxt-seo-utils writes a canonical pointing at the page being rendered, which
 * is right for every site that has one version of a page and wrong for this
 * one: an old version has to point at the current one, or a search engine keeps
 * serving v0.7.0. unhead deduplicates `link[rel=canonical]`, and this call runs
 * after the module's, so this is the tag that ships — asserted over the built
 * HTML by `scripts/check-seo.ts`, because it is a rule that would break
 * silently.
 */
useHead(() => ({
  link: [
    {
      rel: 'canonical',
      href: absolute(localeLink(preferredPath.value) ?? preferredPath.value)
    },
    ...(found.value?.markdown === false
      ? []
      : [
          {
            // Static HTML retains these relations when an edge serves a prerendered
            // page, unlike an HTTP Link header configured only at runtime.
            rel: 'alternate' as const,
            type: 'text/markdown',
            href: `${localeLink(path.value) ?? path.value}.md`
          }
        ]),
    {
      // Unhead's narrow relation union does not yet include this standard
      // relation, but it still renders arbitrary link relation values.
      rel: 'describedby' as never,
      href: '/llms.txt'
    }
  ]
}));

/**
 * The page, as schema.org — a `TechArticle` and the trail that reaches it.
 *
 * This used to be a hand-written `@graph` in a script tag. nuxt-schema-org
 * keeps one graph per document and resolves the references inside it, so the
 * `WebSite` and `Organization` declared once in `app.vue` are what these nodes
 * hang off, rather than a second copy of the site inlined per page.
 *
 * The trail comes from the same composable the breadcrumb draws, so the two
 * cannot disagree.
 */
useSchemaOrg([
  defineArticle({
    '@type': 'TechArticle',
    headline: () => page.value?.title,
    description: () => page.value?.description,
    inLanguage: () => locale.value
  }),
  /**
   * The WHOLE NODE is the computed, not the field inside it.
   *
   * `DeepResolvableProperties` makes a string field resolvable but maps an
   * array by its own keys, so `itemListElement` takes a plain array and neither
   * a ref nor a getter. Wrapping the definer instead keeps the trail reactive
   * across a client-side navigation, which is the only reason it has to be.
   */
  computed(() =>
    defineBreadcrumb({
      itemListElement: trail.value.map((item) => ({
        name: item.title,
        item: absolute(localeLink(item.path ?? '/') ?? '/')
      }))
    })
  )
]);
</script>

<template>
  <component
    v-if="page"
    :is="template"
    :page="page"
    :untranslated="untranslated"
    :from="found?.from"
  />
</template>
