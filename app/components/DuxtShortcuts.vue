<script setup lang="ts">
/**
 * The shortcut sheet, on `?`.
 *
 * Its list is `duxtShortcuts`, the same array the handlers match against, so
 * the sheet cannot come to advertise a key nothing binds.
 */
const open = ref(false);

onDuxtShortcut(
  (event) => event.key === '?' && !event.metaKey && !event.ctrlKey,
  () => (open.value = !open.value)
);
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{{ $t('duxt.shortcuts.title') }}</DialogTitle>
        <DialogDescription class="sr-only">
          {{ $t('duxt.shortcuts.title') }}
        </DialogDescription>
      </DialogHeader>

      <ul class="flex flex-col gap-2 text-sm">
        <li
          v-for="shortcut in duxtShortcuts"
          :key="shortcut.label"
          class="flex items-center justify-between gap-4"
        >
          <span>{{ $t(shortcut.label) }}</span>
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
    </DialogContent>
  </Dialog>
</template>
