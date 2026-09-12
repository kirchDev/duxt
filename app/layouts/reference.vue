<script setup lang="ts">
/**
 * The layout a generated section's type binds when the docs shell will not do.
 *
 * THE FIRST NAME THROUGH THE SHARED SLOT (`DuxtSectionType.layout`), and the
 * shape the API reference needs: the operations on the left, and the whole
 * remaining width for the page — which then splits itself into the description
 * and the client, because those two are properties of the operation and a
 * layout cannot reach them.
 *
 * ONE difference from `docs`, and it is the sidebar: the endpoint list rather
 * than a prose tree — the same navigation, from the same collection, because a
 * generated section is an ordinary collection and its pages ARE the endpoints.
 *
 * The WIDTH is not a difference, and it was: this shell ran to 100rem where
 * every other one on the site stops at 90rem, so on a wide screen the reference
 * stood ten rem past the header above it and the footer below it. The argument
 * for it — parameter tables and a request client want room — was an argument
 * about the OPERATION, which splits itself and can be given that room there;
 * it was never an argument for the page hanging over the site's own edge.
 * Alignment with the header is worth more than ten rem nobody asked for.
 *
 * A page rendered here draws its own header: see the `owned` computed in
 * `pages/[...slug].vue`.
 *
 * NO CONTENTS COLUMN, and it is this layout that has to say so — the page
 * cannot know. An operation already fills its right-hand side with the request
 * client, and a second sticky column beside that one is two columns of
 * furniture around a table of parameters. `provide` before any await, or the
 * value never reaches the page.
 */
provide(DUXT_ASIDE, false);

const { data: navigation } = await useDuxtNavigation();

const { items } = useDuxtSection(navigation);

// The header the sticky columns hang under — `6.5rem` with the section row,
// less without it. Handed down as a variable so the columns here and the
// contents column `pages/[...slug].vue` draws all read one value.
const { headerOffset } = useDuxtSectionRow();
</script>

<template>
  <div
    class="flex min-h-[100dvh] flex-col bg-background text-foreground"
    :style="{ '--duxt-header-offset': headerOffset }"
  >
    <DuxtSkipLink />

    <DuxtProgress />
    <DuxtShortcuts />

    <!-- The site the layer is rendering may have something to say. Both strips
         draw nothing at all until `duxt.announcements` holds one, space
         included; the third placement, `above-content`, belongs to the page
         rather than to the shell. -->
    <DuxtAnnouncements placement="above-header" />

    <DuxtHeader />
    <DuxtSections />

    <DuxtAnnouncements placement="below-header" />

    <div class="mx-auto flex w-full max-w-[90rem] flex-1 gap-8 px-4 lg:px-8">
      <!-- A section with one page has nothing to navigate, exactly as in the
           docs layout: the column would list the page the reader is on. -->
      <div v-if="items.length > 1" class="hidden w-64 shrink-0 lg:block">
        <div
          class="sticky top-[var(--duxt-header-offset)] max-h-[calc(100vh-var(--duxt-header-offset)-1.5rem)] overflow-y-auto py-8 pe-2"
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
    <UiToaster position="bottom-right" />
  </div>
</template>
