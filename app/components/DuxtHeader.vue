<script setup lang="ts">
const colorMode = useColorMode();

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
}
</script>

<template>
  <header
    class="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
  >
    <div class="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
      <NuxtLink to="/" class="font-semibold tracking-tight">
        <slot name="title">duxt</slot>
      </NuxtLink>

      <div class="ml-auto flex items-center gap-1">
        <slot name="actions" />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          @click="toggleTheme"
        >
          <Icon
            :name="colorMode.value === 'dark' ? 'lucide:sun' : 'lucide:moon'"
            class="size-4"
          />
        </Button>
      </div>
    </div>
  </header>
</template>
