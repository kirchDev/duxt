<script setup lang="ts">
const config = useAppConfig();
const visible = computed(() => config.wiki.sidebar);
const toggle = () => updateAppConfig({ wiki: { sidebar: !visible.value } });
</script>
<template>
  <div data-not-typeset class="my-4">
    <UiButton :aria-pressed="visible" variant="outline" @click="toggle">{{
      visible ? 'Hide wiki sidebar' : 'Show wiki sidebar'
    }}</UiButton>
  </div>
</template>
