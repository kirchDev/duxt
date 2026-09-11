<script setup lang="ts">
import { flattenedNavigationPages } from '../utils/navigation-tree';
// Previous and next within the current section only. Content's own
// surroundings query walks the whole collection in one flat order, so the last
// page of one section would offer a "next" that lands in another — crossing a
// section is the section row's job, not a link reading "the next page".
const props = defineProps<{ path: string }>();

const { data: navigation } = await useDuxtNavigation();

const { items } = useDuxtSection(navigation);
const localeLink = useDuxtLink();

/** The section's pages in reading order, groups flattened into their children. */
const pages = computed(() => flattenedNavigationPages(items.value));

const index = computed(() =>
  pages.value.findIndex((page) => page.path === props.path)
);
const previous = computed(() =>
  index.value > 0 ? pages.value[index.value - 1] : undefined
);
const next = computed(() =>
  index.value >= 0 ? pages.value[index.value + 1] : undefined
);

/**
 * `[` and `]` move through the section the same way the two links do.
 *
 * Bound here rather than in the layout because this component already knows
 * which pages are adjacent — a second computation of that would be a second
 * chance to disagree with what the links say.
 */
const router = useRouter();
const { hint, on } = useDuxtShortcuts();

/**
 * And they say so, on the two links they move between.
 *
 * These were the least findable keys in the theme: the search button at least
 * carried `⌘K`, while `[` and `]` appeared nowhere a reader would look — only
 * in a sheet they had to already know `?` to open. The cap goes on the link that
 * does the same thing, which is where a reader is already looking when they
 * want it.
 *
 * Nothing is drawn where the policy unbound the keys, and nothing is read out:
 * `aria-hidden` keeps the link's accessible name the page it leads to, since
 * "Next page ] Collections" is a worse thing to hear than the title, and the
 * sheet announces the binding properly.
 */
const previousHint = computed(() => hint('previous'));
const nextHint = computed(() => hint('next'));

on(['previous', 'next'], (action) => {
  const target = action === 'previous' ? previous.value : next.value;
  if (target?.path) void router.push(localeLink(target.path)!);
});
</script>

<template>
  <nav
    v-if="previous || next"
    class="mt-16 grid gap-4 border-t pt-8 sm:grid-cols-2"
    :aria-label="$t('duxt.nav.pagination')"
  >
    <NuxtLink
      v-if="previous"
      :to="localeLink(previous.path)"
      class="flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-accent"
    >
      <span class="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon name="lucide:arrow-left" class="size-3.5" />
        {{ $t('duxt.nav.previous') }}
        <kbd
          v-if="previousHint"
          aria-hidden="true"
          class="ml-auto rounded border bg-muted px-1.5 font-mono text-[10px]"
        >
          {{ previousHint }}
        </kbd>
      </span>
      <span class="font-medium">{{ previous.title }}</span>
    </NuxtLink>
    <span v-else class="hidden sm:block" />

    <NuxtLink
      v-if="next"
      :to="localeLink(next.path)"
      class="flex flex-col gap-1 rounded-lg border p-4 text-right transition-colors hover:bg-accent"
    >
      <span
        class="flex items-center justify-end gap-1 text-xs text-muted-foreground"
      >
        <kbd
          v-if="nextHint"
          aria-hidden="true"
          class="mr-auto rounded border bg-muted px-1.5 font-mono text-[10px]"
        >
          {{ nextHint }}
        </kbd>
        {{ $t('duxt.nav.next') }}
        <Icon name="lucide:arrow-right" class="size-3.5" />
      </span>
      <span class="font-medium">{{ next.title }}</span>
    </NuxtLink>
  </nav>
</template>
