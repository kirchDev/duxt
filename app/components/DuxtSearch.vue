<script setup lang="ts">
// Full-text search over the collection. Content builds the index at build time
// and serves it as one payload, so there is no search service to run — the
// trade-off is that it is fetched on first open rather than shipped with every
// page.
const open = ref(false);
const query = ref('');
const router = useRouter();

const { data: sections } = await useAsyncData(
  'duxt-search',
  () => queryCollectionSearchSections('docs'),
  { server: false, immediate: false, default: () => [] }
);

const results = computed(() => {
  const term = query.value.trim().toLowerCase();
  if (!term) return sections.value.slice(0, 12);

  return sections.value
    .filter(
      (section) =>
        section.title?.toLowerCase().includes(term) ||
        section.content?.toLowerCase().includes(term)
    )
    .slice(0, 20);
});

async function show() {
  open.value = true;
  if (!sections.value.length) await refreshNuxtData('duxt-search');
}

function go(id: string) {
  open.value = false;
  query.value = '';
  router.push(id);
}

defineShortcuts();

// ⌘K, or ctrl-K away from a Mac. Registered once here rather than per page.
function defineShortcuts() {
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
}
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
    <CommandInput v-model="query" placeholder="Search the documentation…" />
    <CommandList>
      <CommandEmpty>Nothing found.</CommandEmpty>
      <CommandGroup>
        <CommandItem
          v-for="result in results"
          :key="result.id"
          :value="result.id"
          class="flex flex-col items-start gap-0.5"
          @select="go(result.id)"
        >
          <span class="font-medium">{{ result.title }}</span>
          <span class="line-clamp-1 text-xs text-muted-foreground">{{
            result.content
          }}</span>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
