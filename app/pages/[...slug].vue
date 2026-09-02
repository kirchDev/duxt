<script setup lang="ts">
// Static layout: setPageLayout() after an await loses the component context and
// takes SSR down in a production build, while dev quietly survives it.
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

useSeoMeta({
  title: page.value.title,
  description: page.value.description
});
</script>

<template>
  <div class="mx-auto flex w-full min-w-0 max-w-5xl gap-10 px-6">
    <article class="min-w-0 flex-1 py-10">
      <header class="mb-10">
        <h1
          class="scroll-m-20 text-4xl font-semibold tracking-tight text-balance"
        >
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

    <aside class="hidden w-56 shrink-0 py-10 xl:block">
      <div
        class="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto py-4"
      >
        <DuxtToc :links="page?.body?.toc?.links ?? []" />
      </div>
    </aside>
  </div>
</template>
