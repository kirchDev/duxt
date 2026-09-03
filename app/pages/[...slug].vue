<script setup lang="ts">
definePageMeta({ layout: 'docs' });

const route = useRoute();
const duxt = useDuxtConfig();

const { data: page } = await useAsyncData(`docs-${route.path}`, () =>
  queryCollection('docs').path(route.path).first()
);

if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
    fatal: true
  });
}

// Feeds the search dialog's empty state.
const { remember } = useRecentPages();
onMounted(() =>
  remember({ path: route.path, title: page.value?.title ?? route.path })
);

useSeoMeta({
  title: page.value.title,
  description: page.value.description
});
</script>

<template>
  <div class="flex min-w-0 flex-1 justify-center gap-10">
    <article class="min-w-0 max-w-3xl flex-1 py-8">
      <header class="mb-8 border-b pb-8">
        <DuxtBreadcrumb
          v-if="duxt.breadcrumb !== false"
          :path="route.path"
          class="mb-3"
        />
        <h1 class="text-4xl font-semibold tracking-tight text-balance">
          {{ page?.title }}
        </h1>
        <p
          v-if="page?.description"
          class="mt-3 text-lg text-muted-foreground text-pretty"
        >
          {{ page.description }}
        </p>
      </header>

      <div class="typeset typeset-docs">
        <ContentRenderer v-if="page" :value="page" />
      </div>

      <DuxtPageNav :path="route.path" />
    </article>

    <aside class="hidden w-56 shrink-0 xl:block">
      <div
        class="sticky top-[6.5rem] max-h-[calc(100vh-8rem)] overflow-y-auto py-8"
      >
        <DuxtToc :links="page?.body?.toc?.links ?? []" />
      </div>
    </aside>
  </div>
</template>
