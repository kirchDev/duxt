<script setup lang="ts">
// The landing layout: full width, no sidebar. Docs pages opt into `docs`.
</script>

<template>
  <div class="flex min-h-[100dvh] flex-col bg-background text-foreground">
    <DuxtSkipLink />

    <!-- How far down the page the reader is, and the `?` sheet listing every
         key the theme binds. -->
    <DuxtProgress />
    <DuxtShortcuts />

    <!-- The site the layer is rendering may have something to say. Both strips
         draw nothing at all until `duxt.announcements` holds one, space
         included; the third placement, `above-content`, belongs to the page
         rather than to the shell. -->
    <DuxtAnnouncements placement="above-header" />

    <DuxtHeader />

    <DuxtAnnouncements placement="below-header" />

    <main id="duxt-main" tabindex="-1" class="flex-1 outline-none">
      <slot />
    </main>
    <DuxtFooter />

    <!-- One toaster per layout: toast() needs a mounted target to draw into. -->
    <UiToaster position="bottom-right" />
  </div>
</template>
