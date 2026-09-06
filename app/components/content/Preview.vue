<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';

/**
 * `::preview` — a component rendered as the page renders it, with the MDC that
 * produced it one tab away.
 *
 * The documentation of a theme has one problem no prose solves: a page can
 * describe `::callout{type="warning"}`, and the reader still has to build the
 * site to find out what it looks like. This block renders the real component in
 * the real theme — same tokens, same dark mode, same page — so the example is
 * the thing itself rather than a picture of it.
 *
 *     ::preview
 *     :::callout{type="tip"}
 *     Rendered by the page you are reading.
 *     :::
 *
 *     #code
 *     ```mdc
 *     ::callout{type="tip"}
 *     Rendered by the page you are reading.
 *     ::
 *     ```
 *     ::
 *
 * The source is WRITTEN OUT in the `#code` slot rather than derived from the
 * default slot, and that is a deliberate limit, not a shortcut: by the time this
 * component exists its children are rendered VNodes, and the Markdown that
 * produced them is gone — reconstructing it would mean re-serialising an AST
 * into a syntax it never came from, and getting it subtly wrong on every block
 * that nests. Two tabs and no `#code` is a valid block: the example renders and
 * no source tab appears.
 */
const slots = useSlots();

const hasCode = computed(() => Boolean(slots.code));
const active = ref('preview');
</script>

<template>
  <!-- No tabs at all when there is no source: a tab strip with one tab is a
       control that cannot be operated, and reka would still put it in the
       accessibility tree as one. -->
  <div v-if="!hasCode" class="my-6 rounded-lg border px-4 py-6">
    <slot />
  </div>

  <TabsRoot v-else v-model="active" class="my-6">
    <TabsList
      class="flex gap-1 border-b"
      :aria-label="$t('duxt.code.previewTabs') as string"
    >
      <TabsTrigger
        value="preview"
        class="-mb-px cursor-pointer border-b-2 border-transparent px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground"
      >
        {{ $t('duxt.code.preview') }}
      </TabsTrigger>
      <TabsTrigger
        value="code"
        class="-mb-px cursor-pointer border-b-2 border-transparent px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground"
      >
        {{ $t('duxt.code.source') }}
      </TabsTrigger>
    </TabsList>

    <TabsContent value="preview" class="outline-none">
      <!-- The example sits in a padded box rather than flush against the page,
           so a component with its own margins is not read as part of the prose
           around it. -->
      <div class="rounded-b-lg border border-t-0 px-4 py-6">
        <slot />
      </div>
    </TabsContent>

    <!-- The fence brings its own card, so this pane adds none. -->
    <TabsContent value="code" class="outline-none [&>pre]:mt-0">
      <slot name="code" />
    </TabsContent>
  </TabsRoot>
</template>
