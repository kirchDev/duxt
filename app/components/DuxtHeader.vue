<script setup lang="ts">
const { duxt } = useAppConfig();
const colorMode = useColorMode();
const route = useRoute();

const { data: navigation } = await useAsyncData('duxt-navigation', () =>
  queryCollectionNavigation('docs')
);

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
}

function isActive(to?: string) {
  return to && to !== '/' && route.path.startsWith(to);
}
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
  >
    <div class="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
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
        <SheetContent side="left" class="w-72 overflow-y-auto p-6">
          <SheetHeader class="p-0">
            <SheetTitle>{{ duxt.title }}</SheetTitle>
          </SheetHeader>
          <DuxtNavigation :items="navigation ?? []" class="mt-6" />
        </SheetContent>
      </Sheet>

      <NuxtLink
        to="/"
        class="flex items-center gap-2 font-semibold tracking-tight"
      >
        <Icon name="lucide:book-open-text" class="size-5" />
        {{ duxt.title }}
      </NuxtLink>

      <nav class="hidden items-center gap-1 text-sm md:flex">
        <template v-for="link in duxt.navigation" :key="link.label">
          <!-- An entry with children becomes a dropdown; without, a plain link. -->
          <DropdownMenu v-if="link.children?.length">
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="sm" class="gap-1.5 font-normal">
                <Icon v-if="link.icon" :name="link.icon" class="size-4" />
                {{ link.label }}
                <Icon name="lucide:chevron-down" class="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="w-64">
              <DropdownMenuItem
                v-for="child in link.children"
                :key="child.label"
                as-child
              >
                <NuxtLink
                  :to="child.to"
                  :target="child.external ? '_blank' : undefined"
                  class="flex items-start gap-2"
                >
                  <Icon
                    v-if="child.icon"
                    :name="child.icon"
                    class="mt-0.5 size-4 shrink-0"
                  />
                  <span>
                    <span class="block">{{ child.label }}</span>
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
            class="gap-1.5 font-normal"
          >
            <NuxtLink
              :to="link.to"
              :target="link.external ? '_blank' : undefined"
              :class="
                isActive(link.to) ? 'text-foreground' : 'text-muted-foreground'
              "
            >
              <Icon v-if="link.icon" :name="link.icon" class="size-4" />
              {{ link.label }}
            </NuxtLink>
          </Button>
        </template>
      </nav>

      <div class="ml-auto flex items-center gap-1">
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
