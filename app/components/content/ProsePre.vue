<script setup lang="ts">
// Content styles its tokens with `html pre.shiki code .<token>` selectors, so
// the shiki classes have to land on the <pre> itself. Passed through to the
// wrapper instead — the default when attributes fall through — every token
// keeps its class and loses its colour, which reads as "highlighting is off".
defineOptions({ inheritAttrs: false });

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
    <pre v-bind="$attrs" class="overflow-x-auto p-4 text-sm"><slot /></pre>
  </DuxtCodeBlock>
</template>
