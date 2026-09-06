<script setup lang="ts">
// Content styles its tokens with `html pre.shiki code .<token>` selectors, so
// the shiki classes have to land on the <pre> itself. Passed through to the
// wrapper instead — the default when attributes fall through — every token
// keeps its class and loses its colour, which reads as "highlighting is off".
defineOptions({ inheritAttrs: false });

const props = defineProps<{
  code?: string;
  language?: string;
  filename?: string;
  highlights?: number[];
  meta?: string;
}>();

/**
 * Line numbers are opt-in per fence, written in its meta:
 *
 *     ```ts line-numbers
 *
 * Not on by default: most snippets in documentation are four lines long and a
 * gutter of numbers next to them is noise. The numbers themselves are drawn by
 * a CSS counter — see `duxt.css` — so a reader copying the block gets the code
 * and not the numbering.
 */
const lineNumbers = computed(() =>
  Boolean(props.meta && /\bline-numbers\b/.test(props.meta))
);
</script>

<template>
  <!-- A ```mermaid fence is a diagram, not a snippet. Mapped here rather than
       through an MDC component map, because this is the component Content
       already hands every fence to and the language is already a prop. -->
  <Mermaid v-if="language === 'mermaid'" :code="code" />

  <DuxtCodeBlock v-else :code="code" :language="language" :filename="filename">
    <pre
      v-bind="$attrs"
      class="overflow-x-auto p-4 text-sm"
      :class="{ 'duxt-line-numbers': lineNumbers }"
    ><slot /></pre>
  </DuxtCodeBlock>
</template>
