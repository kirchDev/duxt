<script setup lang="ts">
// The second navbar row: top-level sections of the documentation, each an
// entry point into a part of the tree. nuxt.com's docs read this way, and it
// keeps the sidebar showing one section instead of everything at once.
const duxt = useDuxtConfig();
const route = useRoute();

function isActive(to?: string) {
  return Boolean(to && route.path.startsWith(to));
}
</script>

<template>
  <!-- Hidden below lg: the mobile sheet lists the same sections, and a row
       that scrolls sideways under the header is worse than no row. -->
  <div
    class="sticky top-14 z-40 hidden border-b bg-background/80 backdrop-blur-sm lg:block"
  >
    <nav
      class="mx-auto flex max-w-[90rem] items-center gap-1 overflow-x-auto px-4 lg:px-8"
    >
      <NuxtLink
        v-for="section in duxt.sections"
        :key="section.label"
        :to="section.to"
        class="my-1.5 flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors"
        :class="
          isActive(section.to)
            ? 'bg-accent font-medium text-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
        "
      >
        <Icon v-if="section.icon" :name="section.icon" class="size-4" />
        {{ section.label }}
      </NuxtLink>
    </nav>
  </div>
</template>
