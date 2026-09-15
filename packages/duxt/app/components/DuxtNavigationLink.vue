<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';

// A leaf in the docs tree. Nested groups recurse back into DuxtNavigation, so
// a folder inside a folder keeps working without a second component.
defineProps<{ item: ContentNavigationItem }>();

const path = useDuxtPath();
const localeLink = useDuxtLink();

// A page's own icon, else the section's `pageIcon`, else the site's — see
// `resolvePageIcon`.
const duxt = useDuxtConfig();
const iconOf = (item: ContentNavigationItem) =>
  resolvePageIcon(item, duxt.sections, duxt.pageIcon);
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
    <!-- Truncated, not wrapped, and the reason is the active state: `font-medium`
         is wider than the same string at normal weight, so an entry that fitted
         on one line reflowed onto two the moment it became the current page and
         the whole sidebar shifted under the pointer. One line per entry makes the
         weight change invisible to the layout. The `title` keeps the full text
         reachable for the handful of entries long enough to be cut. -->
    <span class="truncate" :title="item.title">{{ item.title }}</span>
  </NuxtLink>
</template>
