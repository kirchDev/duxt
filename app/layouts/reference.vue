<script setup lang="ts">
/**
 * The layout a generated section's type binds when the docs chrome will not do.
 *
 * THE FIRST NAME THROUGH THE SHARED SLOT (`DuxtSectionType.layout`), and the
 * shape the API reference needs: the operations on the left, and the whole
 * remaining width for the page — which then splits itself into the description
 * and the client, because those two are properties of the operation and a
 * layout cannot reach them.
 *
 * Two differences from `docs`, and only two. It does NOT centre the content in
 * a `max-w-[90rem]` column: three columns of parameter tables and a request
 * client need the window, which is what the issue meant by "full-width". And
 * its sidebar is the endpoint list rather than a prose tree — the same
 * navigation, from the same collection, because a generated section is an
 * ordinary collection and its pages ARE the endpoints.
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

    <div class="flex w-full flex-1 gap-8 px-4 lg:px-8">
      <!-- A section with one page has nothing to navigate, exactly as in the
           docs layout: the column would list the page the reader is on. -->
      <div v-if="items.length > 1" class="hidden w-64 shrink-0 lg:block">
        <div
          class="sticky top-[var(--duxt-chrome)] max-h-[calc(100vh-var(--duxt-chrome)-1.5rem)] overflow-y-auto py-8 pr-2"
        >
          <DuxtNavigation
            :items="items"
            :label="$t('duxt.openapi.endpoints')"
          />
        </div>
      </div>

      <main
        id="duxt-main"
        tabindex="-1"
        class="flex min-w-0 flex-1 outline-none"
      >
        <slot />
      </main>
    </div>

    <DuxtFooter />

    <!-- One toaster per layout: toast() needs a mounted target to draw into. -->
    <Toaster position="bottom-right" />
  </div>
</template>
