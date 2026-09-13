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
 * Closing the menu returns focus to a trigger that the pointer may still be
 * resting on. Without this guard reka immediately opens its tooltip again.
 * Keep it absent until the pointer has genuinely left, matching Gildstone's
 * dropdown-backed sidebar buttons.
 */
const localeTooltipSuppressed = ref(false);

function handleOpenChange(isOpen: boolean): void {
  if (!isOpen) localeTooltipSuppressed.value = true;
}

function clearTooltipSuppression(): void {
  localeTooltipSuppressed.value = false;
}

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
  <UiDropdownMenu v-if="available.length > 1" @update:open="handleOpenChange">
    <!-- The tooltip-aware button forwards this trigger's attrs to its real
         button, exactly as Gildstone's SidebarMenuButton does. -->
    <UiDropdownMenuTrigger as-child>
      <DuxtLocaleTrigger
        :flag="current?.flag"
        :label="$t('duxt.locale.switch')"
        :tooltip="
          localeTooltipSuppressed ? undefined : $t('duxt.locale.switch')
        "
        @pointerleave="clearTooltipSuppression"
      />
    </UiDropdownMenuTrigger>

    <UiDropdownMenuContent
      align="end"
      class="max-h-[min(20rem,var(--reka-dropdown-menu-content-available-height))] w-48"
    >
      <UiDropdownMenuItem v-for="entry in available" :key="entry.code" as-child>
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
            class="ms-auto size-3.5 shrink-0"
            :class="entry.code === locale ? '' : 'opacity-0'"
          />
        </NuxtLink>
      </UiDropdownMenuItem>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
