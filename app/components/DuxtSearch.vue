<script setup lang="ts">
/** What Content's search returns, declared here: the type is not exported. */
interface SearchResult {
  id: string;
  title: string;
  titles: string[];
  level: number;
  content: string;
}

// Full-text search over the collection. Content builds the index at build time
// and queries it with SQLite's FTS, so the ranking is the database's rather
// than a substring match of ours — and there is no search service to run.
//
// The index is fetched on first open, not shipped with every page: a docs site
// should not pay for search on a page nobody searches from.
const open = ref(false);
const query = ref('');
const router = useRouter();

const { search, status, init } = useSearchCollection('docs', {
  // A table is flattened into one string, so its cells run together —
  // `KeyWhat it controlstitleThe name in the navbar…`. Its content is still
  // reachable through the page that holds it.
  ignoredTags: ['table'],
  immediate: false
});

const results = ref<SearchResult[]>([]);

let pending: ReturnType<typeof setTimeout> | undefined;

// Debounced by hand rather than through VueUse: one timer is not worth another
// dependency in a layer a consumer installs.
watch(query, (term) => {
  clearTimeout(pending);
  pending = setTimeout(async () => {
    results.value = term.trim() ? await search(term, { limit: 20 }) : [];
  }, 120);
});

async function show() {
  open.value = true;
  if (status.value === 'idle') await init();
}

function go(id: string) {
  open.value = false;
  query.value = '';
  results.value = [];
  router.push(id);
}

/** Where a hit sits: the page, and the headings above it inside that page. */
function context(result: SearchResult) {
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
    variant="outline"
    size="sm"
    class="w-full justify-start gap-2 text-muted-foreground sm:w-56"
    @click="show"
  >
    <Icon name="lucide:search" class="size-4" />
    <span class="text-sm">Search</span>
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
        placeholder="Search the documentation…"
        autofocus
      />
    </div>

    <CommandList class="max-h-[60vh]">
      <div
        v-if="!results.length"
        class="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground"
      >
        <Icon
          :name="query.trim() ? 'lucide:search-x' : 'lucide:search'"
          class="size-5 opacity-60"
        />
        {{
          query.trim() ? 'Nothing found.' : 'Type to search the documentation.'
        }}
      </div>

      <!-- One line per hit. Grouping by page put the page title in a heading
           and again in the entry below it, so every result took four lines to
           say one thing. The page is context now, not a headline. -->
      <CommandGroup v-if="results.length">
        <CommandItem
          v-for="hit in results"
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
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
