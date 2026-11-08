<script setup lang="ts">
import { wikiNavboxGroups, wikiCategorySlug } from '../../../article';
const props = defineProps<{ category: string }>();
const { pages, ready, source } = useWikiPages();
const link = useDuxtLink();
const current = useDuxtPath();
await ready;
const groups = computed(() =>
  wikiNavboxGroups(pages.value ?? [], props.category)
);
function categoryLink(title: string, path?: string) {
  return link(
    path ?? `${source.value?.prefix ?? ''}/category/${wikiCategorySlug(title)}`
  );
}
const heading = computed(() =>
  categoryLink(
    props.category,
    groups.value.find((group) => group.title === props.category)?.path
  )
);
</script>
<template>
  <nav
    v-if="groups.length"
    data-wiki-navbox
    data-not-typeset
    :aria-label="category"
    class="my-6 flow-root max-w-full overflow-hidden rounded-md border"
  >
    <p
      class="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5 font-semibold"
    >
      <Icon
        name="lucide:compass"
        class="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <NuxtLink :to="heading" class="min-w-0 wrap-anywhere hover:underline">{{
        category
      }}</NuxtLink>
    </p>
    <div class="divide-y">
      <div
        v-for="group in groups"
        :key="group.title"
        class="flex min-w-0 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4"
      >
        <!-- The heading already names the category, so only a subcategory
             needs a label of its own. -->
        <NuxtLink
          v-if="group.title !== category"
          :to="categoryLink(group.title, group.path)"
          class="shrink-0 text-sm font-medium wrap-anywhere text-muted-foreground hover:text-foreground sm:w-40"
          >{{ group.title }}</NuxtLink
        >
        <ul class="flex min-w-0 flex-wrap gap-1.5">
          <li v-for="page in group.pages" :key="page.path" class="min-w-0">
            <NuxtLink
              :to="link(page.path)"
              :aria-current="page.path === current ? 'page' : undefined"
              class="inline-block rounded-md border px-2.5 py-1 text-sm wrap-anywhere transition-colors hover:bg-muted"
              :class="
                page.path === current ? 'bg-muted font-medium' : undefined
              "
              >{{ page.title }}</NuxtLink
            >
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
