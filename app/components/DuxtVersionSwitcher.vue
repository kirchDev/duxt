<script setup lang="ts">
// The version switcher. Versions come from the config rather than from the
// collections, because content.config.ts runs in its own load pass and the app
// never sees its result — a consumer declares the list once and both halves
// read it.
const duxt = useDuxtConfig();
const route = useRoute();

const versions = computed(() => duxt.versions ?? []);

/** The version whose prefix the current path starts with, else the default. */
const current = computed(
  () =>
    versions.value.find(
      (v) => v.to && v.to !== '/' && route.path.startsWith(v.to)
    ) ??
    versions.value.find((v) => v.to === '/') ??
    versions.value[0]
);

/** Same page, other version: swap the prefix rather than jumping to its root. */
function pathIn(version: { to?: string }) {
  const from = current.value?.to;
  const rest =
    from && from !== '/' && route.path.startsWith(from)
      ? route.path.slice(from.length)
      : route.path;

  const target = version.to ?? '/';
  return target === '/' ? rest || '/' : `${target}${rest}`;
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
