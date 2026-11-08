<script setup lang="ts">
import type { DuxtPageTemplateProps } from '@duxt/utils/page-types';
import { wikiCreateLink } from '../../wiki-create';
import { resolveWikiLink } from '../../wikilink-resolution';
import { wikiTokens } from '../../wikilinks';
definePageMeta({ layout: false, sitemap: false });
const route = useRoute();
const path = useDuxtPath();
const link = useDuxtLink();
const { absolute } = useDuxtSiteUrl();
const page = computed(
  () =>
    ({
      path: path.value,
      title: 'Wanted pages',
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
useSeoMeta({ title: 'Wanted pages', robots: 'noindex, follow' });
useHead(() => ({
  link: [{ rel: 'canonical', href: absolute(link(path.value) ?? path.value) }]
}));
</script>
<template>
  <div class="min-h-screen bg-background text-foreground">
    <DuxtSkipLink />
    <main
      id="duxt-main"
      tabindex="-1"
      class="mx-auto max-w-4xl px-4 py-8 outline-none"
    >
      <NuxtLink
        :to="link(wiki.source.value?.prefix || '/')"
        class="underline underline-offset-4"
        >Back to collection</NuxtLink
      >
      <h1 class="mt-6 text-3xl font-semibold">Wanted pages</h1>
      <section data-wiki-wanted class="typeset typeset-docs mt-6 min-w-0">
        <template v-if="title">
          <h2 class="wrap-anywhere">{{ title }}</h2>
          <p v-if="existing">
            This page now exists:
            <NuxtLink :to="link(existing)">{{ title }}</NuxtLink
            >.
          </p>
          <template v-else>
            <p>This page does not exist yet.</p>
            <p v-if="proposal">
              <a
                data-wiki-create
                :href="proposal.url"
                target="_blank"
                rel="noopener"
                >Create on {{ proposal.forge }}</a
              >
            </p>
          </template>
          <h3>Pages linking here</h3>
          <ul>
            <li v-for="entry in wanted?.linkers ?? []" :key="entry.path">
              <NuxtLink :to="link(entry.path)">{{ entry.title }}</NuxtLink>
            </li>
          </ul>
          <p><NuxtLink :to="link(path)">All wanted pages</NuxtLink></p>
        </template>
        <template v-else>
          <p>Pages that are linked to but do not exist yet.</p>
          <ul>
            <li
              v-for="entry in wiki.maintenance.value.wanted"
              :key="`${entry.collection}:${entry.title}`"
            >
              <NuxtLink :to="link(entry.href)" rel="nofollow">{{
                entry.title
              }}</NuxtLink>
              ({{ entry.linkers.length }} linking pages)
            </li>
          </ul>
        </template>
      </section>
    </main>
    <DuxtFooter />
  </div>
</template>
