<script setup lang="ts">
const { duxt } = useAppConfig();
const colorMode = useColorMode();
const route = useRoute();

const { data: navigation } = await useAsyncData('duxt-navigation', () =>
  queryCollectionNavigation('docs')
);

// The mobile sheet shows the same branch the sidebar does.
const { items } = useDuxtSection(navigation);

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
}

function isActive(to?: string) {
  return Boolean(to && to !== '/' && route.path.startsWith(to));
}
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm"
  >
    <!-- Row one: identity and global links. Row two carries the sections, the
         way nuxt.com splits them — the docs tree never reaches this far up. -->
    <div
      class="mx-auto flex h-14 max-w-[90rem] items-center gap-4 px-4 lg:px-8"
    >
      <Sheet>
        <SheetTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="lg:hidden"
            aria-label="Open navigation"
          >
            <Icon name="lucide:menu" class="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" class="w-72 overflow-y-auto p-0">
          <SheetHeader>
            <SheetTitle>{{ duxt.title }}</SheetTitle>
          </SheetHeader>
          <div class="px-2 pb-6">
            <DuxtNavigation :items="items" />
          </div>
        </SheetContent>
      </Sheet>

      <NuxtLink
        to="/"
        class="flex items-center gap-2 text-[15px] font-semibold tracking-tight"
      >
        <Icon name="lucide:book-open-text" class="size-5 text-primary" />
        {{ duxt.title }}
        <Badge
          v-if="duxt.version"
          variant="secondary"
          class="ml-1 font-mono text-[10px]"
        >
          {{ duxt.version }}
        </Badge>
      </NuxtLink>

      <nav class="mx-auto hidden items-center gap-0.5 text-sm md:flex">
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
                :key="child.label"
                as-child
              >
                <NuxtLink
                  :to="child.to"
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
              :to="link.to"
              :target="link.external ? '_blank' : undefined"
            >
              {{ link.label }}
            </NuxtLink>
          </Button>
        </template>
      </nav>

      <div class="ml-auto flex items-center gap-0.5 md:ml-0">
        <Button
          v-for="link in duxt.links ?? []"
          :key="link.label"
          as-child
          variant="ghost"
          size="icon"
          :aria-label="link.label"
        >
          <a :href="link.to" target="_blank" rel="noopener">
            <Icon v-if="link.icon" :name="link.icon" class="size-4" />
          </a>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
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
