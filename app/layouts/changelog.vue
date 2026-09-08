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
 * pages are the releases. And the reading column is capped inside a window that
 * still leaves room for the contents on the right, which is why `main` carries
 * a width rather than the page: a layout owns how wide its prose is set, and
 * `pages/[...slug].vue` draws the same column for every generated section.
 *
 * The contents column IS there, and its links are not the ones Content found:
 * a release page's headings are drawn by `ChangelogGroup` from a prop, so the
 * outline is read back off the page's own AST — see `generated-toc.ts`.
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

// The chrome the sticky columns hang under — `6.5rem` with the section row,
// less without it. Handed down as a variable so the columns here and the
// contents column `pages/[...slug].vue` draws all read one value.
const { chrome } = useDuxtSectionRow();
</script>

<template>
  <div
    class="flex min-h-[100dvh] flex-col bg-background text-foreground"
    :style="{ '--duxt-chrome': chrome }"
  >
    <DuxtSkipLink />

    <DuxtProgress />
    <DuxtShortcuts />

    <DuxtHeader />
    <DuxtSections />

    <div class="mx-auto flex w-full max-w-[90rem] flex-1 gap-8 px-4 lg:px-8">
      <!-- A section with one page has nothing to navigate, exactly as in the
           docs layout: the column would list the page the reader is on. That is
           the whole overview of a changelog with a single release. -->
      <div v-if="items.length > 1" class="hidden w-56 shrink-0 lg:block">
        <div
          class="sticky top-[var(--duxt-chrome)] max-h-[calc(100vh-var(--duxt-chrome)-1.5rem)] overflow-y-auto py-8 pr-2"
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
        class="mx-auto flex w-full min-w-0 max-w-5xl flex-1 outline-none"
      >
        <slot />
      </main>
    </div>

    <DuxtFooter />

    <!-- One toaster per layout: toast() needs a mounted target to draw into. -->
    <UiToaster position="bottom-right" />
  </div>
</template>
