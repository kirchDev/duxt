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
    <!-- One kind of change is no choice: the row would be a single chip that
         hides everything else. -->
    <div
      v-if="names.length > 1"
      role="group"
      :aria-label="$t('duxt.changelog.filter')"
      class="mb-8 flex flex-wrap items-center gap-2"
    >
      <Button
        variant="outline"
        size="sm"
        :aria-pressed="selected.length === 0"
        :class="selected.length === 0 ? 'bg-accent text-accent-foreground' : ''"
        @click="selected = []"
      >
        {{ $t('duxt.changelog.all') }}
      </Button>

      <Button
        v-for="name in names"
        :key="name"
        variant="outline"
        size="sm"
        :aria-pressed="selected.includes(name)"
        :class="
          selected.includes(name) ? 'bg-accent text-accent-foreground' : ''
        "
        @click="toggle(name)"
      >
        {{ name }}
      </Button>
    </div>

    <!-- A rail down the left, a dot per release: a changelog is read as a
         sequence, and the dates only line up when the list says so. -->
    <ol class="relative ml-2 space-y-8 border-l pl-6">
      <li v-for="release in shown" :key="release.to" class="relative">
        <span
          aria-hidden="true"
          class="absolute -left-[1.9375rem] top-2 size-2.5 rounded-full border-2 border-background bg-muted-foreground"
        />

        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 class="text-xl font-semibold tracking-tight">
            <NuxtLink
              :to="localeLink(release.to)"
              class="hover:text-primary hover:underline"
            >
              {{ release.version }}
            </NuxtLink>
          </h2>

          <time
            v-if="release.date"
            :datetime="release.date"
            class="text-sm text-muted-foreground"
          >
            {{ formatted(release.date) }}
          </time>
        </div>

        <div
          v-if="release.groups?.length"
          class="mt-3 flex flex-wrap items-center gap-2"
        >
          <Badge
            v-for="group in release.groups"
            :key="group.name"
            variant="secondary"
            class="font-normal"
          >
            {{ group.name }}
            <span class="text-muted-foreground">{{ group.count }}</span>
          </Badge>
        </div>
      </li>
    </ol>
  </div>
</template>
