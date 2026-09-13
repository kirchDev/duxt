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
  // The status code alone, through the same template `app.vue` sets. After a
  // client-side navigation that template is still mounted, so a title that
  // already carried the site name came out as "404 · duxt · duxt"; rendered on
  // the server it is not, and this page has to bring its own.
  title: String(props.error.statusCode),
  titleTemplate: (title?: string) =>
    title ? `${title} · ${duxt.title}` : duxt.title
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
       otherwise be left with the `ltr` default. The tooltip provider likewise:
       the header's icon controls carry tooltips, and without one a client-side
       navigation to this page threw before it could draw. -->
  <ConfigProvider :dir="direction">
    <UiTooltipProvider>
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
                <NuxtLink
                  :to="localeLink(entry.path)"
                  class="font-mono text-xs"
                >
                  {{ entry.version.label }}
                </NuxtLink>
              </UiButton>
            </div>
          </div>

          <div v-if="suggestions.length" class="mt-8 w-full">
            <p class="mb-3 text-sm text-muted-foreground">
              {{ $t('duxt.error.nearest') }}
            </p>
            <!-- ROWS, NOT A CENTRED LINE PER PAGE. Each suggestion used to be a
               title and its path run together on one centred line, so every
               row started somewhere else and the paths wandered from line to
               line. Left-aligned in one column — title over path, the way the
               search dialog lists a page — the list reads down at a glance. -->
            <ul class="mx-auto flex w-full max-w-md flex-col gap-1 text-start">
              <li v-for="page in suggestions" :key="page.path">
                <NuxtLink
                  :to="localeLink(page.path)"
                  class="group flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <Icon
                    name="lucide:file-text"
                    class="size-4 shrink-0 text-muted-foreground"
                  />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium">
                      {{ page.title ?? page.path }}
                    </span>
                    <span
                      class="block truncate font-mono text-xs text-muted-foreground"
                    >
                      {{ page.path }}
                    </span>
                  </span>
                  <Icon
                    name="lucide:chevron-right"
                    class="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 rtl:-scale-x-100"
                  />
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
    </UiTooltipProvider>
  </ConfigProvider>
</template>
