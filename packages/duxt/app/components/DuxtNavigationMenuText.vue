<script setup lang="ts">
defineProps<{ link: DuxtLink }>();
</script>

<template>
  <span class="block min-w-0">
    <!-- Heavier only beside a description: in a plain list of links the column
         heading is what should stand out. The arrow is the one the sheet draws
         for an external child, held to the label's last word. -->
    <span
      class="flex flex-wrap items-center gap-x-1.5"
      :class="link.description ? 'font-medium' : undefined"
    >
      <span class="min-w-0">
        <DuxtLinkLabel
          :label="asText(link.label) ?? ''"
          :external="link.external"
        />
      </span>
      <span
        v-if="link.badge"
        class="rounded bg-primary/10 px-1.5 py-0.5 text-[0.625rem] leading-none font-medium text-primary"
      >
        {{ link.badge }}
      </span>
    </span>
    <span v-if="link.description" class="block text-xs text-muted-foreground">
      {{ link.description }}
    </span>
  </span>
</template>
