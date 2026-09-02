<script setup lang="ts">
import type { VNode } from 'vue';

interface Entry {
  name: string;
  children?: Entry[];
}

// `::file-tree` wraps a nested Markdown list. Rendering that list as-is gives
// bullets, not a tree — and no way to pick an icon per file. So the slot's
// vnodes are read back into a structure, which the node component renders with
// the right icon for each extension. A `tree` prop skips the parsing.
const props = defineProps<{ tree?: Entry[]; title?: string }>();

const slots = useSlots();

/** Text of a vnode subtree, ignoring any nested list. */
function textOf(node: VNode): string {
  if (typeof node.children === 'string') return node.children;
  if (!Array.isArray(node.children)) return '';

  return node.children
    .filter((child) => !isList(child as VNode))
    .map((child) =>
      typeof child === 'string'
        ? child
        : child && typeof child === 'object'
          ? textOf(child as VNode)
          : ''
    )
    .join('');
}

function nameOf(node: VNode): string | undefined {
  const type = node.type as { name?: string; __name?: string } | string;
  if (typeof type === 'string') return type;
  return type?.name ?? type?.__name;
}

function isList(node?: VNode): boolean {
  const name = node && nameOf(node);
  return (
    name === 'ul' || name === 'ol' || name === 'ProseUl' || name === 'ProseOl'
  );
}

function isItem(node?: VNode): boolean {
  const name = node && nameOf(node);
  return name === 'li' || name === 'ProseLi';
}

function childrenOf(node: VNode): VNode[] {
  if (Array.isArray(node.children)) return node.children.flat() as VNode[];

  const slot = (node.children as { default?: () => VNode[] } | null)?.default;
  return typeof slot === 'function' ? (slot().flat() as VNode[]) : [];
}

/** Walk a rendered list into entries; anything unexpected is skipped. */
function parse(nodes: VNode[]): Entry[] {
  const entries: Entry[] = [];

  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;

    if (isList(node) || node.type === Symbol.for('v-fgt')) {
      entries.push(...parse(childrenOf(node)));
      continue;
    }

    if (!isItem(node)) continue;

    const nested = childrenOf(node).find((child) => isList(child));
    const name = textOf(node).trim();
    if (!name) continue;

    entries.push(
      nested ? { name, children: parse(childrenOf(nested)) } : { name }
    );
  }

  return entries;
}

const entries = computed<Entry[]>(() => {
  if (props.tree?.length) return props.tree;

  try {
    return parse((slots.default?.() ?? []) as VNode[]);
  } catch {
    return [];
  }
});
</script>

<template>
  <div class="my-6 overflow-hidden rounded-lg border bg-card">
    <div
      v-if="title"
      class="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
    >
      <Icon name="lucide:folder-tree" class="size-4" />
      <span class="font-mono">{{ title }}</span>
    </div>

    <div class="p-4 font-mono text-sm">
      <DuxtFileTreeNodes v-if="entries.length" :entries="entries" />
      <!-- Parsing failed: show the author's list rather than nothing. -->
      <div v-else class="duxt-file-tree">
        <slot />
      </div>
    </div>
  </div>
</template>
