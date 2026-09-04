<script setup lang="ts">
// The version switcher. Versions come from the config rather than from the
// collections, because content.config.ts runs in its own load pass and the app
// never sees its result — a consumer declares the list once and both halves
// read it.
const duxt = useDuxtConfig();
const route = useRoute();

/**
 * Versions come from the resolved source manifest, so the switcher can only
 * offer what actually has a collection behind it. Declaring them by hand meant
 * the two halves could disagree — a version in the menu with nothing to serve
 * it, or a collection nobody could reach.
 *
 * `versions` in the config still wins where a label needs to read differently
 * from the URL segment.
 */
/**
 * Versions come from the resolved source manifest, so the switcher can only
 * offer what actually has a collection behind it.
 *
 * Scoped to the repository being read: on a site serving two projects, the
 * versions of one say nothing about the other, and offering them would send
 * the reader somewhere that does not exist. A source with no versions shows no
 * switcher at all.
 *
 * `versions` in the config still wins where a label needs to read differently
 * from the URL segment.
 */
const versions = computed(() => {
  if (duxt.versions?.length) return duxt.versions;

  const sources = duxt.sources ?? [];
  const currentSource = [...sources]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((source) => !source.prefix || route.path.startsWith(source.prefix));

  return sources
    .filter((source) => source.version && source.repo === currentSource?.repo)
    .map((source) => ({
      label: source.version!,
      to: source.prefix || '/',
      description: source.isDefault ? 'default' : undefined
    }));
});

/** The version whose prefix the current path starts with, else the default. */
const current = computed(() =>
  sourceForPath(
    route.path,
    versions.value.map((version) => ({ ...version, prefix: version.to ?? '' }))
  )
);

/** Same page, other version: swap the prefix rather than jumping to its root. */
function pathIn(version: { to?: string }) {
  return versionPath(route.path, current.value?.to, version.to ?? '/');
}
</script>

<template>
  <DropdownMenu v-if="versions.length > 1">
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" class="gap-1.5 font-mono text-xs">
        {{ current?.label ?? 'version' }}
        <Icon name="lucide:chevron-down" class="size-3.5 opacity-60" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-44">
      <DropdownMenuItem
        v-for="version in versions"
        :key="version.label"
        as-child
      >
        <NuxtLink :to="pathIn(version)" class="flex items-center gap-2">
          <Icon
            name="lucide:check"
            class="size-3.5"
            :class="version.label === current?.label ? '' : 'opacity-0'"
          />
          <span class="font-mono text-xs">{{ version.label }}</span>
          <span
            v-if="version.description"
            class="ml-auto text-xs text-muted-foreground"
          >
            {{ version.description }}
          </span>
        </NuxtLink>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
