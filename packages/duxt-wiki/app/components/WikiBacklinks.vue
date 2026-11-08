<script setup lang="ts">
import type { WikiPage } from '../../metadata';
import { wikiMessages } from '../utils/wiki-messages';
const props = withDefaults(
  defineProps<{ pages: WikiPage[]; limit?: number }>(),
  { limit: 10 }
);
const link = useDuxtLink();
const { t } = useI18n({ useScope: 'local', messages: wikiMessages });
const visible = computed(() => props.pages.slice(0, props.limit));
</script>
<template>
  <section
    v-if="pages.length"
    data-wiki-backlinks
    class="mt-8 border-t pt-5"
    :aria-label="t('backlinks')"
  >
    <h2 class="flex items-center gap-2 text-lg font-semibold">
      <Icon
        name="lucide:link-2"
        class="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      {{ t('backlinks') }}
    </h2>
    <ul class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="page in visible" :key="`${page.collection}:${page.path}`">
        <NuxtLink
          :to="link(page.path)"
          class="group flex h-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <span class="min-w-0 wrap-anywhere">{{ page.title }}</span>
          <Icon
            name="lucide:arrow-right"
            class="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
            aria-hidden="true"
          />
        </NuxtLink>
      </li>
    </ul>
    <p
      v-if="pages.length > limit"
      class="mt-3 text-sm text-muted-foreground"
      data-wiki-backlinks-rest
    >
      {{ t('backlinksMore', { count: pages.length - limit }) }}
    </p>
  </section>
</template>
