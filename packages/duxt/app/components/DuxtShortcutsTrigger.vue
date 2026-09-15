<script setup lang="ts">
/**
 * The visible way into the shortcut sheet.
 *
 * `?` opens the sheet, and a reader can only press `?` if they already know the
 * sheet is there — which is the whole discoverability problem, and one no
 * keystroke can solve for itself. So the keys get a control: an icon beside the
 * search, in the header, on every page.
 *
 * It draws the key it duplicates rather than restating it, and draws nothing
 * where `shortcuts.singleCharacter: false` has unbound `?` — in which case this
 * button is not a shortcut for the sheet, it is the only door to it.
 */
defineOptions({
  inheritAttrs: false
});

const { open } = useDuxtShortcutSheet();
const { hint } = useDuxtShortcuts();
const helpHint = computed(() => hint('help'));
</script>

<template>
  <UiTooltip>
    <UiTooltipTrigger as-child>
      <UiButton
        v-bind="$attrs"
        variant="ghost"
        size="icon"
        :aria-label="$t('duxt.shortcuts.open')"
        :aria-keyshortcuts="helpHint"
        @click="open = !open"
      >
        <Icon name="lucide:keyboard" class="size-4" />
      </UiButton>
    </UiTooltipTrigger>

    <UiTooltipContent side="bottom" class="flex items-center gap-2">
      {{ $t('duxt.shortcuts.open') }}
      <kbd
        v-if="helpHint"
        aria-hidden="true"
        class="rounded border border-neutral-50/25 px-1.5 font-mono text-[10px]"
      >
        {{ helpHint }}
      </kbd>
    </UiTooltipContent>
  </UiTooltip>
</template>
