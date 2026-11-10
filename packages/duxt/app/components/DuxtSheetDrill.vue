<script setup lang="ts">
// The mobile sheet's levels. The first is the slot; each menu opened from it
// slides in over it, under a back button, and deeper menus over that again. A
// nested list would run out of width a few levels down, and a phone has none
// to spare.
interface Level {
  id: number;
  link: DuxtLink;
  origin: HTMLElement | null;
}

const levels = ref<Level[]>([]);
const backButtons = useTemplateRef<HTMLButtonElement[]>('back');
let nextId = 0;

// `preventScroll`, because the level is still off to the side while it slides:
// plain focus would scroll the clipped container sideways to reach it.
function focus(element?: HTMLElement | null) {
  element?.focus({ preventScroll: true });
}

async function drill(link: DuxtLink, event: Event) {
  levels.value.push({
    id: nextId++,
    link,
    origin: event.currentTarget as HTMLElement | null
  });
  await nextTick();
  focus(backButtons.value?.at(-1));
}

// After the render: until then the level holding the origin is still inert,
// and focus on an inert element goes nowhere.
async function back() {
  const origin = levels.value.pop()?.origin;
  await nextTick();
  focus(origin);
}

defineExpose({ drill });
</script>

<template>
  <div class="relative min-h-0 flex-1 overflow-hidden">
    <div class="h-full overflow-y-auto p-4" :inert="levels.length > 0">
      <slot />
    </div>

    <TransitionGroup
      enter-active-class="transition-transform duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="translate-x-full rtl:-translate-x-full"
      leave-active-class="transition-transform duration-200 ease-in motion-reduce:transition-none"
      leave-to-class="translate-x-full rtl:-translate-x-full"
    >
      <div
        v-for="(level, depth) in levels"
        :key="level.id"
        class="absolute inset-0 overflow-y-auto bg-background p-4 text-sm"
        :inert="depth < levels.length - 1"
      >
        <button
          ref="back"
          type="button"
          class="-ms-1 mb-3 flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          @click="back"
        >
          <Icon name="lucide:chevron-left" class="size-4 rtl:rotate-180" />
          {{ $t('duxt.nav.back') }}
        </button>

        <p class="mb-2 flex items-center gap-2 px-2 font-semibold">
          <Icon
            v-if="level.link.icon"
            :name="level.link.icon"
            class="size-4 shrink-0"
          />
          {{ level.link.label }}
        </p>

        <DuxtSheetLinks
          :links="menuEntries(level.link)"
          :grouped="level.link.menu === 'mega'"
          @drill="drill"
        />
      </div>
    </TransitionGroup>
  </div>
</template>
