<script setup lang="ts">
const { data: navigation } = await useAsyncData('duxt-navigation', () =>
  queryCollectionNavigation('docs')
);
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <DuxtHeader />

    <!-- Three columns inside one centred container, not a sidebar pinned to the
         window edge: on a wide screen the docs stay a readable block instead of
         drifting apart. -->
    <div class="mx-auto flex max-w-[90rem] gap-8 px-4 lg:px-8">
      <aside class="hidden w-56 shrink-0 lg:block">
        <div
          class="sticky top-[6.5rem] max-h-[calc(100vh-8rem)] overflow-y-auto py-8 pr-2"
        >
          <DuxtNavigation :items="navigation ?? []" />
        </div>
      </aside>

      <slot />
    </div>

    <DuxtFooter />
  </div>
</template>
