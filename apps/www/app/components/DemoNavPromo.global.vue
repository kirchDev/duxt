<script setup lang="ts">
// The demo for `component` on a menu entry. Global because a menu entry names
// its component as a string in app.config.
defineProps<{ link: DuxtLink }>();
</script>

<template>
  <!-- `ring` for the keyboard: the tile is opaque, so the highlight the menu
       paints behind an entry would not show. -->
  <span
    class="flex h-full w-full items-start gap-3 rounded-sm bg-primary px-2 py-1.5 text-primary-foreground ring-inset in-data-highlighted:ring-2 in-data-highlighted:ring-primary-foreground"
  >
    <span
      class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15"
    >
      <Icon name="lucide:sparkles" class="size-5 text-primary-foreground" />
    </span>
    <span class="block min-w-0">
      <span class="block font-medium">{{ link.label }}</span>
      <span class="block text-xs opacity-80">{{ link.description }}</span>
    </span>
  </span>
</template>
