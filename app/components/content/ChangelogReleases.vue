<script setup lang="ts">
/**
 * The changelog overview: every release, newest first, filterable by what
 * changed.
 *
 * MDC: `::changelog-releases` on the section's index page, written by
 * `sections-changelog.ts`. What it draws is a TIMELINE rather than a bullet
 * list of links — the two questions a reader arrives at a changelog with are
 * "what is the latest" and "when did X change", and a date and the kinds of
 * change beside each version answer both without opening anything.
 *
 * THE ENTRIES ARE NOT HERE. Each release has a page of its own — that is what
 * the split granularity buys — and repeating its bullets here would put the
 * whole history twice into the search index, `llms-full.txt` and the feed.
 *
 * The FILTER is what the grouping is for. On a project with two hundred
 * releases "show me the ones with breaking changes" is the question, and the
 * chips are built from the names the file itself used, so a changelog written
 * in German filters in German with nothing configured.
 *
 * The whole entry is the link, not the version alone: a version number is a
 * four-character target, and everything beside it — the date, the kinds of
 * change — describes the page that link goes to.
 */
const props = withDefaults(
  defineProps<{
    releases?: {
      version: string;
      date?: string;
      to: string;
      groups?: { name: string; count: number }[];
    }[];
  }>(),
  { releases: () => [] }
);

const { locale } = useI18n();
const localeLink = useDuxtLink();

/** Every group name the file used, in the order it first used it. */
const names = computed(() => {
  const seen: string[] = [];

  for (const release of props.releases) {
    for (const group of release.groups ?? []) {
      if (!seen.includes(group.name)) seen.push(group.name);
    }
  }

  return seen;
});

/** How many releases carry each name — what the chip counts. */
const totals = computed(() => {
  const counts: Record<string, number> = {};

  for (const release of props.releases) {
    for (const name of new Set((release.groups ?? []).map((g) => g.name))) {
      counts[name] = (counts[name] ?? 0) + 1;
    }
  }

  return counts;
});

/**
 * Nothing selected is EVERYTHING, not nothing.
 *
 * It is also what the server renders: a filter is a reader's choice, so the
 * page has to be complete before anyone makes one — otherwise the crawler, the
 * reader with no JavaScript and the reader whose hydration has not landed yet
 * are each shown a filtered changelog nobody asked for.
 */
const selected = ref<string[]>([]);

const shown = computed(() =>
  selected.value.length
    ? props.releases.filter((release) =>
        (release.groups ?? []).some((group) =>
          selected.value.includes(group.name)
        )
      )
    : props.releases
);

function toggle(name: string) {
  selected.value = selected.value.includes(name)
    ? selected.value.filter((entry) => entry !== name)
    : [...selected.value, name];
}

/** The newest release the file lists — marked wherever the filter puts it. */
const latest = (release: { to: string }) =>
  release.to === props.releases[0]?.to;

/**
 * The release day, in the reader's language.
 *
 * `timeZone: 'UTC'` because the value is a calendar date and not a moment: read
 * as local time, `2026-09-08` is the 7th for every reader west of Greenwich —
 * and a different day on the server than in the browser, which is a hydration
 * mismatch as well as a wrong date.
 */
const formatted = (value?: string) => {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeZone: 'UTC'
  }).format(date);
};
</script>

<template>
  <div class="not-typeset">
    <!-- The list gets a heading of its own, and the control sits on the same
         line at the other end. Two things follow from that: the timeline stops
         being a slab of versions hanging off the preamble with no name, and the
         filter reads as what acts on the list rather than as something wedged
         between the prose and it.

         WHAT WAS CHOSEN GOES ON ITS OWN ROW, under the control and above the
         versions. Beside the control it moved the control: every chip added or
         dropped re-laid the row it shared, so the button a reader was aiming at
         slid out from under the pointer between two clicks. On a row of its own
         the header is fixed and only the row that is actually changing moves. -->
    <div class="mt-10 mb-8 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 class="text-lg font-semibold tracking-tight">
          {{ $t('duxt.changelog.history') }}

          <!-- Numbers only, so it needs no words: the whole history, or how
               much of it the filter is leaving. -->
          <span
            class="ml-1.5 text-sm font-normal text-muted-foreground tabular-nums"
          >
            <template v-if="selected.length">
              {{ shown.length }}&thinsp;/&thinsp;{{ releases.length }}
            </template>
            <template v-else>{{ releases.length }}</template>
          </span>
        </h2>

        <!-- One kind of change is no choice: the control would offer a single
             item that hides everything else.

             A MENU rather than a row of chips, and the reason is the fixture: a
             release-please changelog writes twelve section names, and twelve
             coloured chips wrapped over three rows read as noise sitting
             between the prose and the history. The colours are the timeline's
             own, so a chip below and a dot under a version are the same
             thing. -->
        <div
          v-if="names.length > 1"
          role="group"
          :aria-label="$t('duxt.changelog.filter')"
        >
          <UiDropdownMenu>
            <UiDropdownMenuTrigger as-child>
              <button
                type="button"
                class="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Icon name="lucide:list-filter" class="size-3.5 opacity-60" />
                {{ $t('duxt.changelog.kind') }}
                <span v-if="selected.length" class="tabular-nums text-primary">
                  {{ selected.length }}
                </span>
                <Icon name="lucide:chevron-down" class="size-3.5 opacity-60" />
              </button>
            </UiDropdownMenuTrigger>

            <!-- Capped for the same reason the version menu is: a project with
                 twelve kinds is not the ceiling, and reka only stops the list
                 at the viewport edge. `end`, because the trigger sits at the
                 right edge of the reading column. -->
            <UiDropdownMenuContent
              align="end"
              class="max-h-[min(24rem,var(--reka-dropdown-menu-content-available-height))] w-64 overflow-y-auto"
            >
              <UiDropdownMenuCheckboxItem
                v-for="name in names"
                :key="name"
                :model-value="selected.includes(name)"
                @select="(event: Event) => event.preventDefault()"
                @update:model-value="toggle(name)"
              >
                <span
                  aria-hidden="true"
                  class="size-1.5 shrink-0 rounded-full"
                  :class="changelogTone(name).dot"
                />
                <span class="truncate">{{ name }}</span>
                <span
                  class="ml-auto pl-2 text-xs text-muted-foreground tabular-nums"
                >
                  {{ totals[name] }}
                </span>
              </UiDropdownMenuCheckboxItem>
            </UiDropdownMenuContent>
          </UiDropdownMenu>
        </div>
      </div>

      <!-- Each chip removes its own kind, because "which one did I turn on" is
           answered by the same control that turns it off. -->
      <div
        v-if="selected.length"
        role="group"
        :aria-label="$t('duxt.changelog.selected')"
        class="flex flex-wrap items-center gap-2"
      >
        <button
          v-for="name in selected"
          :key="name"
          type="button"
          class="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          :class="changelogTone(name).chip"
          @click="toggle(name)"
        >
          <span
            aria-hidden="true"
            class="size-1.5 rounded-full"
            :class="changelogTone(name).dot"
          />
          {{ name }}
          <Icon name="lucide:x" class="size-3 opacity-60" />
        </button>

        <button
          type="button"
          class="cursor-pointer text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @click="selected = []"
        >
          {{ $t('duxt.changelog.reset') }}
        </button>
      </div>
    </div>

    <!-- A rail down the left, a dot per release: a changelog is read as a
         sequence, and the dates only line up when the list says so. -->
    <ol class="relative ml-1.5 space-y-2 border-l pl-8">
      <li v-for="release in shown" :key="release.to" class="relative">
        <!-- Centred ON the rail rather than beside it: the dot is placed at the
             padding edge and then pulled back by half its own width, so it
             stays centred whatever size it is drawn at. Positioning it by a
             hand-computed offset is what left it two pixels to the left. -->
        <span
          aria-hidden="true"
          class="absolute top-[1.375rem] -left-8 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background ring-1 ring-border"
          :class="latest(release) ? 'bg-primary' : 'bg-muted-foreground'"
        />

        <NuxtLink
          :to="localeLink(release.to)"
          class="group -mx-3 block rounded-lg px-3 py-2 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <div class="flex min-h-7 flex-wrap items-center gap-x-3 gap-y-1">
            <h3
              class="text-xl font-semibold tracking-tight transition-colors group-hover:text-primary"
            >
              {{ release.version }}
            </h3>

            <time
              v-if="release.date"
              :datetime="release.date"
              class="text-sm text-muted-foreground"
            >
              {{ formatted(release.date) }}
            </time>

            <span
              v-if="latest(release)"
              class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20"
            >
              {{ $t('duxt.changelog.latest') }}
            </span>

            <!-- Only on hover, and only where there is a pointer to hover
                 with: the affordance is the row lighting up, and an arrow
                 parked on every line would be forty arrows. -->
            <Icon
              name="lucide:arrow-right"
              aria-hidden="true"
              class="ml-auto size-4 -translate-x-1 text-muted-foreground opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
            />
          </div>

          <!-- A dot and a number rather than a filled badge per group: five
               solid pills on four releases is twenty solid pills, and the
               colour is doing the work the pill's surface was doing. -->
          <div
            v-if="release.groups?.length"
            class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5"
          >
            <span
              v-for="group in release.groups"
              :key="group.name"
              class="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                aria-hidden="true"
                class="size-1.5 rounded-full"
                :class="changelogTone(group.name).dot"
              />
              {{ group.name }}
              <span class="font-medium text-foreground/70 tabular-nums">
                {{ group.count }}
              </span>
            </span>
          </div>
        </NuxtLink>
      </li>
    </ol>
  </div>
</template>
