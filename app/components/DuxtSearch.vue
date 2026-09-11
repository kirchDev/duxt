<script setup lang="ts">
// Two roots — the trigger and the dialog — so Vue cannot decide which one
// inherits a class from the parent and drops it with a warning. The trigger
// takes them explicitly.
defineOptions({ inheritAttrs: false });

import type { DuxtSearchHit } from '@duxt/composables/useDuxtSearch';

// Full-text search over EVERY source, not just the one being read. Content
// builds the index at build time and queries it with SQLite's FTS, so the
// ranking is the database's rather than a substring match of ours — and there
// is no search service to run. The merge across sources, and why the results
// are ranked together rather than grouped per repository, is in
// `useDuxtSearch`.
//
// The index is fetched on first open, not shipped with every page: a docs site
// should not pay for search on a page nobody searches from.
const open = ref(false);
const query = ref('');
const router = useRouter();
const localeLink = useDuxtLink();

const { search, init, labelled } = useDuxtSearch();
const analytics = useDuxtAnalytics();

const results = ref<DuxtSearchHit[]>([]);

/**
 * The term the current results were produced for.
 *
 * Not `query`, which moves with every keystroke: the excerpts window themselves
 * around a literal match, and windowing them against a term newer than the
 * results already on screen makes the previews jump while the reader types.
 */
const matched = ref('');

/** True while the list shows near-misses rather than actual matches. */
const approximate = ref(false);

let pending: ReturnType<typeof setTimeout> | undefined;

// Two awaits per keystroke, so a slow answer could land after a newer one and
// overwrite it. Each run takes a number and drops its result if the term moved
// on in the meantime.
let run = 0;

// Debounced by hand rather than through VueUse: one timer is not worth another
// dependency in a layer a consumer installs.
watch(query, (term) => {
  clearTimeout(pending);
  pending = setTimeout(async () => {
    const current = ++run;

    const settle = (hits: DuxtSearchHit[], fuzzy: boolean) => {
      if (current !== run) return false;
      results.value = hits;
      approximate.value = fuzzy;
      matched.value = term;
      return true;
    };

    if (!term.trim()) return void settle([], false);

    const found = await search(term, 20);

    // ONE EVENT PER SETTLED SEARCH, which is why it hangs off `settle` rather
    // than off the call. The debounce already dropped the keystrokes nobody
    // finished, and a run whose answer landed after a newer one shows the
    // reader nothing — reporting it would count a search that never happened.
    // A search that found nothing is reported like any other: "no result" is
    // the finding a documentation site most needs out of this.
    if (settle(found.hits, found.approximate)) {
      analytics.track({
        name: 'search',
        query: term,
        results: found.hits.length,
        approximate: found.approximate
      });
    }
  }, 120);
});

const duxt = useDuxtConfig();
const { recent, load } = useRecentPages(duxt.search?.recentPages);

const sections = computed(() => duxt.sections ?? []);
const sources = computed(() => duxt.resolvedSources ?? []);

/** Which section a path belongs to, for grouping the hits. */
function sectionOf(path: string) {
  return sectionLabelForPath(path, sections.value) ?? 'Documentation';
}

/**
 * What each source is CALLED, rather than which URL segment it occupies.
 *
 * The context line below used to spell its source slot out of the manifest's
 * `repo`, which is an address: documentation served at the root had none and
 * showed nothing, and a source whose segment is an abbreviation showed the
 * abbreviation. See `sourceDisplayNames` for the ladder, and `sources[].name`
 * for the one rung a consumer writes.
 */
const names = computed(() =>
  sourceDisplayNames(sources.value, asText(duxt.title) ?? '')
);

/**
 * The line under every row's title, and deliberately the SAME line in both
 * lists.
 *
 * "Recently viewed" showed a title and its section, which on a site serving
 * several editions of one repository is three identical rows — the reader saw
 * `Harbour` three times and had to open them to find out which was which. A hit
 * had the opposite problem: it named the page it sat in but not the edition
 * that page came from. One `section · source/version · route` answers both, and
 * answering them the same way is what makes the palette scannable.
 */
const contextOf = (path: string) =>
  searchContext(path, sections.value, sources.value, { names: names.value });

const history = computed(() =>
  recent.value.map((page) => ({ ...page, context: contextOf(page.path) }))
);

/**
 * Hits grouped by section rather than by page. Grouping by page produced one
 * heading per result; a section groups many, which is what a heading is for —
 * and the reader already thinks in sections, because the navbar shows them.
 */
const grouped = computed(() => {
  const rows = results.value.map((hit) => ({
    ...hit,
    // WITHOUT the source slot wherever a caption above the run already states
    // it — see `searchRows`. The section and the route stay, because those are
    // the row's own and are what tell two editions of one title apart.
    context: searchContext(hit.id, sections.value, sources.value, {
      names: names.value,
      source: !labelled.value
    }),
    // A title and a route say where a result IS; they do not say whether it
    // answers the question, which is the judgement made before opening a page.
    excerpt: searchExcerpt(hit.content, matched.value)
  }));

  // With several sources the list is ONE ranked list whose rows say where they
  // came from — grouping it by section would re-sort exactly the ranking the
  // merge just produced. See `useDuxtSearch` for why ranking beats grouping.
  if (labelled.value) {
    return [{ label: '', hits: rows }];
  }

  const bySection = new Map<string, typeof rows>();

  for (const hit of rows) {
    const label = sectionOf(hit.id);
    bySection.set(label, [...(bySection.get(label) ?? []), hit]);
  }

  return [...bySection.entries()].map(([label, hits]) => ({ label, hits }));
});

/**
 * The groups above, with each one's repeated source label lifted into captions.
 *
 * Per GROUP rather than over the flat list: a caption opens a run, and a run
 * reaching across a section heading would be opened by a caption sitting under
 * the wrong heading. `searchRows` keeps the order and the count of what it is
 * given either way — see there for why provenance must never re-sort.
 */
const groups = computed(() =>
  grouped.value.map((group) => ({
    label: group.label,
    rows: searchRows(group.hits)
  }))
);

async function show() {
  load();
  open.value = true;
  await init();
}

function go(id: string) {
  open.value = false;
  query.value = '';
  results.value = [];
  approximate.value = false;
  router.push(localeLink(id)!);
}

/**
 * A hit the reader opened — not a section tile and not a recent page, which
 * `go` also serves and which nobody searched for.
 *
 * The rank is the position in the MERGED list rather than in the group it is
 * drawn in: the list is one ranking with headings and captions over it, so a
 * hit's place in its section says nothing about how well the search did. Found
 * by `id` rather than by identity, because a row is a COPY of its hit — it
 * carries the context line and excerpt spread onto it — so the object the
 * template hands back is never the one sitting in `results`. Reported before
 * `go`, which clears the term this hit was found with.
 */
function openResult(hit: DuxtSearchHit) {
  analytics.track({
    name: 'search-result',
    query: query.value,
    rank: results.value.findIndex((entry) => entry.id === hit.id) + 1,
    // The path, never the hit's rendered text.
    to: hit.id,
    collection: hit.source?.collection
  });

  go(hit.id);
}

const { hint, on } = useDuxtShortcuts();

on('search', () => {
  if (open.value) open.value = false;
  else void show();
});

/**
 * The hint on the button, from the same definition the handler binds.
 *
 * Through the LIVE list rather than the raw table, so a site that has unbound
 * the key draws no cap at all instead of advertising a chord nothing answers.
 */
const searchHint = computed(() => hint('search'));
</script>

<template>
  <UiButton
    v-bind="$attrs"
    variant="outline"
    size="sm"
    class="w-full justify-start gap-2 text-muted-foreground"
    @click="show"
  >
    <Icon name="lucide:search" class="size-4" />
    <span class="text-sm">{{ $t('duxt.search.label') }}</span>
    <kbd
      v-if="searchHint"
      class="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline-block"
    >
      {{ searchHint }}
    </kbd>
  </UiButton>

  <UiCommandDialog v-model:open="open">
    <!-- The input is ours, not CommandInput: that one writes into Command's own
         filterState, and Command would then score the list a second time
         against rendered text — dropping entries that mounted after the term
         changed. Leaving its state empty keeps one filter in charge, the
         database's. It also means CommandEmpty never renders, so the empty
         state is ours too.

         No clear button: DialogContent already draws a close X, and two of
         them in the same corner is one too many. -->
    <div class="flex items-center gap-2 border-b px-3">
      <Icon
        name="lucide:search"
        class="size-4 shrink-0 text-muted-foreground"
      />
      <input
        v-model="query"
        class="flex h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        :placeholder="$t('duxt.search.placeholder')"
        autofocus
      />
    </div>

    <UiCommandList class="max-h-[60vh]">
      <!-- An empty box is a dead end. Without a term the dialog offers the
           sections as entry points and, once there is any history, the pages
           this reader came from — which is what they are most likely after. -->
      <template v-if="!query.trim()">
        <UiCommandGroup
          v-if="recent.length"
          :heading="$t('duxt.search.recent')"
        >
          <UiCommandItem
            v-for="page in history"
            :key="page.path"
            :value="`recent ${page.path}`"
            class="items-start gap-2"
            @select="go(page.path)"
          >
            <Icon
              name="lucide:history"
              class="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
            />
            <span class="flex min-w-0 flex-col">
              <span class="truncate">{{ page.title }}</span>
              <span
                v-if="page.context"
                class="truncate text-xs text-muted-foreground"
              >
                {{ page.context }}
              </span>
            </span>
          </UiCommandItem>
        </UiCommandGroup>

        <UiCommandGroup :heading="$t('duxt.search.sections')">
          <UiCommandItem
            v-for="section in duxt.sections ?? []"
            :key="section.to"
            :value="`section ${section.label}`"
            class="gap-2"
            @select="go(section.to ?? '/')"
          >
            <Icon
              :name="section.icon ?? 'lucide:book-open'"
              class="size-3.5 shrink-0 text-muted-foreground"
            />
            <span class="truncate">{{ section.label }}</span>
          </UiCommandItem>
        </UiCommandGroup>
      </template>

      <div
        v-else-if="!results.length"
        class="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground"
      >
        <Icon name="lucide:search-x" class="size-5 opacity-60" />
        {{ $t('duxt.search.empty', { query }) }}
      </div>

      <!-- Say so when the exact search came up empty, otherwise a near-miss
           reads as a match and the reader wonders why their term is missing
           from the result. -->
      <div
        v-if="approximate"
        class="flex items-center gap-2 px-3 pt-3 pb-1 text-xs text-muted-foreground"
      >
        <Icon name="lucide:sparkles" class="size-3.5 shrink-0" />
        {{ $t('duxt.search.approximate', { query }) }}
      </div>

      <!-- THREE LINES per hit: the title, the same context line the history
           above carries, and an excerpt of the section's own text. The
           repository badge is gone — provenance is stated once at the head of
           each run of results that share it, rather than printed onto every
           row, which was the repetition both halves of this dialog were asked
           to remove. -->
      <UiCommandGroup
        v-for="group in groups"
        :key="group.label"
        :heading="group.label || undefined"
      >
        <template v-for="row in group.rows" :key="row.hit.id">
          <!-- Opens a run of hits from one source. `aria-hidden`, because the
               same text reaches a screen reader on every row below through
               `row.provenance` — a caption is a way of not repeating something
               visually, and repeating it to one reader while hiding it from
               another is how a shared label becomes a lie. -->
          <div
            v-if="row.caption"
            aria-hidden="true"
            class="truncate px-2 pt-3 pb-1 text-[11px] font-medium text-muted-foreground/80 first:pt-1"
          >
            {{ row.caption }}
          </div>

          <UiCommandItem
            :value="row.hit.id"
            class="items-start gap-2"
            @select="openResult(row.hit)"
          >
            <Icon
              :name="row.hit.level > 1 ? 'lucide:hash' : 'lucide:file-text'"
              class="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
            />
            <!-- `min-w-0` is what actually lets the lines truncate: a flex item
                 defaults to `min-width: auto`, which refuses to shrink below
                 its content and pushes the dialog into a horizontal scroll on a
                 320px screen instead. -->
            <span class="flex min-w-0 flex-col">
              <span class="truncate">{{ row.hit.title }}</span>
              <span
                v-if="row.hit.context"
                class="truncate text-xs text-muted-foreground"
              >
                {{ row.hit.context }}
              </span>
              <!-- Interpolated, never `v-html`: this is a document's own text,
                   and a page that writes about `<script>` must read as prose
                   rather than run as markup. Dropped entirely when the section
                   has no text, so an empty preview leaves no empty row. -->
              <span
                v-if="row.hit.excerpt"
                class="line-clamp-2 text-xs text-muted-foreground/80"
              >
                {{ row.hit.excerpt }}
              </span>
              <span v-if="row.provenance" class="sr-only">
                {{ row.provenance }}
              </span>
            </span>
          </UiCommandItem>
        </template>
      </UiCommandGroup>
    </UiCommandList>
  </UiCommandDialog>
</template>
