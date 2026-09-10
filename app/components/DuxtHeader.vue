<script setup lang="ts">
const duxt = useDuxtConfig();
const colorMode = useColorMode();
const path = useDuxtPath();
const localeLink = useDuxtLink();

const { data: navigation } = await useDuxtNavigation();

// Nitro's HTML crawler treats v0.1.0 as a file with extension .0 and skips it.
// Register known pages explicitly so their HTML and Nuxt payloads are emitted.
if (import.meta.prerender) {
  prerenderRoutes(
    navigationPagePaths(navigation.value ?? []).map((path) => localeLink(path)!)
  );
}

// The mobile sheet shows the same branch the sidebar does.
const { items } = useDuxtSection(navigation);

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
}

/**
 * An entry with neither `to` nor children means "the documentation".
 *
 * The layer's own "Docs" entry ships without a `to` on purpose: where the
 * documentation lives depends on the consumer's prefixes, which the layer
 * cannot know. Resolving it to the first section here is what makes the default
 * navbar work on a versioned site and on a flat one alike — and every place
 * that renders a navigation entry has to go through this, or the entry renders
 * as an anchor with no href.
 */
function linkTarget(link: DuxtLink) {
  return link.to ?? duxt.sections?.[0]?.to ?? '/';
}

function isActive(to?: string) {
  return Boolean(to && to !== '/' && path.value.startsWith(to));
}

/**
 * Whether a navbar entry owns the page — which for "the documentation" is not
 * the same question as whether its href matches.
 *
 * A `to`-less entry resolves to the FIRST section so the link goes somewhere,
 * and reusing that resolved href for the highlight was wrong: it lit "Docs"
 * only inside section one and left the navbar showing nothing at all on every
 * other section, which is exactly where a reader most needs to see where they
 * are. Such an entry stands for the whole documentation, so it is active
 * wherever ANY section is.
 */
function entryActive(link: DuxtLink) {
  if (link.to) return isActive(link.to);

  // THE ROOT AREA'S sections, not every entry the site declared: a to-less
  // entry stands for the documentation, and on a site with a second source the
  // list also holds that source's parts — which would light "Docs" on a page
  // that is not documentation at all, beside the entry that really owns it.
  return sectionsForPath(
    duxt.sections ?? [],
    duxt.resolvedSources ?? [],
    '/'
  ).some((section) => isActive(section.to));
}

/**
 * The sheet is controlled so that navigating closes it.
 *
 * Watching the route rather than binding a close to every link: the sheet holds
 * four kinds of them — the navbar entries, their children, the sections, and
 * `DuxtNavigation`'s whole tree — and that last one also renders in the desktop
 * sidebar, where a `SheetClose` has no dialog to talk to. One watcher covers
 * them all, and leaves an external link (which does not move the route) alone.
 */
// Whether the version is something to pick or something to state — it decides
// where the sheet puts it, so the sheet has to ask before it renders either.
const { switchable } = useDuxtVersion();

const sheetOpen = ref(false);
const route = useRoute();

watch(
  () => route.fullPath,
  () => {
    sheetOpen.value = false;
  }
);

// One tree instead of two lists: the sections become children of the entry
// that stands for the documentation. See `buildSheetNavigation`.
const sheet = computed(() =>
  buildSheetNavigation(duxt.navigation, duxt.sections, duxt.resolvedSources)
);

/** A group owns the page when any of its children does. */
function groupActive(link: DuxtLink) {
  return (link.children ?? []).some((child) => isActive(child.to));
}

/**
 * Which navigation groups in the sheet are open.
 *
 * Controlled rather than `default-open`, for the reason `DuxtNavigation`
 * spells out: the initial value is read once, so a group the reader lands
 * inside would stay shut. A group they close by hand stays closed, because the
 * route only ever forces one open.
 */
const openGroups = ref<Record<string, boolean>>({});

watchEffect(() => {
  for (const entry of sheet.value.entries) {
    const key = asText(entry.label);
    if (key && entry.children?.length && groupActive(entry)) {
      openGroups.value[key] = true;
    }
  }
});

function groupOpen(link: DuxtLink) {
  return openGroups.value[asText(link.label) ?? ''] ?? false;
}

function setGroupOpen(link: DuxtLink, value: boolean) {
  openGroups.value[asText(link.label) ?? ''] = value;
}

/** `page` for the page itself, `true` for the branch holding it. */
function current(to?: string) {
  if (path.value === to) return 'page';
  return isActive(to) ? 'true' : undefined;
}
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md"
  >
    <!-- Row one: identity and global links. Row two carries the sections, the
         way nuxt.com splits them — the docs tree never reaches this far up. -->
    <div
      class="mx-auto grid h-14 max-w-[90rem] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 lg:grid-cols-[1fr_auto_1fr] lg:px-8"
    >
      <div class="flex items-center gap-2">
        <UiSheet v-model:open="sheetOpen">
          <UiSheetTrigger as-child>
            <UiButton
              variant="ghost"
              size="icon"
              class="lg:hidden"
              :aria-label="$t('duxt.nav.open')"
            >
              <Icon name="lucide:menu" class="size-5" />
            </UiButton>
          </UiSheetTrigger>
          <UiSheetContent side="left" class="flex w-80 flex-col gap-0 p-0">
            <UiSheetHeader class="border-b pr-14">
              <UiSheetTitle class="flex items-center gap-2">
                <DuxtBrand />

                <!-- One version and no choice: a fact about the project, so it
                     sits with the identity as a badge rather than filling a
                     strip of its own with a control that cannot be used. Only
                     text, so a heading may hold it. -->
                <span v-if="!switchable" class="sm:hidden">
                  <DuxtVersion />
                </span>
              </UiSheetTitle>
            </UiSheetHeader>

            <!-- Its own strip under the header rather than beside the brand:
                 the close button owns that corner, and the version is a control
                 the reader operates, not part of the identity. -->
            <div v-if="switchable" class="border-b p-4 sm:hidden">
              <DuxtVersion variant="block" />
            </div>

            <!-- Everything the desktop header holds, in one scrollable column,
                 widest first: the navbar links, then the sections, then the
                 tree of the section you are in. On a phone the second navbar
                 row is hidden, so without this the sections are unreachable. -->
            <div class="flex-1 overflow-y-auto p-4">
              <template v-if="sheet.entries.length || duxt.links?.length">
                <p
                  class="mb-2 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                >
                  {{ $t('duxt.nav.menu') }}
                </p>
                <ul class="space-y-0.5 text-sm">
                  <li v-for="link in sheet.entries" :key="asText(link.label)">
                    <!-- A group opens in place rather than flattening into its
                         parent's list: on the desktop it is a dropdown, and
                         spilling its five links between "Docs" and "Credits"
                         lost both the grouping and its name. -->
                    <UiCollapsible
                      v-if="link.children?.length"
                      :open="groupOpen(link)"
                      @update:open="(value) => setGroupOpen(link, value)"
                    >
                      <UiCollapsibleTrigger
                        class="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors w-full cursor-pointer hover:bg-accent"
                        :class="
                          groupActive(link)
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        "
                      >
                        <Icon
                          v-if="link.icon"
                          :name="link.icon"
                          class="size-4"
                        />
                        <span class="truncate">{{ link.label }}</span>
                        <Icon
                          name="lucide:chevron-right"
                          class="ml-auto size-3.5 transition-transform group-data-[state=open]:rotate-90"
                        />
                      </UiCollapsibleTrigger>

                      <UiCollapsibleContent>
                        <ul class="mt-0.5 ml-3.5 space-y-0.5 border-l pl-2.5">
                          <li
                            v-for="child in link.children"
                            :key="child.to ?? asText(child.label)"
                          >
                            <NuxtLink
                              :to="localeLink(child.to)"
                              :target="child.external ? '_blank' : undefined"
                              :aria-current="current(child.to)"
                              class="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
                              :class="
                                isActive(child.to)
                                  ? 'bg-accent font-medium text-foreground'
                                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                              "
                            >
                              <Icon
                                v-if="child.icon"
                                :name="child.icon"
                                class="size-4"
                              />
                              {{ child.label }}
                              <Icon
                                v-if="child.external"
                                name="lucide:arrow-up-right"
                                class="size-3 opacity-50"
                              />
                            </NuxtLink>
                          </li>
                        </ul>
                      </UiCollapsibleContent>
                    </UiCollapsible>

                    <NuxtLink
                      v-else
                      :to="localeLink(linkTarget(link))"
                      :target="link.external ? '_blank' : undefined"
                      :aria-current="current(link.to)"
                      class="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
                      :class="
                        entryActive(link)
                          ? 'bg-accent font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      "
                    >
                      <Icon v-if="link.icon" :name="link.icon" class="size-4" />
                      {{ link.label }}
                      <Icon
                        v-if="link.external"
                        name="lucide:arrow-up-right"
                        class="size-3 opacity-50"
                      />
                    </NuxtLink>
                  </li>

                  <!-- Hidden from the row below lg, so this is the only place
                       they are left. -->
                  <li v-for="link in duxt.links ?? []" :key="link.to">
                    <a
                      :href="link.to"
                      target="_blank"
                      rel="noopener"
                      class="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Icon v-if="link.icon" :name="link.icon" class="size-4" />
                      {{ link.label }}
                      <Icon
                        name="lucide:arrow-up-right"
                        class="size-3 opacity-50"
                      />
                    </a>
                  </li>
                </ul>
              </template>

              <!-- Only what no entry took — see `buildSheetNavigation`. -->
              <template v-if="sheet.sections.length">
                <p
                  class="mt-6 mb-2 border-t px-2 pt-4 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase first:mt-0 first:border-t-0 first:pt-0"
                >
                  {{ $t('duxt.nav.sections') }}
                </p>
                <ul class="space-y-0.5 text-sm">
                  <!-- Keyed on the URL, as the desktop row is: two sources may
                       name a section the same, and a label is not unique. -->
                  <li
                    v-for="section in sheet.sections"
                    :key="section.to ?? asText(section.label)"
                  >
                    <NuxtLink
                      :to="localeLink(section.to)"
                      :aria-current="current(section.to)"
                      class="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
                      :class="
                        isActive(section.to)
                          ? 'bg-accent font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      "
                    >
                      <Icon
                        v-if="section.icon"
                        :name="section.icon"
                        class="size-4"
                      />
                      {{ section.label }}
                    </NuxtLink>
                  </li>
                </ul>
              </template>

              <template v-if="path !== '/' && items.length">
                <p
                  class="mt-6 mb-2 border-t px-2 pt-4 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase first:mt-0 first:border-t-0 first:pt-0"
                >
                  {{ $t('duxt.nav.pages') }}
                </p>
                <!-- No `label`, so no second "Documentation" landmark: the
                     sheet is a dialog with its own name, and the sidebar copy
                     of this tree already carries the one on the page. -->
                <DuxtNavigation :items="items" />
              </template>
            </div>

            <!-- Below sm the row keeps only the brand, the burger and the
                 search, so the two settings live here. `mt-auto` on SheetFooter
                 parks them at the bottom while the tree above scrolls. -->
            <UiSheetFooter
              class="flex-row items-center justify-center gap-2 border-t sm:hidden"
            >
              <DuxtLocale />

              <UiButton
                variant="ghost"
                size="icon"
                :aria-label="$t('duxt.theme.toggle')"
                @click="toggleTheme"
              >
                <Icon
                  :name="
                    colorMode.value === 'dark' ? 'lucide:sun' : 'lucide:moon'
                  "
                  class="size-4"
                />
              </UiButton>
            </UiSheetFooter>
          </UiSheetContent>
        </UiSheet>

        <NuxtLink
          :to="localeLink('/')"
          class="flex items-center gap-2 text-[15px] font-semibold tracking-tight"
        >
          <DuxtBrand />
        </NuxtLink>
      </div>

      <!-- One middle column, two occupants. The links go at the same width the
           burger arrives at, so the sheet is never a second copy of a row that
           is still on screen; the search takes the space they leave, because on
           a narrow screen it is the navigation. -->
      <div class="flex min-w-0 items-center justify-center">
        <nav
          class="hidden items-center gap-0.5 text-sm lg:flex"
          :aria-label="$t('duxt.nav.main')"
        >
          <template v-for="link in duxt.navigation" :key="link.label">
            <UiDropdownMenu v-if="link.children?.length">
              <UiDropdownMenuTrigger as-child>
                <UiButton
                  variant="ghost"
                  size="sm"
                  class="gap-1.5 font-medium text-muted-foreground"
                >
                  {{ link.label }}
                  <Icon
                    name="lucide:chevron-down"
                    class="size-3.5 opacity-60"
                  />
                </UiButton>
              </UiDropdownMenuTrigger>
              <UiDropdownMenuContent align="center" class="w-64">
                <UiDropdownMenuItem
                  v-for="child in link.children"
                  :key="child.to"
                  as-child
                >
                  <NuxtLink
                    :to="localeLink(child.to)"
                    :target="child.external ? '_blank' : undefined"
                    class="flex items-start gap-2.5"
                  >
                    <Icon
                      v-if="child.icon"
                      :name="child.icon"
                      class="mt-0.5 size-4 shrink-0"
                    />
                    <span class="min-w-0">
                      <span class="block font-medium">{{ child.label }}</span>
                      <span
                        v-if="child.description"
                        class="block text-xs text-muted-foreground"
                      >
                        {{ child.description }}
                      </span>
                    </span>
                  </NuxtLink>
                </UiDropdownMenuItem>
              </UiDropdownMenuContent>
            </UiDropdownMenu>

            <UiButton
              v-else
              as-child
              variant="ghost"
              size="sm"
              class="font-medium"
              :class="
                entryActive(link) ? 'text-foreground' : 'text-muted-foreground'
              "
            >
              <NuxtLink
                :to="localeLink(linkTarget(link))"
                :target="link.external ? '_blank' : undefined"
              >
                {{ link.label }}
              </NuxtLink>
            </UiButton>
          </template>
        </nav>

        <div class="w-full max-w-md lg:hidden">
          <DuxtSearch />
        </div>
      </div>

      <div class="flex items-center justify-end gap-2">
        <!-- Beside the search rather than the title, and rendered even where
             there is nothing to choose — as a badge — so the icons to its right
             keep their place. Below sm the sheet's header carries it instead;
             `v-if` here because an empty wrapper would still eat a gap. -->
        <div v-if="duxt.version" class="hidden sm:block">
          <DuxtVersion />
        </div>
        <div class="hidden w-56 lg:block">
          <DuxtSearch />
        </div>

        <!-- The project links give way first: they are the only icons here the
             sheet can carry as ordinary rows, where the locale and the theme
             are controls that have to stay reachable in one tap. -->
        <UiButton
          v-for="link in duxt.links ?? []"
          :key="link.to"
          as-child
          variant="ghost"
          size="icon"
          class="hidden lg:inline-flex"
          :aria-label="link.label"
        >
          <a :href="link.to" target="_blank" rel="noopener">
            <Icon v-if="link.icon" :name="link.icon" class="size-4" />
          </a>
        </UiButton>

        <div class="hidden sm:block">
          <DuxtLocale />
        </div>

        <UiButton
          variant="ghost"
          size="icon"
          class="hidden sm:inline-flex"
          :aria-label="$t('duxt.theme.toggle')"
          @click="toggleTheme"
        >
          <Icon
            :name="colorMode.value === 'dark' ? 'lucide:sun' : 'lucide:moon'"
            class="size-4"
          />
        </UiButton>
      </div>
    </div>
  </header>
</template>
