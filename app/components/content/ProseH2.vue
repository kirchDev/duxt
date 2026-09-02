<script setup lang="ts">
defineProps<{ id?: string }>();
</script>

<template>
  <h2 :id="id" class="group scroll-mt-20">
    <a
      v-if="id"
      :href="`#${id}`"
      class="duxt-anchor"
      aria-label="Link to this section"
      >#</a
    >
    <slot />
  </h2>
</template>
