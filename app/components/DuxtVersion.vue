<script setup lang="ts">
/**
 * The one place a version is shown.
 *
 * Before, the project's version sat as a badge beside the title while the
 * documentation's versions lived in a separate dropdown on the far right —
 * two controls saying different things, and the right-hand one appeared only
 * on sources that have versions, so the icons beside it shifted as you moved
 * between repositories.
 *
 * Now it is one element next to the title: a badge when there is nothing to
 * choose, the same badge as a trigger when there is.
 */
const duxt = useDuxtConfig();
const route = useRoute();

/**
 * Versions come from the resolved source manifest, so the control can only
 * offer what has a collection behind it, and only for the repository being
 * read — one project's versions say nothing about another's.
 *
 * `versions` in the config still wins where a label needs to read differently
 * from the URL segment.
 */
const versions = computed(() => {
  if (duxt.versions?.length) return duxt.versions;

  const sources = duxt.sources ?? [];
  const currentSource = sourceForPath(route.path, sources);

  return sources
    .filter((source) => source.version && source.repo === currentSource?.repo)
    .map((source) => ({
      label: source.version!,
      to: source.prefix || '/',
      description: source.isDefault ? 'default' : undefined
    }));
});

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
      <Badge
        variant="secondary"
        class="cursor-pointer gap-1 font-mono text-[10px] hover:bg-accent"
      >
        {{ current?.label ?? duxt.version }}
        <Icon name="lucide:chevron-down" class="size-3 opacity-60" />
      </Badge>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="start" class="w-44">
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

  <!-- Nothing to choose: the project's own version, stated rather than offered. -->
  <Badge
    v-else-if="duxt.version"
    variant="secondary"
    class="font-mono text-[10px]"
  >
    {{ duxt.version }}
  </Badge>
</template>
