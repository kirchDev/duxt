<script setup lang="ts">
/**
 * The shortcut sheet, on `?`.
 *
 * Its list is `duxtShortcuts`, the same array the handlers match against, so
 * the sheet cannot come to advertise a key nothing binds.
 */
const open = ref(false);
const duxt = useDuxtConfig();

onDuxtShortcut(
  (event) => matchesDuxtShortcut(duxt.shortcuts ?? [], 'help', event),
  () => (open.value = !open.value)
);
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
          v-for="shortcut in duxt.shortcuts"
          :key="`${shortcut.action}:${shortcut.key}`"
          class="flex items-center justify-between gap-4"
        >
          <span>{{ $t(shortcutLabel(shortcut.action)) }}</span>
          <span class="flex gap-1">
            <kbd
              v-for="key in shortcut.keys"
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
