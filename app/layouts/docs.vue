<script setup lang="ts">
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

    <!-- How far down the page the reader is, and the `?` sheet listing every
         key the theme binds. -->
    <DuxtProgress />
    <DuxtShortcuts />

    <DuxtHeader />

    <!-- The section row sits with the docs, not in the global header: the
         landing page has no sections to show. -->
    <DuxtSections />

    <!-- Three columns inside one centred container, not a sidebar pinned to the
         window edge: on a wide screen the docs stay a readable block instead of
         drifting apart. -->
    <div class="mx-auto flex w-full max-w-[90rem] flex-1 gap-8 px-4 lg:px-8">
      <!-- A div, not an aside. The <nav> inside is the landmark and carries
           the label; a second, unnamed `complementary` around it only makes a
           screen reader's landmark list longer. -->
      <!-- A section with one page has nothing to navigate: the sidebar would be
           a column listing the page the reader is already on. It drops out, and
           the content takes the width. -->
      <div v-if="items.length > 1" class="hidden w-56 shrink-0 lg:block">
        <div
          class="sticky top-[var(--duxt-header-offset)] max-h-[calc(100vh-var(--duxt-header-offset)-1.5rem)] overflow-y-auto py-8 pr-2"
        >
          <DuxtNavigation :items="items" :label="$t('duxt.nav.docs')" />
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
