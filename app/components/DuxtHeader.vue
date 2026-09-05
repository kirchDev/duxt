<script setup lang="ts">
const duxt = useDuxtConfig();
const colorMode = useColorMode();
const path = useDuxtPath();
const localeLink = useDuxtLink();

const { data: navigation } = await useDuxtNavigation();

// The mobile sheet shows the same branch the sidebar does.
const { items } = useDuxtSection(navigation);

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
}

/** An entry with neither `to` nor children means "the documentation". */
function linkTarget(link: DuxtLink) {
  return link.to ?? duxt.sections?.[0]?.to ?? '/';
}

function isActive(to?: string) {
  return Boolean(to && to !== '/' && path.value.startsWith(to));
}

/** `page` for the page itself, `true` for the branch holding it. */
function current(to?: string) {
  if (path.value === to) return 'page';
  return isActive(to) ? 'true' : undefined;
}
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm"
  >
    <!-- Row one: identity and global links. Row two carries the sections, the
         way nuxt.com splits them — the docs tree never reaches this far up. -->
    <div
      class="mx-auto grid h-14 max-w-[90rem] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 lg:px-8"
    >
      <div class="flex items-center gap-2">
        <Sheet>
          <SheetTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="lg:hidden"
              :aria-label="$t('duxt.nav.open')"
            >
              <Icon name="lucide:menu" class="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            class="flex w-80 flex-col gap-0 overflow-y-auto p-0"
          >
            <SheetHeader class="border-b">
              <SheetTitle class="flex items-center gap-2">
                <Icon
                  name="lucide:book-open-text"
                  class="size-5 text-primary"
                />
                {{ duxt.title }}
              </SheetTitle>
            </SheetHeader>

            <!-- Everything the desktop header holds, in one scrollable column:
               the sections, the navbar links, then the docs tree. On a phone
               the second navbar row is hidden, so without this the sections
               are unreachable. -->
            <div class="flex-1 overflow-y-auto p-4">
              <p
                v-if="duxt.sections?.length"
                class="mb-2 text-xs font-medium text-muted-foreground"
              >
                {{ $t('duxt.nav.sections') }}
              </p>
              <ul v-if="duxt.sections?.length" class="mb-6 space-y-0.5 text-sm">
                <li v-for="section in duxt.sections" :key="section.label">
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

              <DuxtNavigation :items="items" />

              <div class="mt-6 border-t pt-4">
                <ul class="space-y-0.5 text-sm">
                  <template
                    v-for="link in duxt.navigation ?? []"
                    :key="link.label"
                  >
                    <li
                      v-for="entry in link.children ?? [link]"
                      :key="entry.label"
                    >
                      <NuxtLink
                        :to="localeLink(entry.to)"
                        :target="entry.external ? '_blank' : undefined"
                        class="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Icon
                          v-if="entry.icon"
                          :name="entry.icon"
                          class="size-4"
                        />
                        {{ entry.label }}
                        <Icon
                          v-if="entry.external"
                          name="lucide:arrow-up-right"
                          class="size-3 opacity-50"
                        />
                      </NuxtLink>
                    </li>
                  </template>
                </ul>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <NuxtLink
          :to="localeLink('/')"
          class="flex items-center gap-2 text-[15px] font-semibold tracking-tight"
        >
          <Icon name="lucide:book-open-text" class="size-5 text-primary" />
          {{ duxt.title }}
        </NuxtLink>
      </div>

      <nav
        class="hidden items-center gap-0.5 text-sm md:flex"
        :aria-label="$t('duxt.nav.main')"
      >
        <template v-for="link in duxt.navigation" :key="link.label">
          <DropdownMenu v-if="link.children?.length">
            <DropdownMenuTrigger as-child>
              <Button
                variant="ghost"
                size="sm"
                class="gap-1.5 font-medium text-muted-foreground"
              >
                {{ link.label }}
                <Icon name="lucide:chevron-down" class="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" class="w-64">
              <DropdownMenuItem
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
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            v-else
            as-child
            variant="ghost"
            size="sm"
            class="font-medium"
            :class="
              isActive(link.to) ? 'text-foreground' : 'text-muted-foreground'
            "
          >
            <NuxtLink
              :to="localeLink(link.to)"
              :target="link.external ? '_blank' : undefined"
            >
              {{ link.label }}
            </NuxtLink>
          </Button>
        </template>
      </nav>

      <div class="flex items-center justify-end gap-2">
        <!-- Beside the search rather than the title: one version control, and
             the icons to its right keep their place because it is always
             rendered — as a badge where there is nothing to choose. -->
        <DuxtVersion />
        <div class="hidden sm:block">
          <DuxtSearch />
        </div>

        <Button
          v-for="link in duxt.links ?? []"
          :key="link.to"
          as-child
          variant="ghost"
          size="icon"
          :aria-label="link.label"
        >
          <a :href="link.to" target="_blank" rel="noopener">
            <Icon v-if="link.icon" :name="link.icon" class="size-4" />
          </a>
        </Button>

        <DuxtLocale />

        <Button
          variant="ghost"
          size="icon"
          :aria-label="$t('duxt.theme.toggle')"
          @click="toggleTheme"
        >
          <Icon
            :name="colorMode.value === 'dark' ? 'lucide:sun' : 'lucide:moon'"
            class="size-4"
          />
        </Button>
      </div>
    </div>
  </header>
</template>
