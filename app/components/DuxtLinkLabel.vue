<script setup lang="ts">
/**
 * A link's label with the external arrow held to its LAST WORD.
 *
 * The arrow is an inline box, so a label that exactly filled its line pushed
 * the arrow alone onto the next one — "Star on GitHub" on one line and a stray
 * `↗` under it. Wrapping the last word and the arrow in one `nowrap` span makes
 * them one unbreakable piece: when the line is full, the word moves down WITH
 * its arrow. The rest of the label still wraps normally.
 */
const props = defineProps<{
  label: string;
  external?: boolean;
}>();

const parts = computed(() => {
  const trimmed = props.label.trim();
  const at = trimmed.lastIndexOf(' ');

  return at === -1
    ? { head: '', tail: trimmed }
    : { head: trimmed.slice(0, at + 1), tail: trimmed.slice(at + 1) };
});
</script>

<template>
  <template v-if="external">
    {{ parts.head
    }}<span class="whitespace-nowrap"
      >{{ parts.tail }}&nbsp;<Icon
        name="lucide:arrow-up-right"
        class="inline-block size-3 align-middle opacity-50"
    /></span>
  </template>
  <template v-else>{{ label }}</template>
</template>
