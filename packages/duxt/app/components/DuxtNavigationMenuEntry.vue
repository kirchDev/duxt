<script setup lang="ts">
import { resolveDynamicComponent } from 'vue';

// What a menu entry draws. Shadow this file to restyle every entry; set
// `component` for just one, and `display` to pick among the shapes below.
const props = defineProps<{ link: DuxtLink }>();

const display = computed(() => menuDisplay(props.link));
</script>

<template>
  <component
    :is="resolveDynamicComponent(link.component)"
    v-if="link.component"
    :link="link"
  />

  <span
    v-else-if="display === 'callout'"
    class="flex h-full w-full items-center justify-center gap-2 rounded-sm bg-primary/10 px-4 py-2 font-medium text-primary"
  >
    <Icon v-if="link.icon" :name="link.icon" class="size-4 shrink-0" />
    {{ link.label }}
    <Icon name="lucide:arrow-right" class="size-4 shrink-0 rtl:rotate-180" />
  </span>

  <span
    v-else-if="display === 'more'"
    class="flex items-center gap-1 font-medium"
  >
    {{ link.label }}
    <Icon name="lucide:arrow-right" class="size-3.5 shrink-0 rtl:rotate-180" />
  </span>

  <span
    v-else-if="display === 'card'"
    class="flex w-full min-w-0 flex-col gap-2"
  >
    <!-- Decorative: the label under it already names the link. `contain`,
         because a logo must not be cropped to fill a card. -->
    <img
      v-if="link.image"
      :src="link.image"
      alt=""
      loading="lazy"
      class="h-24 w-full rounded-md border bg-muted object-contain p-3"
    />
    <DuxtNavigationMenuText :link="link" />
  </span>

  <span
    v-else-if="display === 'feature'"
    class="flex min-w-0 items-start gap-3"
  >
    <img
      v-if="link.image"
      :src="link.image"
      alt=""
      loading="lazy"
      class="size-14 shrink-0 rounded-lg bg-muted object-contain p-2"
    />
    <span
      v-else-if="link.icon"
      class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
    >
      <Icon :name="link.icon" class="size-5" />
    </span>
    <DuxtNavigationMenuText :link="link" />
  </span>

  <span v-else class="flex min-w-0 items-start gap-2.5">
    <Icon v-if="link.icon" :name="link.icon" class="mt-0.5 size-4 shrink-0" />
    <DuxtNavigationMenuText :link="link" />
  </span>
</template>
