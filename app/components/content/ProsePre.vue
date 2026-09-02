<script setup lang="ts">
// Content renders a Markdown fence through ProsePre; overriding it is how a
// theme adds a filename bar and a copy button without touching the highlighter.
defineProps<{
  code?: string;
  language?: string;
  filename?: string;
  highlights?: number[];
  meta?: string;
}>();
</script>

<template>
  <DuxtCodeBlock :code="code" :language="language" :filename="filename">
    <pre class="overflow-x-auto p-4 text-sm"><slot /></pre>
  </DuxtCodeBlock>
</template>
