<script setup lang="ts">
// The landing layout: full width, no sidebar. Docs pages opt into `docs`.
</script>

<template>
  <div class="flex min-h-[100dvh] flex-col bg-background text-foreground">
    <!-- How far down the page the reader is, and the `?` sheet listing every
         key the theme binds. -->
    <DuxtProgress />
    <DuxtShortcuts />

    <DuxtHeader />
    <main class="flex-1">
      <slot />
    </main>
    <DuxtFooter />

    <!-- One toaster per layout: toast() needs a mounted target to draw into. -->
    <Toaster position="bottom-right" />
  </div>
</template>
