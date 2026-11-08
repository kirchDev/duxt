<script setup lang="ts">
defineProps<{ label?: string }>();
</script>

<template>
  <dl
    data-infobox-row
    class="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 py-2"
  >
    <dt class="font-medium">{{ label }}</dt>
    <dd class="min-w-0 [&_p]:my-0"><slot /></dd>
  </dl>
</template>
