<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';

// A leaf in the docs tree. Nested groups recurse back into DuxtNavigation, so
// a folder inside a folder keeps working without a second component.
defineProps<{ item: ContentNavigationItem }>();

const path = useDuxtPath();
const localeLink = useDuxtLink();

const iconOf = (item: ContentNavigationItem) =>
  typeof item.icon === 'string' ? item.icon : undefined;
</script>

<template>
  <DuxtNavigation v-if="item.children?.length" :items="[item]" />

  <NuxtLink
    v-else
    :to="localeLink(item.path)"
    :aria-current="path === item.path ? 'page' : undefined"
    class="flex items-center gap-2 rounded-md px-2 py-1.5 leading-5 transition-colors"
    :class="
      path === item.path
        ? 'bg-primary/10 font-medium text-primary'
        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
    "
  >
    <Icon v-if="iconOf(item)" :name="iconOf(item)!" class="size-4 shrink-0" />
    <span class="min-w-0">{{ item.title }}</span>
  </NuxtLink>
</template>
