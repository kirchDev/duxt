<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';

// Previous and next within the current section only. Content's own
// surroundings query walks the whole collection in one flat order, so the last
// page of one section would offer a "next" that lands in another — crossing a
// section is the section row's job, not a link reading "the next page".
const props = defineProps<{ path: string }>();

const { data: navigation } = await useAsyncData('duxt-navigation', () =>
  queryCollectionNavigation('docs', ['icon', 'description'])
);

const { items } = useDuxtSection(navigation);

/** The section's pages in reading order, groups flattened into their children. */
const pages = computed(() => {
  const flat: ContentNavigationItem[] = [];

  const walk = (entries: ContentNavigationItem[]) => {
    for (const entry of entries) {
      if (entry.page !== false) flat.push(entry);
      if (entry.children?.length) walk(entry.children);
    }
  };

  walk(items.value);
  return flat;
});

const index = computed(() =>
  pages.value.findIndex((page) => page.path === props.path)
);
const previous = computed(() =>
  index.value > 0 ? pages.value[index.value - 1] : undefined
);
const next = computed(() =>
  index.value >= 0 ? pages.value[index.value + 1] : undefined
);
</script>

<template>
  <nav
    v-if="previous || next"
    class="mt-16 grid gap-4 border-t pt-8 sm:grid-cols-2"
  >
    <NuxtLink
      v-if="previous"
      :to="previous.path"
      class="flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-accent"
    >
      <span class="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon name="lucide:arrow-left" class="size-3.5" />
        Previous
      </span>
      <span class="font-medium">{{ previous.title }}</span>
    </NuxtLink>
    <span v-else class="hidden sm:block" />

    <NuxtLink
      v-if="next"
      :to="next.path"
      class="flex flex-col gap-1 rounded-lg border p-4 text-right transition-colors hover:bg-accent"
    >
      <span
        class="flex items-center justify-end gap-1 text-xs text-muted-foreground"
      >
        Next
        <Icon name="lucide:arrow-right" class="size-3.5" />
      </span>
      <span class="font-medium">{{ next.title }}</span>
    </NuxtLink>
  </nav>
</template>
