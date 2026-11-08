<script setup lang="ts">
import type { DuxtPageTemplateProps } from '@duxt/utils/page-types';
defineProps<DuxtPageTemplateProps>();
</script>

<template>
  <article data-page-type-template="article">
    <h1>{{ page.title }}</h1>
    <p>Article template supplied by the extension layer.</p>
    <ContentRenderer :value="page" />
    <NuxtLink to="/page-types/category">Open category</NuxtLink>
    <NuxtLink to="/getting-started">Open docs</NuxtLink>
  </article>
</template>
