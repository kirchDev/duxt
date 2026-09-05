<script setup lang="ts">
const { data: navigation } = await useDuxtNavigation();

const { items } = useDuxtSection(navigation);
</script>

<template>
  <div class="flex min-h-[100dvh] flex-col bg-background text-foreground">
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
      <aside class="hidden w-56 shrink-0 lg:block">
        <div
          class="sticky top-[6.5rem] max-h-[calc(100vh-8rem)] overflow-y-auto py-8 pr-2"
        >
          <DuxtNavigation :items="items" />
        </div>
      </aside>

      <slot />
    </div>

    <DuxtFooter />

    <!-- One toaster per layout: toast() needs a mounted target to draw into. -->
    <Toaster position="bottom-right" />
  </div>
</template>
