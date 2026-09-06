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

const results = ref<DuxtSearchHit[]>([]);

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
      if (current !== run) return;
      results.value = hits;
      approximate.value = fuzzy;
    };

    if (!term.trim()) return settle([], false);

    const found = await search(term, 20);
    settle(found.hits, found.approximate);
  }, 120);
});

const duxt = useDuxtConfig();
const { recent, load } = useRecentPages();

/** Which section a path belongs to, for grouping the hits. */
function sectionOf(path: string) {
  return (
    duxt.sections?.find((section) => section.to && path.startsWith(section.to))
      ?.label ?? 'Documentation'
  );
}

/**
 * Hits grouped by section rather than by page. Grouping by page produced one
 * heading per result; a section groups many, which is what a heading is for —
 * and the reader already thinks in sections, because the navbar shows them.
 */
const grouped = computed(() => {
  // With several sources the list is ONE ranked list with a badge per hit —
  // grouping it by section would re-sort exactly the ranking the merge just
  // produced. See `useDuxtSearch` for why ranking beats grouping here.
  if (labelled.value) {
    return [{ label: '', hits: results.value }];
  }

  const bySection = new Map<string, DuxtSearchHit[]>();

  for (const hit of results.value) {
    // A section label may be configured per locale; the group key has to be a
    // plain string, and by this point useDuxtConfig has resolved it.
    const label = asText(sectionOf(hit.id)) ?? 'Documentation';
    bySection.set(label, [...(bySection.get(label) ?? []), hit]);
  }

  return [...bySection.entries()].map(([label, hits]) => ({ label, hits }));
});

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

/** Where a hit sits: the page, and the headings above it inside that page. */
function context(result: DuxtSearchSection) {
  const page = result.titles[0];
  const between = result.titles.slice(1);

  return [page, ...between].filter(Boolean).join(' › ');
}

onMounted(() => {
  const handler = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();

      if (open.value) {
        open.value = false;
      } else {
        void show();
      }
    }
  };

  window.addEventListener('keydown', handler);
  onBeforeUnmount(() => window.removeEventListener('keydown', handler));
});
</script>

<template>
  <Button
    v-bind="$attrs"
    variant="outline"
    size="sm"
    class="w-full justify-start gap-2 text-muted-foreground sm:w-56"
    @click="show"
  >
    <Icon name="lucide:search" class="size-4" />
    <span class="text-sm">{{ $t('duxt.search.label') }}</span>
    <kbd
      class="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline-block"
    >
      ⌘K
    </kbd>
  </Button>

  <CommandDialog v-model:open="open">
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

    <CommandList class="max-h-[60vh]">
      <!-- An empty box is a dead end. Without a term the dialog offers the
           sections as entry points and, once there is any history, the pages
           this reader came from — which is what they are most likely after. -->
      <template v-if="!query.trim()">
        <CommandGroup v-if="recent.length" :heading="$t('duxt.search.recent')">
          <CommandItem
            v-for="page in recent"
            :key="page.path"
            :value="`recent ${page.path}`"
            class="gap-2"
            @select="go(page.path)"
          >
            <Icon
              name="lucide:history"
              class="size-3.5 shrink-0 text-muted-foreground"
            />
            <span class="truncate">{{ page.title }}</span>
            <span class="ml-auto truncate pl-3 text-xs text-muted-foreground">
              {{ sectionOf(page.path) }}
            </span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup :heading="$t('duxt.search.sections')">
          <CommandItem
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
          </CommandItem>
        </CommandGroup>
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

      <!-- One line per hit, grouped by section: the page is context on the
           right, not a heading of its own. -->
      <CommandGroup
        v-for="group in grouped"
        :key="group.label"
        :heading="group.label || undefined"
      >
        <CommandItem
          v-for="hit in group.hits"
          :key="hit.id"
          :value="hit.id"
          class="gap-2"
          @select="go(hit.id)"
        >
          <Icon
            :name="hit.level > 1 ? 'lucide:hash' : 'lucide:file-text'"
            class="size-3.5 shrink-0 text-muted-foreground"
          />
          <span class="truncate">{{ hit.title }}</span>
          <span class="ml-auto truncate pl-3 text-xs text-muted-foreground">
            {{ context(hit) }}
          </span>
          <!-- Which repository and version this came out of. Only drawn where
               there is more than one, so a single-source site sees nothing. -->
          <Badge
            v-if="hit.source"
            variant="secondary"
            class="shrink-0 font-mono text-[10px]"
          >
            {{ hit.source.label }}
          </Badge>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
