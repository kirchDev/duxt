<script setup lang="ts">
/**
 * The first focusable element on the page.
 *
 * Without it every page change means tabbing through the header, the section
 * row and the whole sidebar before the first word of the text. Invisible until
 * focused — `sr-only` collapses it to a single pixel, and the focus state puts
 * it back on screen above everything else.
 *
 * The click is handled rather than left to the hash, because the browser only
 * moves FOCUS to a fragment target that can hold it. Moving it here keeps the
 * URL clean and works whether or not `<main>` carries a tabindex.
 */
const target = '#duxt-main';

function jump(event: MouseEvent) {
  const main = document.querySelector<HTMLElement>(target);
  if (!main) return;

  event.preventDefault();
  main.focus();
  main.scrollIntoView();
}
</script>

<template>
  <a
    :href="target"
    class="sr-only rounded-md bg-background px-4 py-2 text-sm font-medium ring-2 ring-ring focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100"
    @click="jump"
  >
    {{ $t('duxt.nav.skip') }}
  </a>
</template>
