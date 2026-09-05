<script setup lang="ts">
/**
 * How far down the page the reader is.
 *
 * A two-pixel rule under the header rather than a number: on a long reference
 * page the useful question is "am I near the end", and a percentage answers it
 * worse than a line does. `aria-hidden`, because it says nothing a screen
 * reader cannot already ask the document.
 *
 * Measured against the document, not against a scroll container, so it is
 * correct on the docs layout and on the landing page alike. Passive listener:
 * this must never be the thing that makes scrolling stutter.
 */
const progress = ref(0);

function measure() {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - doc.clientHeight;

  progress.value = scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0;
}

onMounted(() => {
  measure();
  window.addEventListener('scroll', measure, { passive: true });
  window.addEventListener('resize', measure, { passive: true });

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', measure);
    window.removeEventListener('resize', measure);
  });
});
</script>

<template>
  <div
    aria-hidden="true"
    class="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5"
  >
    <div
      class="h-full bg-primary transition-[width] duration-75"
      :style="{ width: `${progress}%` }"
    />
  </div>
</template>
