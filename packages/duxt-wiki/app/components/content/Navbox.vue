<script setup lang="ts">
import { wikiNavboxGroups, wikiCategorySlug } from '../../../article';
const props = defineProps<{ category: string }>();
const { pages, ready, source } = useWikiPages();
const link = useDuxtLink();
await ready;
const groups = computed(() =>
  wikiNavboxGroups(pages.value ?? [], props.category)
);
</script>
<template>
  <nav
    v-if="groups.length"
    data-wiki-navbox
    data-not-typeset
    :aria-label="category"
    class="my-6 max-w-full rounded-md border bg-muted/30 p-4"
  >
    <p class="font-semibold wrap-anywhere">{{ category }}</p>
    <dl class="mt-3 space-y-3">
      <div v-for="group in groups" :key="group.title" class="min-w-0">
        <dt class="font-medium wrap-anywhere">
          <NuxtLink
            :to="
              link(
                group.path ??
                  `${source?.prefix ?? ''}/category/${wikiCategorySlug(group.title)}`
              )
            "
            >{{ group.title }}</NuxtLink
          >
        </dt>
        <dd>
          <ul class="flex min-w-0 flex-wrap gap-x-4 gap-y-1">
            <li v-for="page in group.pages" :key="page.path" class="min-w-0">
              <NuxtLink :to="link(page.path)" class="wrap-anywhere">{{
                page.title
              }}</NuxtLink>
            </li>
          </ul>
        </dd>
      </div>
    </dl>
  </nav>
</template>
