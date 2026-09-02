<script setup lang="ts">
definePageMeta({ layout: 'docs' });

const route = useRoute();

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

const { duxt } = useAppConfig();

// The section this page belongs to, shown above the title the way nuxt.com
// labels a page with its part of the tree.
const section = computed(() =>
  duxt.sections?.find(
    (candidate) => candidate.to && route.path.startsWith(candidate.to)
  )
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
        <p v-if="section" class="mb-2 text-sm font-medium text-primary">
          {{ section.label }}
        </p>
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

      <div class="duxt-prose">
        <ContentRenderer v-if="page" :value="page" />
      </div>
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
