<script setup lang="ts">
import type { DuxtPageTemplateProps } from '@duxt/utils/page-types';
const props = defineProps<DuxtPageTemplateProps>();
</script>
<template><WikiArticle v-bind="props" data-wiki-disambiguation /></template>
