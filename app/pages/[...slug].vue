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
      //
      // `asked` travels WITH the hit. `locale` changes the instant the reader
      // picks a language, while this query — and therefore `from` — is still
      // the previous language's result, so comparing the delivered language
      // against the LIVE locale reports every switch as untranslated for the
      // tick between the two. Freezing the language that was asked for into
      // the same object keeps the pair consistent at every moment.
      if (hit) return { page: hit, from: entry!.locale, asked: locale.value };
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

  return delivered.split('-')[0] !== found.value.asked.split('-')[0];
});

if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
    fatal: true
  });
}

// Feeds the search dialog's empty state.
const { remember } = useRecentPages(duxt.search?.recentPages);
onMounted(() =>
  remember({ path: path.value, title: page.value?.title ?? path.value })
);

// After a client-side navigation the focus is still on whatever link was
// clicked. Move it to the heading of the page that arrived.
const heading = useDuxtPageFocus();

const { current, shouldIndex, preferredPath } = useDuxtVersion();

/**
 * Does the page draw its own header?
 *
 * A generated section whose TYPE NAMES A LAYOUT has replaced the docs shell
 * around this page, and the two halves cannot both draw a header: an API
 * reference wants its title beside a method chip and its right-hand column
 * filled with a request client, not with a table of contents. So the rule is
 * one line — a type that names a layout owns its page — and everything below
 * that belongs to the docs shell drops out: the breadcrumb, the title block,
 * the article's reading width and the prev/next pair. The contents column is
 * the one part that stayed, because it is the one part a generated page still
 * has an outline for — see `generated` below.
 *
 * The BANNERS stay. "You are reading an old version" and "this page is not
 * translated" are true of a generated page exactly as they are of a written
 * one, and a type cannot be expected to redraw them.
 *
 * `generatedLayout` is the same lookup `middleware/duxt-section-layout.global`
 * makes to choose the layout, so the two cannot disagree about which pages are
 * in one.
 */
const owned = computed(() =>
  Boolean(generatedLayout(path.value, duxt?.resolvedSources ?? []))
);

/**
 * The contents of a page whose headings a component draws.
 *
 * `body.toc` is Content's outline of the MARKDOWN it parsed, and a generated
 * page's headings are not in it: a release page's are the group names
 * `ChangelogGroup` renders from a prop, so Content saw a component call and
 * found nothing to list. Reading them back off the AST the page ships anyway is
 * what gives a generated section the same right-hand column every written page
 * has — and it stays empty, so the column drops out, for a type whose pages
 * genuinely have no outline.
 */
const generated = computed(() =>
  owned.value ? generatedToc(page.value?.body, duxt.toc?.depth) : []
);

/**
 * A layout can refuse the column outright — see `DUXT_ASIDE`. The reference
 * does, because an operation fills that side with its request client.
 */
const allowed = inject(DUXT_ASIDE, true);

/**
 * Is there a right-hand column to draw at all?
 *
 * The outline is not the only thing in it: `DuxtToc` also carries the aside's
 * fixed links, and `DuxtPageInfo` sits underneath. So the release OVERVIEW —
 * which deliberately contributes no outline, because its versions are the
 * visible page — still gets the column every other page has, rather than
 * losing the community links and the provenance with it.
 */
/**
 * Does the type draw its own title, or does the shell?
 *
 * See `generatedTitle`. A changelog writes no `<h1>`, so its pages take the
 * same header every written page has; an API reference writes one, and keeps
 * the compact row — the breadcrumb and the copy control, which are facts about
 * the URL and the source rather than about the type.
 */
const titled = computed(() => owned.value && generatedTitle(page.value?.body));

/**
 * Does the shell draw the description, or has the body already said it?
 *
 * See `generatedLeadsWith`.
 */
const described = computed(() => {
  const description = page.value?.description;
  if (!owned.value || !description) return false;

  return !generatedLeadsWith(description, page.value?.body);
});

const aside = computed(
  () =>
    allowed &&
    (generated.value.length > 0 || (duxt.aside?.links?.length ?? 0) > 0)
);

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
  <!-- The type's own layout owns the page: no reading width and no header of
       ours — see `owned`. The CONTENTS COLUMN is drawn here rather than left to
       the layout, because only the page holds the body it is read from. -->
  <div v-if="owned" class="flex min-w-0 flex-1 gap-10">
    <div class="min-w-0 flex-1 py-8">
      <DuxtVersionBanner />

      <DuxtTranslationBanner v-if="untranslated" :from="found?.from" />

      <!-- THE SAME HEADER A WRITTEN PAGE GETS, for a type that draws no title
           of its own. A release page has a title, a description and a trail
           like any other, and the only reason it ever drew its own heading was
           that the layout drew none — which left the copy control floating in a
           row above a title it belongs beside. -->
      <!-- As wide as the page below it. The reading measure is the LAYOUT's
           to set — `changelog` caps its own column, `reference` deliberately
           does not — and a header narrower than the parameter tables under it
           draws a rule that stops halfway across the page. -->
      <header v-if="!titled" class="mb-8 border-b pb-8">
        <DuxtBreadcrumb
          v-if="duxt?.breadcrumb !== false"
          :path="path"
          class="mb-3"
        />

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

        <!-- THE DESCRIPTION, unless the body already opens with it — see
             `generatedLead`. A page whose description Content derived from its
             own first paragraph would print that sentence twice, three lines
             apart; one whose type WROTE a description (an API document's
             `summary`, which appears nowhere in its prose) reads like every
             written page instead, with the lead under the title rather than
             below the rule. -->
        <p
          v-if="described"
          class="mt-3 text-lg text-muted-foreground text-pretty"
        >
          {{ page?.description }}
        </p>
      </header>

      <!-- A type that DOES draw its own title keeps the compact row: where the
           reader is, and what they can do with the page. -->
      <div v-else class="mb-6 flex items-start justify-between gap-4">
        <DuxtBreadcrumb v-if="duxt?.breadcrumb !== false" :path="path" />

        <DuxtCopyPage
          class="-mt-1 ml-auto"
          :path="path"
          :title="page?.title"
          :rawbody="(page as { rawbody?: string })?.rawbody"
        />
      </div>

      <div class="typeset typeset-docs">
        <ContentRenderer v-if="page" :value="page" />
      </div>

      <!-- The SECTION's own order, which is what a generated section has: the
           releases newest to oldest, the endpoints as the artefact listed them.
           `DuxtPageNav` walks the same navigation the sidebar draws and stops
           at the section's edge, so the links can only be siblings — and a
           release page that ended in whitespace now ends in the release before
           it, which is how a history is read. -->
      <DuxtPageNav :path="path" />

      <!-- Provenance survives the header, because it is the one part of it that
           is still true: every page of a generated section came out of one
           artefact, and `DuxtPageInfo` already links at that artefact rather
           than at a file named after the URL. It moves into the column beside
           the contents wherever there is one, exactly as in the docs shell. -->
      <!-- As a row, and as wide as the page: with no column to sit in it is a
           footer, and a rule that stopped at the reading measure under a page
           set wider than that ended halfway across. -->
      <DuxtPageInfo v-if="!aside" row :page="page" />
    </div>

    <div v-if="aside" class="hidden w-56 shrink-0 xl:block">
      <div
        class="sticky top-[var(--duxt-header-offset)] max-h-[calc(100vh-var(--duxt-header-offset)-1.5rem)] overflow-y-auto py-8"
      >
        <DuxtToc :links="generated" />

        <DuxtPageInfo :page="page" />
      </div>
    </div>
  </div>

  <div v-else class="flex min-w-0 flex-1 justify-center gap-10">
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
        class="sticky top-[var(--duxt-header-offset)] max-h-[calc(100vh-var(--duxt-header-offset)-1.5rem)] overflow-y-auto py-8"
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
