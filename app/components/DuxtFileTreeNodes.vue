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
  <ul class="m-0 list-none space-y-0 p-0">
    <li v-for="entry in entries" :key="entry.name" class="relative">
      <span class="flex items-center gap-1.5 py-[3px]">
        <Icon
          v-if="isDirectory(entry)"
          name="lucide:folder"
          class="size-3.5 shrink-0 text-muted-foreground/70"
        />
        <Icon v-else :name="fileIcon(entry.name)" class="size-3.5 shrink-0" />

        <span
          :class="
            isDirectory(entry) ? 'text-foreground' : 'text-muted-foreground'
          "
        >
          {{ entry.name.replace(/\/$/, '') }}
        </span>
      </span>

      <!-- The rule lines up under the folder icon, so the indent reads as
           containment rather than as an arbitrary offset. -->
      <div
        v-if="entry.children?.length"
        class="ml-[7px] border-l border-border/60 pl-[13px]"
      >
        <DuxtFileTreeNodes :entries="entry.children" />
      </div>
    </li>
  </ul>
</template>
