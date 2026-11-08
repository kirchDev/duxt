<script setup lang="ts">
import type { DuxtPageTemplateProps } from '@duxt/utils/page-types';
import { wikiCreateLink } from '../../wiki-create';
import { resolveWikiLink } from '../../wikilink-resolution';
import { wikiTokens } from '../../wikilinks';
import { wikiMessages } from '../utils/wiki-messages';
definePageMeta({
  layout: 'wiki',
  sitemap: false,
  prerenderNavigation: false
});
const route = useRoute();
const { t } = useI18n({ useScope: 'local', messages: wikiMessages });
const path = useDuxtPath();
const link = useDuxtLink();
const { absolute } = useDuxtSiteUrl();
const page = computed(
  () =>
    ({
      path: path.value,
      title: t('wantedTitle'),
      body: { type: 'minimal', value: [] },
      copyPage: false,
      pageInfo: false,
      prevNext: false,
      feedback: false
    }) as unknown as DuxtPageTemplateProps['page']
);
const wiki = useWikiLinks(page);
await wiki.ready;
// A static collection page has one payload; its query is interpreted on hydration.
const title = ref('');
onMounted(() =>
  watch(
    () => route.query.title,
    (value) => {
      title.value = typeof value === 'string' ? value.slice(0, 300) : '';
    },
    { immediate: true }
  )
);
const wanted = computed(() =>
  wiki.maintenance.value.wanted.find(
    (entry) =>
      entry.title.normalize('NFC').toLowerCase() ===
      title.value.normalize('NFC').toLowerCase()
  )
);
const proposal = computed(() =>
  wiki.source.value && title.value
    ? wikiCreateLink(wiki.source.value, title.value)
    : undefined
);
const existing = computed(() => {
  const token = wikiTokens(`[[${title.value}]]`, false)[0];
  if (!token || !wiki.context.value) return;
  const result = resolveWikiLink(
    wiki.allPages.value,
    token,
    wiki.context.value
  );
  return result.wanted ? undefined : result.href;
});
useSeoMeta({ title: () => t('wantedTitle'), robots: 'noindex, follow' });
useHead(() => ({
  link: [{ rel: 'canonical', href: absolute(link(path.value) ?? path.value) }]
}));
</script>
<template>
  <article class="min-w-0 flex-1 py-8">
    <header class="mb-8 border-b pb-8">
      <NuxtLink
        :to="link(wiki.source.value?.prefix || '/')"
        class="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon
          name="lucide:arrow-left"
          class="size-3.5 rtl:rotate-180"
          aria-hidden="true"
        />
        {{ t('back') }}
      </NuxtLink>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">
        {{ t('wantedTitle') }}
      </h1>
      <p class="mt-3 text-lg text-pretty text-muted-foreground">
        {{ t('wantedIntro') }}
      </p>
    </header>

    <section data-wiki-wanted class="min-w-0">
      <template v-if="title">
        <div
          class="flex flex-wrap items-center justify-between gap-4 rounded-md border bg-muted/30 p-5"
        >
          <div class="flex min-w-0 items-center gap-3">
            <Icon
              :name="existing ? 'lucide:file-check' : 'lucide:file-question'"
              class="size-6 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div class="min-w-0">
              <h2 class="text-xl font-semibold wrap-anywhere">{{ title }}</h2>
              <p class="mt-0.5 text-sm text-muted-foreground">
                {{ existing ? t('exists') : t('missing') }}
              </p>
            </div>
          </div>
          <UiButton v-if="existing" as-child size="sm">
            <NuxtLink :to="link(existing)">{{ t('open') }}</NuxtLink>
          </UiButton>
          <UiButton v-else-if="proposal" as-child size="sm">
            <a
              data-wiki-create
              :href="proposal.url"
              target="_blank"
              rel="noopener"
            >
              <Icon
                :name="`simple-icons:${proposal.forge.toLowerCase()}`"
                aria-hidden="true"
              />
              {{ t('create', { forge: proposal.forge }) }}
            </a>
          </UiButton>
        </div>

        <template v-if="wanted?.linkers.length">
          <h3 class="mt-8 text-lg font-semibold">{{ t('linkingHere') }}</h3>
          <ul class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <li v-for="entry in wanted.linkers" :key="entry.path">
              <NuxtLink
                :to="link(entry.path)"
                class="group flex h-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <span class="min-w-0 wrap-anywhere">{{ entry.title }}</span>
                <Icon
                  name="lucide:arrow-right"
                  class="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                  aria-hidden="true"
                />
              </NuxtLink>
            </li>
          </ul>
        </template>

        <p class="mt-8 text-sm">
          <NuxtLink
            :to="link(path)"
            class="underline underline-offset-4 hover:text-muted-foreground"
            >{{ t('allWanted') }}</NuxtLink
          >
        </p>
      </template>

      <template v-else>
        <ul
          v-if="wiki.maintenance.value.wanted.length"
          class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          <li
            v-for="entry in wiki.maintenance.value.wanted"
            :key="`${entry.collection}:${entry.title}`"
          >
            <NuxtLink
              :to="link(entry.href)"
              rel="nofollow"
              class="flex h-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <span class="min-w-0 wrap-anywhere">{{ entry.title }}</span>
              <span
                class="shrink-0 text-xs font-normal text-muted-foreground"
                >{{ t('linkers', { count: entry.linkers.length }) }}</span
              >
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="text-muted-foreground">{{ t('noWanted') }}</p>
      </template>
    </section>
  </article>
</template>
