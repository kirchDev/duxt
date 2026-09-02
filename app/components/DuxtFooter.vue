<script setup lang="ts">
const { duxt } = useAppConfig();
</script>

<template>
  <footer class="border-t">
    <div
      class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row"
    >
      <p>{{ duxt.footer?.note }}</p>
      <nav class="flex items-center gap-4">
        <NuxtLink
          v-for="link in duxt.footer?.links ?? []"
          :key="link.label"
          :to="link.to"
          :target="link.external ? '_blank' : undefined"
          class="transition-colors hover:text-foreground"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </div>
  </footer>
</template>
