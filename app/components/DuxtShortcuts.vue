<script setup lang="ts">
/**
 * The shortcut sheet, on `?`.
 *
 * It lists what `useDuxtShortcuts()` reports as live — the same list, under the
 * same policy, that the handlers bind — so it cannot advertise a key nothing
 * listens to. A site with `shortcuts.singleCharacter: false` binds no `?`, and
 * the sheet then opens only from whatever visible control a site gives it.
 */
const open = ref(false);
const { shortcuts, keys, on } = useDuxtShortcuts();

on('help', () => (open.value = !open.value));
</script>

<template>
  <UiDialog v-model:open="open">
    <UiDialogContent class="sm:max-w-sm">
      <UiDialogHeader>
        <UiDialogTitle>{{ $t('duxt.shortcuts.title') }}</UiDialogTitle>
        <UiDialogDescription class="sr-only">
          {{ $t('duxt.shortcuts.title') }}
        </UiDialogDescription>
      </UiDialogHeader>

      <ul class="flex flex-col gap-2 text-sm">
        <li
          v-for="shortcut in shortcuts"
          :key="shortcut.action"
          class="flex items-center justify-between gap-4"
        >
          <span>{{ $t(shortcut.label) }}</span>
          <span class="flex gap-1">
            <kbd
              v-for="key in keys(shortcut)"
              :key="key"
              class="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs"
            >
              {{ key }}
            </kbd>
          </span>
        </li>
      </ul>
    </UiDialogContent>
  </UiDialog>
</template>
