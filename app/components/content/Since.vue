<script setup lang="ts">
/**
 * `:since{version="v2.1"}` beside a heading.
 *
 * Hangs off the version model rather than repeating it: what the badge says is
 * the version a thing ARRIVED in, which is a fact about the API and not about
 * the page it is documented on — so it stays correct in every version of the
 * docs that carries the sentence.
 *
 * For anything else, `:badge[…]` calls the theme's own Badge directly; MDC
 * resolves any globally registered component by name, so a badge with arbitrary
 * text needs no component of its own.
 */
defineProps<{ version?: string }>();
</script>

<template>
  <Badge variant="secondary" class="ml-2 align-middle font-mono text-[10px]">
    {{ $t('duxt.page.since', { version }) }}
  </Badge>
</template>
