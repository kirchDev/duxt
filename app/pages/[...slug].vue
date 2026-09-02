<script setup lang="ts">
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
  <div class="flex min-w-0 flex-1 gap-8">
    <article class="min-w-0 flex-1 py-8">
      <header v-if="page?.description" class="mb-8">
        <h1 class="text-3xl font-semibold tracking-tight">{{ page.title }}</h1>
        <p class="mt-2 text-lg text-muted-foreground">{{ page.description }}</p>
      </header>

      <!-- Content's own prose components render the Markdown; the styling
           comes from app/assets/css/prose.css so a consumer can restyle a
           single element without replacing a component. -->
      <div class="duxt-prose">
        <ContentRenderer v-if="page" :value="page" />
      </div>
    </article>

    <aside class="hidden w-48 shrink-0 py-8 xl:block">
      <div class="sticky top-20">
        <DuxtToc :links="page?.body?.toc?.links ?? []" />
      </div>
    </aside>
  </div>
</template>
