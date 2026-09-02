<script setup lang="ts">
const route = useRoute();
const { data: page } = await useAsyncData(`docs-${route.path}`, () =>
  queryCollection('docs').path(route.path).first()
);
</script>

<template>
  <main>
    <!-- Placeholder rendering. The theme is shadcn-vue via shadcn-nuxt and is
         not built yet; this only proves the layer serves its own collection. -->
    <ContentRenderer v-if="page" :value="page" />
    <p v-else>Not found: {{ route.path }}</p>
  </main>
</template>
