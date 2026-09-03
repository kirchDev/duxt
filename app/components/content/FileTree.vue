<script setup lang="ts">
import { TreeItem, TreeRoot } from 'reka-ui';

interface Entry {
  name: string;
  children?: Entry[];
}

// `::file-tree` with a `tree` prop. Built on Reka UI's Tree rather than
// hand-rolled `<ul>` recursion, so it comes with roving focus, arrow-key
// navigation, expand and collapse, and the ARIA roles a tree needs — all of
// which the hand-rolled version had none of.
const props = defineProps<{ tree?: Entry[]; title?: string }>();

const items = computed(() => props.tree ?? []);

const isDirectory = (entry: Entry) =>
  Boolean(entry.children?.length) || entry.name.endsWith('/');

const label = (entry: Entry) => entry.name.replace(/\/$/, '');

/** Unique per node: names repeat across branches, paths do not. */
function key(entry: Entry) {
  return entry.name;
}

/** Everything open on first render — a docs tree is there to be read, not explored. */
const expanded = computed(() => {
  const keys: string[] = [];

  const walk = (entries: Entry[]) => {
    for (const entry of entries) {
      if (entry.children?.length) {
        keys.push(key(entry));
        walk(entry.children);
      }
    }
  };

  walk(items.value);
  return keys;
});
</script>

<template>
  <div class="not-typeset my-6 overflow-hidden rounded-lg border bg-card">
    <div
      v-if="title"
      class="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
    >
      <Icon name="lucide:folder-tree" class="size-4" />
      <span class="font-mono">{{ title }}</span>
    </div>

    <TreeRoot
      v-slot="{ flattenItems }"
      :items="items"
      :get-key="key"
      :get-children="(entry: Entry) => entry.children"
      :default-expanded="expanded"
      class="p-3 font-mono text-[13px] leading-6 select-none"
    >
      <TreeItem
        v-for="item in flattenItems"
        v-slot="{ isExpanded }"
        :key="item._id"
        v-bind="item.bind"
        :style="{ paddingLeft: `${item.level - 1}rem` }"
        class="flex items-center gap-1.5 rounded px-1 py-[3px] outline-none focus:bg-accent data-[selected]:bg-accent/60"
      >
        <template v-if="isDirectory(item.value)">
          <Icon
            name="lucide:chevron-right"
            class="size-3 shrink-0 text-muted-foreground transition-transform"
            :class="{ 'rotate-90': isExpanded }"
          />
          <Icon
            :name="isExpanded ? 'lucide:folder-open' : 'lucide:folder'"
            class="size-4 shrink-0 text-muted-foreground/70"
          />
          <span class="text-foreground">{{ label(item.value) }}</span>
        </template>

        <template v-else>
          <span class="w-3 shrink-0" />
          <Icon :name="fileIcon(item.value.name)" class="size-4 shrink-0" />
          <span class="text-muted-foreground">{{ label(item.value) }}</span>
        </template>
      </TreeItem>
    </TreeRoot>
  </div>
</template>
