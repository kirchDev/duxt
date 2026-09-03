<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';

// Previous and next page, in the order the navigation lists them — so it
// follows the docs tree rather than the filesystem.
const props = defineProps<{ path: string }>();

const { data: surroundings } = await useAsyncData(
  `surroundings-${props.path}`,
  () =>
    queryCollectionItemSurroundings('docs', props.path, {
      fields: ['title', 'description']
    })
);

const previous = computed(
  () => surroundings.value?.[0] as ContentNavigationItem | undefined
);
const next = computed(
  () => surroundings.value?.[1] as ContentNavigationItem | undefined
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
      class="group flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-accent"
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
      class="group flex flex-col gap-1 rounded-lg border p-4 text-right transition-colors hover:bg-accent"
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
