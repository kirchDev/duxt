<script setup lang="ts">
const props = defineProps<{ title?: string; collapsed?: boolean | string }>();
const initiallyOpen = computed(
  () =>
    props.collapsed !== true &&
    props.collapsed !== '' &&
    props.collapsed !== 'true'
);
</script>

<template>
  <div data-infobox-group class="py-2">
    <details :open="initiallyOpen">
      <summary class="cursor-pointer font-semibold">{{ title }}</summary>
      <div class="mt-2 divide-y"><slot /></div>
    </details>
  </div>
</template>
