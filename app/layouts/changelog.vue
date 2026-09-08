<script setup lang="ts">
/**
 * The chrome a release history gets: the releases beside it, and a reading
 * column for the entries.
 *
 * THE SECOND NAME THROUGH THE SHARED SLOT (`DuxtSectionType.layout`), and the
 * shape a changelog needs — which is not the shape the API reference needed.
 * `reference` takes the whole window because parameter tables and a request
 * client want it; a release note is prose, and prose set across a 90rem window
 * is unreadable. So the column is capped at a measure and the releases take the
 * sidebar.
 *
 * Two differences from `docs`, and both follow from what the pages ARE. The
 * sidebar is the release list rather than a prose tree — same navigation, same
 * collection, because a generated section is an ordinary collection and its
 * pages are the releases. And there is no table of contents: a release page's
 * headings are its groups, which the page already shows as a filterable set,
 * and a column repeating "Features, Bug Fixes" beside them says nothing twice.
 *
 * Bound only by the SPLIT granularity. A changelog asked for as the one file it
 * was written as is an ordinary docs page and renders in the docs chrome — see
 * `changelogSectionType.layout`.
 *
 * A page rendered here draws its own header: see the `owned` computed in
 * `pages/[...slug].vue`.
 */
const { data: navigation } = await useDuxtNavigation();

const { items } = useDuxtSection(navigation);
</script>

<template>
  <div class="flex min-h-[100dvh] flex-col bg-background text-foreground">
    <DuxtSkipLink />

    <DuxtProgress />
    <DuxtShortcuts />

    <DuxtHeader />
    <DuxtSections />

    <div class="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 lg:px-8">
      <!-- A section with one page has nothing to navigate, exactly as in the
           docs layout: the column would list the page the reader is on. That is
           the whole overview of a changelog with a single release. -->
      <div v-if="items.length > 1" class="hidden w-56 shrink-0 lg:block">
        <div
          class="sticky top-[6.5rem] max-h-[calc(100vh-8rem)] overflow-y-auto py-8 pr-2"
        >
          <DuxtNavigation
            :items="items"
            :label="$t('duxt.changelog.releases')"
          />
        </div>
      </div>

      <main
        id="duxt-main"
        tabindex="-1"
        class="flex min-w-0 max-w-3xl flex-1 outline-none"
      >
        <slot />
      </main>
    </div>

    <DuxtFooter />

    <!-- One toaster per layout: toast() needs a mounted target to draw into. -->
    <Toaster position="bottom-right" />
  </div>
</template>
