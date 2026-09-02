<script setup lang="ts">
interface Entry {
  name: string;
  children?: Entry[];
}

// `::file-tree` with a `tree` prop, or a nested Markdown list as the body.
defineProps<{ tree?: Entry[]; title?: string }>();
</script>

<template>
  <div class="my-6 overflow-hidden rounded-lg border">
    <div
      v-if="title"
      class="border-b bg-muted/50 px-4 py-2 text-sm font-medium"
    >
      {{ title }}
    </div>
    <div class="p-4 font-mono text-sm">
      <DuxtFileTreeNodes v-if="tree" :entries="tree" />
      <div v-else class="duxt-file-tree">
        <slot />
      </div>
    </div>
  </div>
</template>
