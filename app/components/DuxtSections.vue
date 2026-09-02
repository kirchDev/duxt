<script setup lang="ts">
// The second navbar row: top-level sections of the documentation, each an
// entry point into a part of the tree. nuxt.com's docs read this way, and it
// keeps the sidebar showing one section instead of everything at once.
const { duxt } = useAppConfig();
const route = useRoute();

function isActive(to?: string) {
  return Boolean(to && route.path.startsWith(to));
}
</script>

<template>
  <div class="sticky top-14 z-40 border-b bg-background/80 backdrop-blur-sm">
    <nav
      class="mx-auto flex max-w-[90rem] items-center gap-1 overflow-x-auto px-4 lg:px-8"
    >
      <NuxtLink
        v-for="section in duxt.sections"
        :key="section.label"
        :to="section.to"
        class="flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors"
        :class="
          isActive(section.to)
            ? 'border-primary font-medium text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        "
      >
        <Icon v-if="section.icon" :name="section.icon" class="size-4" />
        {{ section.label }}
      </NuxtLink>
    </nav>
  </div>
</template>
