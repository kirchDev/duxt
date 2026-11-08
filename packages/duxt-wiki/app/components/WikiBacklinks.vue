<script setup lang="ts">
import type { WikiPage } from '../../metadata';
const props = withDefaults(
  defineProps<{ pages: WikiPage[]; limit?: number }>(),
  { limit: 10 }
);
const link = useDuxtLink();
const visible = computed(() => props.pages.slice(0, props.limit));
</script>
<template>
  <section
    v-if="pages.length"
    data-wiki-backlinks
    class="mt-8 border-t pt-5"
    aria-label="Backlinks"
  >
    <h2 class="text-lg font-semibold">Links to this page</h2>
    <ul class="mt-3 grid gap-2 sm:grid-cols-2">
      <li v-for="page in visible" :key="`${page.collection}:${page.path}`">
        <NuxtLink
          :to="link(page.path)"
          class="wrap-anywhere underline underline-offset-4"
          >{{ page.title }}</NuxtLink
        >
      </li>
    </ul>
    <p
      v-if="pages.length > limit"
      class="mt-3 text-sm text-muted-foreground"
      data-wiki-backlinks-rest
    >
      {{ pages.length - limit }} more linking pages.
    </p>
  </section>
</template>
