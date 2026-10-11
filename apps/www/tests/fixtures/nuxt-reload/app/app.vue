<script setup lang="ts">
const { data: page } = await useAsyncData('page', () =>
  queryCollection('docs').path('/getting-started').first()
);
const config = useRuntimeConfig();
</script>

<template>
  <h1>{{ page?.title }}</h1>
  <p>{{ config.public.reloadProbe }}</p>
</template>
