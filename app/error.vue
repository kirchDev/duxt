<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();

const localeLink = useDuxtLink();
const path = useDuxtPath();
const duxt = useDuxtConfig();
const { locale } = useI18n();

/**
 * The error page replaces `app.vue`, so it inherits nothing from it — not the
 * `lang` attribute and not the title template. Both have to be set again here,
 * or the one page a reader reaches by accident is the one page with an
 * untitled, language-less document.
 */
useHead(() => ({
  htmlAttrs: { lang: locale.value },
  title: `${props.error.statusCode} · ${duxt.title}`
}));

/**
 * The nearest real pages, from the navigation the layout already fetched.
 *
 * A 404 in versioned documentation is usually a URL that is nearly right, and
 * an empty "not found" tells that reader nothing. Only for a 404 — a 500 has
 * no near miss to offer, and suggesting pages after a server error reads as if
 * the site had decided the reader was mistaken.
 */
const { data: navigation } = await useDuxtNavigation();

const suggestions = computed(() => {
  if (props.error.statusCode !== 404) return [];

  const pages: { path: string; title?: string }[] = [];

  const walk = (
    items: { path?: string; title?: string; children?: unknown[] }[]
  ) => {
    for (const item of items) {
      if (item.path) pages.push({ path: item.path, title: item.title });
      if (Array.isArray(item.children)) {
        walk(item.children as { path?: string; title?: string }[]);
      }
    }
  };

  walk((navigation.value ?? []) as { path?: string; title?: string }[]);

  return nearestPages(path.value, pages);
});

// A page missing from one version but present in another is the interesting
// case: the reader asked for something real, just not here.
const elsewhere = computed(
  () =>
    (
      props.error.data as {
        elsewhere?: { version: { label: string }; path: string }[];
      }
    )?.elsewhere ?? []
);
</script>

<template>
  <NuxtLayout>
    <div
      class="mx-auto flex max-w-2xl flex-col items-center px-4 py-32 text-center"
    >
      <p class="font-mono text-sm text-muted-foreground">
        {{ error.statusCode }}
      </p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-balance">
        {{ error.statusMessage ?? $t('duxt.error.title') }}
      </h1>

      <div v-if="elsewhere.length" class="mt-8 w-full">
        <p class="mb-3 text-sm text-muted-foreground">
          {{ $t('duxt.error.elsewhere') }}
        </p>
        <div class="flex flex-wrap justify-center gap-2">
          <Button
            v-for="entry in elsewhere"
            :key="entry.path"
            as-child
            variant="outline"
            size="sm"
          >
            <NuxtLink :to="localeLink(entry.path)" class="font-mono text-xs">
              {{ entry.version.label }}
            </NuxtLink>
          </Button>
        </div>
      </div>

      <div v-if="suggestions.length" class="mt-8 w-full">
        <p class="mb-3 text-sm text-muted-foreground">
          {{ $t('duxt.error.nearest') }}
        </p>
        <ul class="flex flex-col gap-1 text-sm">
          <li v-for="page in suggestions" :key="page.path">
            <NuxtLink
              :to="localeLink(page.path)"
              class="flex items-center justify-center gap-2 rounded-md px-3 py-1.5 transition-colors hover:bg-accent"
            >
              <span class="font-medium">{{ page.title ?? page.path }}</span>
              <span class="font-mono text-xs text-muted-foreground">{{
                page.path
              }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>

      <Button as-child class="mt-10">
        <NuxtLink :to="localeLink('/')">
          <Icon name="lucide:arrow-left" class="size-4" />
          {{ $t('duxt.error.back') }}
        </NuxtLink>
      </Button>
    </div>
  </NuxtLayout>
</template>
