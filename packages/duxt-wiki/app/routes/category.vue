<script setup lang="ts">
import type { DuxtLoadedPage } from '@duxt/utils/page-types';
import { wikiCategory } from '../../queries';
import { wikiCategoryName } from '../../article';
definePageMeta({ layout: 'wiki' });
const { pages, ready, source, fallbacks } = useWikiPages();
const path = useDuxtPath();
const { locale } = useI18n();
const fallbackPage = async (): Promise<DuxtLoadedPage | null> => {
  await ready;
  const segment = decodeURIComponent(path.value.split('/').at(-1)!);
  const name = wikiCategoryName(
    segment,
    (pages.value ?? []).flatMap((page) => page.categories)
  );
  if (!name) return null;
  const category = wikiCategory(pages.value ?? [], name);
  if (!category.members.length) return null;
  const delivered = [source.value, ...fallbacks.value].find(
    (entry) => entry?.collection === category.members[0]?.collection
  );
  return {
    page: {
      path: path.value,
      title: name,
      description: name,
      type: 'category',
      body: { type: 'minimal', value: [] },
      copyPage: false
    } as unknown as DuxtLoadedPage['page'],
    markdown: false,
    from: delivered?.locale,
    asked: locale.value
  };
};
</script>
<template><DuxtContentPage :fallback-page="fallbackPage" /></template>
