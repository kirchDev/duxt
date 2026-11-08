<script setup lang="ts">
import type { DuxtTocLink } from '@duxt/utils/page-controls';
defineProps<{ links: DuxtTocLink[] }>();
</script>
<template>
  <details
    open
    data-wiki-toc
    data-not-typeset
    class="my-6 flow-root max-w-full rounded-md border bg-muted/30 p-4"
  >
    <summary class="cursor-pointer font-medium">
      {{ $t('duxt.toc.title') }}
    </summary>
    <nav :aria-label="$t('duxt.toc.title')" class="mt-3">
      <WikiTocList :links="links" />
    </nav>
  </details>
</template>
