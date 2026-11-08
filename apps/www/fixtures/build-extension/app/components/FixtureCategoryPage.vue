<script setup lang="ts">
import type { DuxtPageTemplateProps } from '@duxt/utils/page-types';
defineProps<DuxtPageTemplateProps>();
</script>

<template>
  <section data-page-type-template="category">
    <h1>{{ page.title }}</h1>
    <p>Category template supplied by the extension layer.</p>
    <ContentRenderer :value="page" />
    <NuxtLink to="/page-types">Open article</NuxtLink>
  </section>
</template>
