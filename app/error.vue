<script setup lang="ts">
import type { NuxtError } from '#app';
import { ConfigProvider } from 'reka-ui';

const props = defineProps<{ error: NuxtError }>();

const localeLink = useDuxtLink();
const path = useDuxtPath();
const duxt = useDuxtConfig();
const { locale } = useI18n();
const direction = useDuxtDirection();

/**
 * The error page replaces `app.vue`, so it inherits nothing from it — not the
 * `lang` attribute, not the `dir` one and not the title template. All three
 * have to be set again here, or the one page a reader reaches by accident is
 * the one page with an untitled, language-less, wrong-way-round document.
 *
 * `dir` was the one that was missing, which is the whole shape of the problem:
 * nothing failed, the error page simply stayed left-to-right while the rest of
 * the site turned round.
 */
useHead(() => ({
  htmlAttrs: { lang: locale.value, dir: direction.value },
  title: `${props.error.statusCode} · ${duxt.title}`
}));

/**
 * An error page is not a page of the site.
 *
 * Nothing stopped a crawler indexing this one, and a 404 that gets indexed
 * competes in a search result with the page the reader was actually looking
 * for. `follow` on purpose: the suggestions below are real pages and a crawler
 * that arrived here by a broken link should still reach them.
 */
useSeoMeta({ robots: 'noindex, follow' });

/**
 * The nearest real pages, from the navigation the layout already fetched.
 *
 * A 404 in versioned documentation is usually a URL that is nearly right, and
 * an empty "not found" tells that reader nothing. Only for a 404 — a 500 has
 * no near miss to offer, and suggesting pages after a server error reads as if
 * the site had decided the reader was mistaken.
 */
const { data: navigation } = await useDuxtNavigation();

// `flattenedNavigationPages` rather than a walk of its own: it honours
// `page: false`, and a group that is not a route — a tfplugindocs `subcategory`
// is the standing example — was being offered here as a near miss, which is a
// 404 suggesting another 404.
const suggestions = computed(() => {
  if (props.error.statusCode !== 404) return [];

  return nearestPages(
    path.value,
    flattenedNavigationPages(navigation.value ?? []).map((item) => ({
      path: item.path,
      title: item.title
    }))
  );
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
  <!-- The same provider `app.vue` mounts, for the same reason: this page
       replaces that one, so the reka primitives inside the layout below would
       otherwise be left with the `ltr` default. -->
  <ConfigProvider :dir="direction">
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
            <UiButton
              v-for="entry in elsewhere"
              :key="entry.path"
              as-child
              variant="outline"
              size="sm"
            >
              <NuxtLink :to="localeLink(entry.path)" class="font-mono text-xs">
                {{ entry.version.label }}
              </NuxtLink>
            </UiButton>
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

        <UiButton as-child class="mt-10">
          <NuxtLink :to="localeLink('/')">
            <Icon name="lucide:arrow-left" class="size-4 rtl:-scale-x-100" />
            {{ $t('duxt.error.back') }}
          </NuxtLink>
        </UiButton>
      </div>
    </NuxtLayout>
  </ConfigProvider>
</template>
