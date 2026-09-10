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

/**
 * `badge` is the header's inline pill. `block` is the mobile sheet's: a
 * full-width control with its own caption, because in a column of navigation
 * rows a bare pill reads as a label rather than as something to press.
 */
const props = withDefaults(defineProps<{ variant?: 'badge' | 'block' }>(), {
  variant: 'badge'
});

const duxt = useDuxtConfig();
const path = useDuxtPath();
const localeLink = useDuxtLink();
const { collection, source } = useDuxtCollection();

/**
 * Versions come from the resolved source manifest, so the control can only
 * offer what has a collection behind it, and only for the repository being
 * read — one project's versions say nothing about another's. The list itself
 * is `useDuxtVersion`'s, because the sheet asks for it too — see
 * `versionChoices`.
 */
const { choices: versions } = useDuxtVersion();

/**
 * A changelog is one global history, so it deliberately has no version
 * selector. Its current release is still useful context, though: read the
 * latest one from the overview's generated frontmatter instead of falling
 * back to the site's package version. The parser writes that value while
 * turning the changelog into the overview and release pages.
 */
const changelog = computed(
  () =>
    source.value?.generated?.type === 'changelog' &&
    source.value.generated.versioning === 'global'
);

const { data: changelogPage } = await useAsyncData(
  () => `duxt-changelog-version-${collection.value}-${path.value}`,
  async () => {
    if (!changelog.value) return undefined;

    return (await queryCollection(collection.value as DuxtCollectionArg)
      .path(path.value)
      .first()) as { release?: string } | null;
  },
  { watch: [collection, path, changelog] }
);

const current = computed(() =>
  sourceForPath(
    path.value,
    versions.value.map((version) => ({ ...version, prefix: version.to ?? '' }))
  )
);

const label = computed(
  () => changelogPage.value?.release ?? current.value?.label ?? duxt.version
);

const { t, te } = useI18n();

/**
 * The caption beside an entry.
 *
 * The list carries a translation KEY where the layer wrote one
 * (`duxt.version.status.deprecated`) and a plain word where a consumer did, so
 * a key that resolves is translated and anything else is shown as written.
 * `asText` because the config type keeps `DuxtText` even though
 * `useDuxtConfig` has already collapsed it to a string.
 */
function caption(version: DuxtLink) {
  const value = asText(version.description);
  if (!value) return undefined;

  return te(value) ? t(value) : value;
}

/** Same page, other version: swap the prefix rather than jumping to its root. */
function pathIn(version: { to?: string }) {
  return localeLink(
    versionPath(path.value, current.value?.to, version.to ?? '/')
  );
}
</script>

<template>
  <UiDropdownMenu v-if="versions.length > 1">
    <!-- The trigger is a real <button>, with the Badge inside it. reka-ui puts
         `aria-haspopup` and `aria-expanded` on whatever element it is handed,
         and a <span> is allowed neither — which axe reports and a screen
         reader acts on. -->
    <UiDropdownMenuTrigger as-child>
      <!-- Built like shadcn's own large sidebar button: a square mark, then
           two lines, then the chevrons. The VERSION LEADS and the caption sits
           under it — the reverse of what this was, where the reader met the
           word "Version" before the number they came to read. The caption is
           the version's own lifecycle where it has one ("default",
           "maintenance"), because on a switcher that is the fact worth the
           second line; the label is what is left when it has none. -->
      <button
        v-if="props.variant === 'block'"
        type="button"
        class="flex w-full cursor-pointer items-center gap-2 rounded-md border p-2 text-left transition-colors hover:bg-accent"
      >
        <span
          class="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
        >
          <Icon name="lucide:git-branch" class="size-4" />
        </span>

        <span class="grid min-w-0 flex-1 leading-tight">
          <span class="truncate font-mono text-sm font-medium">
            {{ label }}
          </span>
          <span class="truncate text-xs text-muted-foreground">
            {{ (current && caption(current)) ?? $t('duxt.version.label') }}
          </span>
        </span>

        <Icon
          name="lucide:chevrons-up-down"
          class="size-4 shrink-0 text-muted-foreground"
        />
      </button>

      <button v-else type="button" class="cursor-pointer">
        <UiBadge
          variant="secondary"
          class="gap-1 font-mono text-[10px] hover:bg-accent"
        >
          {{ label }}
          <Icon name="lucide:chevron-down" class="size-3 opacity-60" />
        </UiBadge>
      </button>
    </UiDropdownMenuTrigger>

    <!-- A project with thirty versions would otherwise open a menu the height
         of the window: reka's available-height only stops it at the viewport
         edge. `min()` keeps that cap and adds a shorter one, so the list
         scrolls at about ten entries instead of filling the screen. -->
    <UiDropdownMenuContent
      align="start"
      class="max-h-[min(20rem,var(--reka-dropdown-menu-content-available-height))]"
      :class="
        props.variant === 'block'
          ? 'w-[var(--reka-dropdown-menu-trigger-width)]'
          : 'w-44'
      "
    >
      <UiDropdownMenuItem
        v-for="version in versions"
        :key="version.to"
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
            v-if="caption(version)"
            class="ml-auto text-xs text-muted-foreground"
          >
            {{ caption(version) }}
          </span>
        </NuxtLink>
      </UiDropdownMenuItem>
    </UiDropdownMenuContent>
  </UiDropdownMenu>

  <!-- Nothing to choose: the project's own version, stated rather than offered.
       Always the badge, `block` included — a bordered box with a caption and no
       control in it looks like a select that has stopped working, and the sheet
       puts this one beside the brand rather than in the switcher's strip. -->
  <UiBadge
    v-else-if="duxt.version"
    variant="secondary"
    class="font-mono text-[10px]"
  >
    {{ label }}
  </UiBadge>
</template>
