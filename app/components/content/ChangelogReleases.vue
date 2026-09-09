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

/**
 * The release day, in the reader's language — shared with the meta row a
 * release page draws, so one release cannot be dated two different ways.
 */
const formatted = (value?: string) => changelogDate(value, locale.value);
/** How many groups a row names before it starts counting the rest. */
const SHOWN_GROUPS = 3;

/**
 * The whole history in two numbers, over the list rather than in it.
 *
 * The same summary the landing page opens with — a figure set large with a
 * small labelled line under it — because it answers the question the list
 * cannot: how much there IS. A list of six rows is read as six rows whatever
 * they carry, and the sum of what those releases changed is nowhere on the page
 * otherwise.
 *
 * IT COUNTS WHAT IS SHOWN, not what exists, so a filtered page's figures are
 * about the filtered page — with the total kept beside the first one, which is
 * also where the heading's own count used to sit.
 */
const stats = computed(() => ({
  releases: shown.value.length,
  total: props.releases.length,
  changes: shown.value.reduce(
    (all, release) =>
      all + (release.groups ?? []).reduce((sum, group) => sum + group.count, 0),
    0
  ),
  // What the project actually does, as opposed to how much of it: a history of
  // forty releases that only ever fixes bugs says something a change count
  // cannot. Counted over the names the file used, so it is the file's own
  // vocabulary being counted and not a taxonomy of ours.
  kinds: new Set(
    shown.value.flatMap((release) =>
      (release.groups ?? []).map((group) => group.name)
    )
  ).size,
  // The last day something shipped — the one figure here that is not a count,
  // and the one a reader checks first on a project they are considering.
  last: formatted(shown.value[0]?.date)
}));

/** The newest release the file lists — marked wherever the filter puts it. */
const latest = (release: { to: string }) =>
  release.to === props.releases[0]?.to;

/**
 * The rows as they are drawn: a release, the groups it NAMES, and how many it
 * leaves.
 *
 * The whole list was the row before this, and on a release that touched
 * everything that was twelve names over two lines — twelve facts on a page
 * whose job is to tell six releases apart. A row that grows with the release it
 * describes also stops the list comparing them: the one release with every
 * section becomes the page.
 *
 * So three, BY COUNT rather than by the order the file wrote them: the
 * shallowest reading of "what was this release" is what it did most of, and
 * release-please's own section order is fixed and means nothing. What is left
 * is counted, never dropped silently.
 *
 * A FILTERED row names what it was filtered by first. Otherwise selecting
 * "Tests" leaves a release matching on a group its row does not mention, which
 * reads as a filter that let the wrong page through.
 */
const rows = computed(() =>
  shown.value.map((release) => {
    const groups = [...(release.groups ?? [])].sort((a, b) => {
      const chosen =
        Number(selected.value.includes(b.name)) -
        Number(selected.value.includes(a.name));

      return chosen || b.count - a.count;
    });

    return {
      release,
      named: groups.slice(0, SHOWN_GROUPS),
      rest: Math.max(0, groups.length - SHOWN_GROUPS)
    };
  })
);
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
    <div class="mt-12 mb-8 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 class="text-lg font-semibold tracking-tight">
          {{ $t('duxt.changelog.history') }}
        </h2>

        <!-- One kind of change is no choice: the control would offer a single
             item that hides everything else.

             A MENU rather than a row of chips, and the reason is the fixture: a
             release-please changelog writes twelve section names, and twelve
             coloured chips wrapped over three rows read as noise sitting
             between the prose and the history.

             THE MENU KEEPS ITS DOTS while the history below sets the name in
             the tone instead, and the split is the rule rather than an
             oversight: a menu item is a control, where a mark beside a label is
             what makes the row hittable and scannable, and the history is
             reading matter, where a mark on every line of every release is
             noise. Same six colours either way. -->
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
                <span class="truncate">{{ changelogLabel(name) }}</span>
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
           answered by the same control that turns it off.

           ANIMATED FOR THE SAME REASON THE LIST IS: a chip appearing is the
           visible half of a filter being set, and the list below moves at the
           same moment — the two reading as one gesture is the whole point. Same
           timings, same reduced-motion behaviour.

           NEITHER CHIP CARRIES `transition-colors`, and that is what makes the
           leave visible at all: two transition utilities on one element are two
           declarations of the same property, and which one wins is the order
           Tailwind emitted them in — not the order they are written here. With
           `transition-colors` on the chip the leave ran its 150ms on the colour
           and left opacity and transform untouched, so the chip simply
           vanished. The hover colour is instant now, which on a chip this size
           is not a loss.

           The row is ALWAYS RENDERED and hidden while empty (`empty:hidden`),
           rather than held behind a `v-if` that would take the leaving chips
           with it before they could leave. During a leave it is no longer
           empty, so it stays laid out until the last chip is gone. -->
      <TransitionGroup
        tag="div"
        role="group"
        :aria-label="$t('duxt.changelog.selected')"
        class="flex flex-wrap items-center gap-2 empty:hidden"
        enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
        enter-from-class="scale-95 opacity-0"
        leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
        leave-to-class="scale-95 opacity-0"
        move-class="transition-transform duration-200 ease-out motion-reduce:transition-none"
      >
        <button
          v-for="name in selected"
          :key="name"
          type="button"
          class="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          :class="changelogTone(name).chip"
          @click="toggle(name)"
        >
          <span
            aria-hidden="true"
            class="size-1.5 rounded-full"
            :class="changelogTone(name).dot"
          />
          {{ changelogLabel(name) }}
          <Icon name="lucide:x" class="size-3 opacity-60" />
        </button>

        <button
          v-if="selected.length"
          key="reset"
          type="button"
          class="cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @click="selected = []"
        >
          {{ $t('duxt.changelog.reset') }}
        </button>
      </TransitionGroup>
    </div>

    <!-- WHAT THE LIST CANNOT SAY: how much there is. Two figures set the way
         the landing page sets its own — a number, and a small labelled line
         under it — because six rows are read as six rows whatever they carry.

         They count what is SHOWN. The total stays beside the first one, which
         is where the heading's own count used to sit.

         A GRID, NOT A WRAPPING ROW, and it is the one place on this page where
         the column count is written down: four figures over the full width read
         as the header of the list under them, where the same four bunched at
         the left edge read as a caption with a hole beside it. The landing's
         own row wraps and centres instead, for a number of figures a SITE
         chooses; here the four are the layer's and fixed.

         THE LABEL CARRIES THE ACCENT, the figure does not: `--primary` is the
         one colour a consuming site sets to make the theme its own, and two
         short labelled lines are where it costs nothing and reads as the
         site's. The numbers stay in the text colour — they are read, not
         branded. -->
    <dl
      class="mb-1 grid grid-cols-2 gap-x-6 gap-y-7 border-b pb-5 sm:grid-cols-4"
    >
      <div class="flex flex-col gap-1">
        <dd
          class="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
        >
          {{ stats.releases
          }}<span v-if="selected.length" class="text-muted-foreground">
            &thinsp;/&thinsp;{{ stats.total }}
          </span>
        </dd>
        <dt class="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Icon name="lucide:tag" class="size-3.5" />
          {{ $t('duxt.changelog.releases') }}
        </dt>
      </div>

      <div class="flex flex-col gap-1">
        <dd
          class="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
        >
          {{ stats.changes }}
        </dd>
        <dt class="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Icon name="lucide:git-commit-horizontal" class="size-3.5" />
          {{ $t('duxt.changelog.changes') }}
        </dt>
      </div>

      <div v-if="stats.kinds" class="flex flex-col gap-1">
        <dd
          class="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
        >
          {{ stats.kinds }}
        </dd>
        <dt class="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Icon name="lucide:list-filter" class="size-3.5" />
          {{ $t('duxt.changelog.kinds') }}
        </dt>
      </div>

      <!-- A date rather than a count, and the only one here: it is what a
           reader weighing up a project checks first. Dropped where the file
           dates nothing, rather than printed as a dash. -->
      <div v-if="stats.last" class="flex flex-col gap-1">
        <dd
          class="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
        >
          {{ stats.last }}
        </dd>
        <dt class="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Icon name="lucide:calendar" class="size-3.5" />
          {{ $t('duxt.changelog.last') }}
        </dt>
      </div>
    </dl>

    <!-- ONE LINE PER RELEASE, in columns: version, date, what it carried. Two
         stacked lines gave every release the height of a paragraph and put the
         versions six rows apart — and a history is read down the left edge, one
         line at a time.

         A GRID rather than a flex row, because the columns are what makes the
         line readable: every date starts at the same x, so does every summary,
         and the eye compares releases instead of re-finding the fields. The
         badge column stays in the grid even where no release carries one — an
         empty track is what keeps the fifth row's summary under the first's.

         It COLLAPSES rather than scrolls: under `sm` the wrapper stops being
         `contents`, so version, date and badge sit on one line and the summary
         takes the one below, which is the same row with less room. -->
    <!-- FILTERING MOVES ROWS, so the rows move. A list that jumps from six
         entries to two gives a reader no way to see what happened; the same
         change taken over 200ms is read as a filter narrowing rather than as a
         new page.

         `TransitionGroup` rather than a motion library: this is a fade, a
         nudge and the FLIP the browser does for `move-class`, and none of it is
         worth a runtime dependency in every site that extends the layer. A
         leaving row is taken out of the flow (`absolute`) so the rows under it
         close the gap while it fades rather than after.

         `motion-reduce:transition-none` throughout, because a reader who asked
         the system for less motion asked this list too. -->
    <TransitionGroup
      tag="ol"
      class="relative -mx-3"
      enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="translate-y-1 opacity-0"
      leave-active-class="absolute inset-x-0 transition duration-150 ease-in motion-reduce:transition-none"
      leave-to-class="-translate-y-1 opacity-0"
      move-class="transition-transform duration-200 ease-out motion-reduce:transition-none"
    >
      <li
        v-for="{ release, named, rest } in rows"
        :key="release.to"
        class="border-t border-border/60 first:border-t-0"
      >
        <NuxtLink
          :to="localeLink(release.to)"
          class="group grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1.5 rounded-lg px-3 py-3 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:grid-cols-[9rem_1fr_auto_auto]"
        >
          <span class="flex items-baseline gap-3 sm:contents">
            <!-- ONE CELL for the version and its badge, so the two stand a
                 chip's width apart rather than a column apart: the badge is a
                 fact about the version, and a fixed track between them made the
                 gap a layout decision instead of a typographic one. The cell
                 itself is fixed, which is what still lines the summaries up. -->
            <span
              class="flex items-baseline gap-2 sm:col-start-1 sm:row-start-1"
            >
              <h3
                class="font-semibold tabular-nums transition-colors group-hover:text-primary"
              >
                {{ release.version }}
              </h3>

              <UiBadge
                v-if="latest(release)"
                class="px-2 py-0 text-[0.6875rem] leading-5"
              >
                {{ $t('duxt.changelog.latest') }}
              </UiBadge>
            </span>

            <!-- At the far end, beside the arrow. It is the one field a reader
                 scans down rather than reads across, and the right edge is
                 where a column of dates lines up without competing with the
                 version for the left one. -->
            <time
              v-if="release.date"
              :datetime="release.date"
              class="text-xs text-muted-foreground tabular-nums sm:col-start-3 sm:row-start-1"
            >
              {{ formatted(release.date) }}
            </time>
          </span>

          <p
            class="col-span-2 row-start-2 text-xs text-muted-foreground sm:col-span-1 sm:col-start-2 sm:row-start-1"
          >
            <span v-for="(group, index) in named" :key="group.name">
              <!-- The separator is punctuation, not a word: set fainter than
                   either side and given room, so the eye breaks the line into
                   three facts instead of reading one run of text. -->
              <span
                v-if="index"
                aria-hidden="true"
                class="px-1 text-muted-foreground/50"
              >
                ·
              </span>
              {{ changelogLabel(group.name) }}
              <span class="ml-0.5 font-medium text-foreground tabular-nums">
                {{ group.count }}
              </span>
            </span>

            <template v-if="rest">
              <span aria-hidden="true" class="px-1 text-muted-foreground/50">
                ·
              </span>
              {{ $t('duxt.changelog.more', { count: rest }) }}
            </template>
          </p>

          <!-- The affordance every card and row of this site uses: the arrow
               that steps forward under the pointer. -->
          <Icon
            name="lucide:arrow-right"
            aria-hidden="true"
            class="col-start-2 row-start-1 size-3.5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:col-start-4"
          />
        </NuxtLink>
      </li>
    </TransitionGroup>
  </div>
</template>
