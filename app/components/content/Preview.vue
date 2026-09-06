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

const { t } = useI18n();
const tabs = computed(() => [
  { value: 'preview', label: t('duxt.code.preview') },
  { value: 'code', label: t('duxt.code.source') }
]);
</script>

<template>
  <!-- No tabs at all when there is no source: a tab strip with one tab is a
       control that cannot be operated, and reka would still put it in the
       accessibility tree as one. -->
  <div v-if="!hasCode" class="my-6">
    <slot />
  </div>

  <TabsRoot v-else v-model="active" class="my-6">
    <!-- Underlined triggers, not filled ones: a filled tab reads as a second
         surface, and in dark mode as a hole rather than as the selected tab. -->
    <TabsList
      class="flex items-center gap-4 border-b"
      :aria-label="$t('duxt.code.previewTabs') as string"
    >
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        class="-mb-px cursor-pointer border-b-2 border-transparent px-1 pb-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground"
      >
        {{ tab.label }}
      </TabsTrigger>
    </TabsList>

    <!-- NO BOX around the example, and that is the point of the block: a
         callout, a file tree or a code group each carry their own card, and a
         frame around them draws a second one that exists nowhere else on the
         site. What the reader sees here is exactly what the same Markdown
         renders in a page — which is the only claim this component makes.
         Only the first and last margins come off, so the example hangs from
         the tabs rather than floating a line below them. -->
    <TabsContent
      value="preview"
      class="mt-4 outline-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
    >
      <slot />
    </TabsContent>

    <TabsContent value="code" class="mt-4 outline-none [&_.duxt-code]:my-0">
      <slot name="code" />
    </TabsContent>
  </TabsRoot>
</template>
