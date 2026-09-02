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
  <!-- list-none explicitly: this renders inside .duxt-prose, whose ul rules
       would otherwise put a bullet in front of every file. -->
  <ul class="m-0 list-none space-y-0.5 p-0">
    <li v-for="entry in entries" :key="entry.name">
      <span class="flex items-center gap-2 py-0.5">
        <Icon
          v-if="isDirectory(entry)"
          name="lucide:folder"
          class="size-4 shrink-0 text-muted-foreground"
        />
        <Icon v-else :name="fileIcon(entry.name)" class="size-4 shrink-0" />

        <span
          :class="isDirectory(entry) ? 'font-medium' : 'text-muted-foreground'"
        >
          {{ entry.name.replace(/\/$/, '') }}
        </span>
      </span>

      <div v-if="entry.children?.length" class="ml-2 border-l pl-3.5">
        <DuxtFileTreeNodes :entries="entry.children" />
      </div>
    </li>
  </ul>
</template>
