<script setup lang="ts">
const { collection, source, fallbacks, translates } = useDuxtCollection();

definePageMeta({ layout: 'docs' });

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
const { data: found } = await useAsyncData(
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
      if (hit) return { page: hit, from: entry!.locale };
    }

    return undefined;
  },
  { watch: [collection, path] }
);

const page = computed(() => found.value?.page);

/** True when the reader is being shown a language they did not ask for. */
const untranslated = computed(() => {
  if (!translates.value || !found.value) return false;

  // Compared by LANGUAGE, not by code: a `de/` folder serves `de-DE`, and a
  // reader there is not looking at a foreign language just because the folder
  // names no region. Same rule as the locale files, and as `localeChain`.
  const delivered = found.value.from;
  if (!delivered) return true;

  return delivered.split('-')[0] !== locale.value.split('-')[0];
});

if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
    fatal: true
  });
}

// Feeds the search dialog's empty state.
const { remember } = useRecentPages();
onMounted(() =>
  remember({ path: path.value, title: page.value?.title ?? path.value })
);

// After a client-side navigation the focus is still on whatever link was
// clicked. Move it to the heading of the page that arrived.
const heading = useDuxtPageFocus();

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
 * The full head, not the two fields `useSeoMeta` was called with before.
 *
 * `canonical` and `robots` are the version half: an older or dead version of a
 * page points at the current one and asks not to be indexed itself, so a search
 * engine stops offering v0.7.0 where the reader wanted today's docs. The Open
 * Graph and Twitter fields are the social half — every one of them is already
 * on the page object, so leaving them unset was only ever an omission.
 */
useSeoMeta({
  title: () => page.value?.title,
  description: () => page.value?.description,
  ogTitle: () => page.value?.title,
  ogDescription: () => page.value?.description,
  ogType: 'article',
  ogUrl: () => absolute(localeLink(path.value) ?? path.value),
  twitterCard: 'summary_large_image',
  twitterTitle: () => page.value?.title,
  twitterDescription: () => page.value?.description,
  // An untranslated page is the SAME page in another URL: indexing it once per
  // locale is duplicate content, and the canonical below points at the version
  // that actually carries the language.
  robots: () =>
    shouldIndex.value && !untranslated.value ? undefined : 'noindex, follow'
});

useHead(() => ({
  link: [
    {
      rel: 'canonical',
      href: absolute(localeLink(preferredPath.value) ?? preferredPath.value)
    }
  ],

  /**
   * TechArticle plus BreadcrumbList. The trail is the one the breadcrumb draws,
   * taken from the same composable so the two cannot disagree; the article
   * fields are the ones already in the head above.
   */
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'TechArticle',
            headline: page.value?.title,
            description: page.value?.description,
            inLanguage: locale.value,
            url: absolute(localeLink(path.value) ?? path.value),
            isPartOf: {
              '@type': 'WebSite',
              name: duxt.title
            }
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: trail.value.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.title,
              item: absolute(localeLink(item.path ?? '/') ?? '/')
            }))
          }
        ]
      })
    }
  ]
}));
</script>

<template>
  <div class="flex min-w-0 flex-1 justify-center gap-10">
    <article class="min-w-0 max-w-3xl flex-1 py-8">
      <DuxtVersionBanner />

      <DuxtTranslationBanner v-if="untranslated" :from="found?.from" />

      <header class="mb-8 border-b pb-8">
        <DuxtBreadcrumb
          v-if="duxt?.breadcrumb !== false"
          :path="path"
          class="mb-3"
        />
        <!-- The copy action sits with the title, not under the article: it is
             what a reader does with the page BEFORE reading it, and a control
             for that at the bottom is a control nobody finds. -->
        <div class="flex items-start justify-between gap-4">
          <h1
            ref="heading"
            tabindex="-1"
            class="text-4xl font-semibold tracking-tight text-balance outline-none"
          >
            {{ page?.title }}
          </h1>

          <DuxtCopyPage
            class="mt-1"
            :path="path"
            :title="page?.title"
            :rawbody="(page as { rawbody?: string })?.rawbody"
          />
        </div>
        <p
          v-if="page?.description"
          class="mt-3 text-lg text-muted-foreground text-pretty"
        >
          {{ page.description }}
        </p>
      </header>

      <div class="typeset typeset-docs">
        <ContentRenderer v-if="page" :value="page" />
      </div>

      <DuxtPageNav :path="path" />

      <DuxtPageFeedback />
    </article>

    <!-- A div for the same reason as the sidebar's: DuxtToc's two <nav>s are
         the landmarks, and both are labelled. -->
    <div class="hidden w-56 shrink-0 xl:block">
      <div
        class="sticky top-[6.5rem] max-h-[calc(100vh-8rem)] overflow-y-auto py-8"
      >
        <DuxtToc :links="page?.body?.toc?.links ?? []" />

        <!-- Provenance under the contents: where this page came from, when it
             last changed and who wrote it. On the right rather than under the
             article, where it read as an afterthought below the prev/next
             links — this column is already the one answering what a page IS
             rather than what it says. -->
        <DuxtPageInfo :page="page" />
      </div>
    </div>
  </div>
</template>
