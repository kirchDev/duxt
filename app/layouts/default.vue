<script setup lang="ts">
const { data: navigation } = await useAsyncData('duxt-navigation', () =>
  queryCollectionNavigation('docs')
);
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <DuxtHeader />

    <div class="mx-auto flex max-w-7xl gap-8 px-4">
      <aside class="hidden w-56 shrink-0 py-8 lg:block">
        <div class="sticky top-20">
          <DuxtNavigation :items="navigation ?? []" />
        </div>
      </aside>

      <slot />
    </div>
  </div>
</template>
