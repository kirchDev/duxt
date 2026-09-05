<script setup lang="ts">
/**
 * The language switcher, built like DuxtVersion beside it: nothing at all when
 * there is only one choice, a dropdown when there are several. A single-locale
 * consumer therefore never sees that duxt speaks seven languages.
 *
 * `switchLocalePath` rather than a link to the locale's root — switching
 * language on a page about deploying should land on that same page in the new
 * language, not throw the reader back to the front door.
 */
const { locale, locales } = useI18n();
const switchLocalePath = useSwitchLocalePath();

const available = computed(() =>
  locales.value.map((entry) => ({
    code: entry.code,
    // Falls back to the code so a consumer's own locale still reads as
    // something rather than rendering blank when it declares no `name`.
    label: entry.name ?? entry.code,
    flag: flagFor(entry.code)
  }))
);

const current = computed(() =>
  available.value.find((entry) => entry.code === locale.value)
);

/**
 * `flag:xx-4x3`, from the region half of the code — the same derivation the
 * icon client bundle in nuxt.config.ts uses, so every flag this renders is one
 * that was inlined at build time.
 *
 * Null for a locale that names no region (`ja`, `he`): there is no country to
 * show, and a flag guessed from a language is wrong more often than it is
 * right. The dropdown then simply shows the name.
 */
function flagFor(code: string): string | null {
  const region = code.split('-')[1];
  return region && /^[a-z]{2}$/i.test(region)
    ? `flag:${region.toLowerCase()}-4x3`
    : null;
}
</script>

<template>
  <DropdownMenu v-if="available.length > 1">
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        :aria-label="$t('duxt.locale.switch')"
      >
        <Icon
          v-if="current?.flag"
          :name="current.flag"
          class="size-4 rounded-[2px]"
        />
        <Icon v-else name="lucide:languages" class="size-4" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" class="w-48">
      <DropdownMenuItem v-for="entry in available" :key="entry.code" as-child>
        <NuxtLink
          :to="switchLocalePath(entry.code)"
          class="flex items-center gap-2"
        >
          <Icon
            v-if="entry.flag"
            :name="entry.flag"
            class="size-4 shrink-0 rounded-[2px]"
          />
          <span class="truncate text-sm">{{ entry.label }}</span>
          <Icon
            name="lucide:check"
            class="ml-auto size-3.5 shrink-0"
            :class="entry.code === locale ? '' : 'opacity-0'"
          />
        </NuxtLink>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
