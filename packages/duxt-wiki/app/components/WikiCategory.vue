<script setup lang="ts">
import type { DuxtPageTemplateProps } from '@duxt/utils/page-types';
import { wikiCategory } from '../../queries';
import { wikiCategoryName } from '../../article';
const props = defineProps<DuxtPageTemplateProps>();
const { pages, ready } = useWikiPages();
await ready;
const category = computed(() => {
  const segment = props.page.path.split('/').at(-1)!;
  const names = (pages.value ?? []).flatMap((page) => page.categories);
  return wikiCategory(
    pages.value ?? [],
    wikiCategoryName(segment, names) ?? props.page.title ?? segment
  );
});
const link = useDuxtLink();
</script>
<template>
  <WikiArticle v-bind="props"
    ><section data-wiki-category class="mt-6 border-t pt-5">
      <h2>{{ page.title }}</h2>
      <ul class="mt-3 grid gap-2 sm:grid-cols-2">
        <li v-for="member in category.members" :key="member.path">
          <NuxtLink :to="link(member.path)" class="wrap-anywhere">{{
            member.title
          }}</NuxtLink>
        </li>
      </ul>
    </section></WikiArticle
  >
</template>
