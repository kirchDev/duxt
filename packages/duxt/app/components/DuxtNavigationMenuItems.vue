<script setup lang="ts">
// The inside of a navbar menu. Calls itself for an entry with children, so a
// menu goes as deep as the configuration does.
defineProps<{ items: DuxtLink[] }>();

const path = useDuxtPath();
const localeLink = useDuxtLink();

function current(to?: string) {
  if (!to) return undefined;
  if (path.value === to) return 'page';
  return to !== '/' && isInside(path.value, to) ? 'true' : undefined;
}
</script>

<template>
  <template v-for="item in items" :key="item.to ?? asText(item.label)">
    <UiDropdownMenuSub v-if="item.children?.length">
      <UiDropdownMenuSubTrigger
        :class="
          menuOwns(item, path) ? 'font-medium text-foreground' : undefined
        "
      >
        <Icon v-if="item.icon" :name="item.icon" class="size-4 shrink-0" />
        <span class="min-w-0 truncate">{{ item.label }}</span>
      </UiDropdownMenuSubTrigger>
      <!-- Portalled because the menu it opens from scrolls, and a scroller
           clips whatever sticks out of it sideways. -->
      <UiDropdownMenuPortal>
        <UiDropdownMenuSubContent class="w-64">
          <DuxtNavigationMenuItems :items="menuEntries(item)" />
        </UiDropdownMenuSubContent>
      </UiDropdownMenuPortal>
    </UiDropdownMenuSub>

    <UiDropdownMenuItem v-else-if="item.to" as-child>
      <NuxtLink
        :to="localeLink(item.to)"
        :target="item.external ? '_blank' : undefined"
        :aria-current="current(item.to)"
        class="block"
        :class="[
          current(item.to) ? 'bg-accent/60' : undefined,
          item.component || item.display === 'callout'
            ? 'h-full p-0!'
            : undefined
        ]"
      >
        <DuxtNavigationMenuEntry :link="item" />
      </NuxtLink>
    </UiDropdownMenuItem>

    <!-- Nothing to go to, so nothing the keyboard should stop on. -->
    <div v-else class="px-2 py-1.5 text-sm">
      <DuxtNavigationMenuEntry :link="item" />
    </div>
  </template>
</template>
