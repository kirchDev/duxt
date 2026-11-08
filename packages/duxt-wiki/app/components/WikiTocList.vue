<script setup lang="ts">
import type { DuxtTocLink } from '@duxt/utils/page-controls';
withDefaults(defineProps<{ links: DuxtTocLink[]; prefix?: string }>(), {
  prefix: ''
});
</script>
<template>
  <ol class="space-y-1">
    <li v-for="(link, index) in links" :key="link.id" class="min-w-0">
      <a
        :href="`#${link.id}`"
        class="inline-flex max-w-full gap-2 wrap-anywhere"
        ><span aria-hidden="true">{{ prefix }}{{ index + 1 }}.</span
        ><span>{{ link.text }}</span></a
      >
      <WikiTocList
        v-if="link.children?.length"
        :links="link.children"
        :prefix="`${prefix}${index + 1}.`"
        class="ms-5 mt-1"
      />
    </li>
  </ol>
</template>
