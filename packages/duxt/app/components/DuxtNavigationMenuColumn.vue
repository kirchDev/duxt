<script setup lang="ts">
// One cell of a mega menu: a column under its name, or a single entry.
const props = defineProps<{ entry: DuxtLink }>();

const heading = computed<DuxtLink>(() => ({
  label: props.entry.label,
  to: props.entry.to,
  icon: props.entry.icon,
  external: props.entry.external,
  badge: props.entry.badge
}));
</script>

<template>
  <template v-if="entry.children?.length">
    <UiDropdownMenuLabel v-if="entry.hideLabel" class="sr-only">
      {{ entry.label }}
    </UiDropdownMenuLabel>
    <div v-else-if="entry.to" class="font-semibold">
      <DuxtNavigationMenuItems :items="[heading]" />
    </div>
    <UiDropdownMenuLabel v-else class="flex items-center gap-2 font-semibold">
      <Icon v-if="entry.icon" :name="entry.icon" class="size-4 shrink-0" />
      <DuxtNavigationMenuText :link="heading" />
    </UiDropdownMenuLabel>

    <!-- Decorative: the column's name already says what it is. -->
    <img
      v-if="entry.image"
      :src="entry.image"
      alt=""
      loading="lazy"
      class="mx-2 mb-1.5 h-24 w-[calc(100%-1rem)] rounded-md bg-muted object-cover"
    />
    <p
      v-if="entry.description"
      class="mb-1.5 px-2 text-xs text-muted-foreground"
    >
      {{ entry.description }}
    </p>

    <DuxtNavigationMenuItems :items="entry.children" />
  </template>

  <DuxtNavigationMenuItems v-else :items="[entry]" />
</template>
