<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';

// A navbar entry's menu, for both rows. The row draws its own trigger in the
// slot, because the two rows do not look alike; what opens is the same.
const props = withDefaults(
  defineProps<{
    link: DuxtLink;
    align?: 'start' | 'center' | 'end';
  }>(),
  { align: 'center' }
);

const mega = computed(() => props.link.menu === 'mega');
const trigger = useTemplateRef<ComponentPublicInstance>('trigger');

/**
 * Where a mega menu hangs from: under its trigger, at the middle of the page.
 *
 * A panel this wide has no sensible position relative to one entry in a row. It
 * started at the trigger and ran off to whichever edge stopped it, so the same
 * menu sat somewhere else for every entry and every window width.
 */
const pageCentre = {
  get contextElement() {
    return trigger.value?.$el as Element | undefined;
  },
  getBoundingClientRect() {
    const anchor = this.contextElement?.getBoundingClientRect();
    return new DOMRect(
      document.documentElement.clientWidth / 2,
      anchor?.top ?? 0,
      0,
      anchor?.height ?? 0
    );
  }
};
const self = computed(() =>
  menuEntries(props.link).slice(0, props.link.to ? 1 : 0)
);
const columns = computed(() => megaColumns(props.link));
const cells = computed(() => megaCells(props.link));
const full = computed(() => props.link.width === 'full');
const width = computed(() =>
  full.value ? undefined : (props.link.width ?? `${columns.value * 15}rem`)
);
</script>

<template>
  <UiDropdownMenu>
    <UiDropdownMenuTrigger ref="trigger" as-child>
      <slot />
    </UiDropdownMenuTrigger>

    <UiDropdownMenuContent
      v-if="mega"
      align="center"
      :reference="pageCentre"
      :collision-padding="16"
      class="p-3"
      :class="
        full ? 'w-[calc(100vw-2rem)] max-w-[88rem]' : 'max-w-[calc(100vw-2rem)]'
      "
      :style="{ width }"
    >
      <template v-if="self.length">
        <DuxtNavigationMenuItems :items="self" />
        <UiDropdownMenuSeparator />
      </template>

      <div
        class="grid gap-x-3 gap-y-4"
        :style="{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
        }"
      >
        <UiDropdownMenuGroup
          v-for="cell in cells"
          :key="cell.entry.to ?? asText(cell.entry.label)"
          class="min-w-0"
          :class="cell.divided ? 'border-s ps-3' : undefined"
          :style="{ gridColumn: `span ${cell.span}` }"
        >
          <DuxtNavigationMenuColumn :entry="cell.entry" />
        </UiDropdownMenuGroup>
      </div>
    </UiDropdownMenuContent>

    <UiDropdownMenuContent v-else :align="align" class="w-64">
      <DuxtNavigationMenuItems :items="menuEntries(link)" />
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
