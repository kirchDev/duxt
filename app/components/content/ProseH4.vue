<script setup lang="ts">
defineProps<{ id?: string }>();
</script>

<template>
  <h4 :id="id" class="group scroll-mt-20">
    <a
      v-if="id"
      :href="`#${id}`"
      class="duxt-anchor"
      :aria-label="$t('duxt.nav.anchor')"
      >#</a
    >
    <slot />
  </h4>
</template>
