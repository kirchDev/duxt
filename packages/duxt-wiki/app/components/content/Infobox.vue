<script setup lang="ts">
defineProps<{ title?: string; image?: string; type?: string }>();
</script>

<template>
  <aside
    data-infobox
    data-not-typeset
    :aria-label="title"
    class="duxt-infobox min-w-0 max-w-full rounded-md border bg-muted/30 p-4 text-sm wrap-anywhere"
  >
    <p v-if="title" class="text-lg font-semibold">{{ title }}</p>
    <ProseImg
      v-if="image"
      :src="image"
      :alt="title ?? ''"
      sizes="100vw sm:288px"
      class="duxt-infobox-image"
    />
    <div class="divide-y"><slot /></div>
  </aside>
</template>

<style>
.duxt-infobox {
  width: 100%;
  margin-block: 1.5rem;
}
/* An SVG with only a viewBox has no intrinsic width, so inside the image's
   shrink-to-fit frame it collapses to nothing. The frame takes the card's width
   and the picture keeps its proportions within a bounded height. */
.duxt-infobox-image {
  margin-block: 0.75rem;
}
.duxt-infobox-image > :first-child,
.duxt-infobox-image img {
  width: 100%;
}
.duxt-infobox-image img {
  max-height: 12rem;
  object-fit: contain;
}
/* The float ends with the prose body, before backlinks and page metadata. */
.typeset.typeset-docs:has(.duxt-infobox) {
  display: flow-root;
}
@media (min-width: 1024px) {
  .duxt-infobox {
    float: inline-end;
    width: 19rem;
    margin-block-start: 0;
    margin-inline-start: 1.5rem;
  }
}
</style>
