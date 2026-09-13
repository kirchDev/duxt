<script setup lang="ts">
/**
 * The shortcut sheet — on `?`, and on the control that opens it.
 *
 * It lists what `useDuxtShortcuts()` reports as live — the same list, under the
 * same policy, that the handlers bind — so it cannot advertise a key nothing
 * listens to.
 *
 * Its open state lives in `useDuxtShortcutSheet()` rather than in a `ref` here,
 * because `?` is no longer the only way in: `DuxtShortcutsTrigger` opens the
 * same sheet from the header, and on a site with
 * `shortcuts.singleCharacter: false` it is the only thing that can — there is
 * no `?` binding left.
 */
const { open } = useDuxtShortcutSheet();
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
