<script setup lang="ts">
interface Entry {
  name: string;
  children?: Entry[];
}

defineProps<{ entries: Entry[] }>();

// A trailing slash, or having children, marks a directory — the only thing a
// docs author has to remember.
const isDirectory = (entry: Entry) =>
  Boolean(entry.children?.length) || entry.name.endsWith('/');
</script>

<template>
  <ul class="space-y-1">
    <li v-for="entry in entries" :key="entry.name">
      <span class="flex items-center gap-2">
        <Icon
          v-if="isDirectory(entry)"
          :name="folderIcon(Boolean(entry.children?.length))"
          class="size-4 shrink-0 text-muted-foreground"
        />
        <Icon v-else :name="fileIcon(entry.name)" class="size-4 shrink-0" />

        <span
          :class="isDirectory(entry) ? 'font-medium' : 'text-muted-foreground'"
        >
          {{ entry.name.replace(/\/$/, '') }}
        </span>
      </span>

      <div v-if="entry.children?.length" class="mt-1 ml-2 border-l pl-4">
        <DuxtFileTreeNodes :entries="entry.children" />
      </div>
    </li>
  </ul>
</template>
