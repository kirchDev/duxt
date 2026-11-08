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
    />
    <div class="divide-y"><slot /></div>
  </aside>
</template>

<style>
.duxt-infobox {
  width: 100%;
  margin-block: 1.5rem;
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
