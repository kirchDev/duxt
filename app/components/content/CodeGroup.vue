<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';

/**
 * Several fences, one block, one tab each.
 *
 * `::code-group` around a run of fenced blocks. The label of each tab is the
 * fence's own filename — ```ts [nuxt.config.ts] — because that is what a reader
 * is choosing between, and it is already written.
 *
 * The children are read from the default slot's VNodes rather than registered
 * by a child component: a fence is a `ProsePre`, not something this block can
 * ask to announce itself, and its filename is a prop on that VNode.
 */
const slots = useSlots();

interface Entry {
  value: string;
  label: string;
  node: VNode;
}

const entries = computed<Entry[]>(() => {
  const nodes = (slots.default?.() ?? []).flatMap((node) =>
    Array.isArray(node.children) && typeof node.type === 'symbol'
      ? (node.children as VNode[])
      : [node]
  );

  return nodes
    .filter((node) => typeof node.type === 'object')
    .map((node, index) => {
      const props = (node.props ?? {}) as {
        filename?: string;
        language?: string;
      };

      return {
        value: `code-${index}`,
        label: props.filename ?? props.language ?? `${index + 1}`,
        node
      };
    });
});

const active = ref('code-0');

watchEffect(() => {
  if (!entries.value.some((entry) => entry.value === active.value)) {
    active.value = entries.value[0]?.value ?? 'code-0';
  }
});
</script>

<template>
  <TabsRoot v-model="active" class="my-6 overflow-hidden rounded-lg border">
    <TabsList
      class="flex gap-1 border-b bg-muted/40 px-2"
      :aria-label="$t('duxt.page.tabs') as string"
    >
      <TabsTrigger
        v-for="entry in entries"
        :key="entry.value"
        :value="entry.value"
        class="-mb-px cursor-pointer border-b-2 border-transparent px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground"
      >
        {{ entry.label }}
      </TabsTrigger>
    </TabsList>

    <TabsContent
      v-for="entry in entries"
      :key="entry.value"
      :value="entry.value"
      class="focus-visible:outline-none [&_.duxt-code]:my-0 [&_.duxt-code]:rounded-none [&_.duxt-code]:border-0"
    >
      <component :is="entry.node" />
    </TabsContent>
  </TabsRoot>
</template>
