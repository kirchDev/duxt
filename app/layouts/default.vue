<script setup lang="ts">
// The landing layout: full width, no sidebar. Docs pages opt into `docs`.
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <DuxtHeader />
    <main>
      <slot />
    </main>
    <DuxtFooter />
  </div>
</template>
