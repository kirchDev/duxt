<script setup lang="ts">
// The second navbar row: top-level sections of the documentation, each an
// entry point into a part of the tree. nuxt.com's docs read this way, and it
// keeps the sidebar showing one section instead of everything at once.
const path = useDuxtPath();
const localeLink = useDuxtLink();

// Whether the row shows at all is shared with the layouts, which offset their
// sticky columns by the header this row is part of — see `useDuxtSectionRow`.
const { sections, visible } = useDuxtSectionRow();

/**
 * ONE entry is lit, never two — see `currentSection`. An area whose parts nest
 * (`/demo` and `/demo/api`) had both chips marked, and a row that says the
 * reader is in two places at once says nothing.
 */
const active = computed(() => currentSection(sections.value, path.value));

function isActive(to?: string) {
  return Boolean(to && to === active.value?.to);
}

/**
 * A section is rarely the page itself — it is the branch the page sits in. So
 * the exact match announces `page` and an ancestor announces `true`, which is
 * the distinction `aria-current` exists to make.
 */
function current(to?: string) {
  if (!isActive(to)) return undefined;
  return path.value === to ? 'page' : 'true';
}
</script>

<template>
  <!-- Hidden below lg: the mobile sheet lists the same sections, and a row
       that scrolls sideways under the header is worse than no row. -->
  <!-- `top-14` is one pixel short: the header is h-14 PLUS its own border-b,
       so the row parked over that border and the two swapped places by a pixel
       as the browser rounded the scroll offset. -->
  <div
    v-if="visible"
    class="sticky top-[calc(3.5rem_+_1px)] z-40 hidden border-b bg-background/95 backdrop-blur-md lg:block"
  >
    <nav
      class="mx-auto flex max-w-[90rem] items-center gap-1 overflow-x-auto px-4 lg:px-8"
      :aria-label="$t('duxt.nav.sections')"
    >
      <NuxtLink
        v-for="section in sections"
        :key="section.to"
        :to="localeLink(section.to)"
        :aria-current="current(section.to)"
        class="my-1.5 flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors"
        :class="
          isActive(section.to)
            ? 'bg-accent font-medium text-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
        "
      >
        <Icon v-if="section.icon" :name="section.icon" class="size-4" />
        {{ section.label }}
      </NuxtLink>
    </nav>
  </div>
</template>
