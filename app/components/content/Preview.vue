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
  <div v-if="!hasCode" class="my-6 overflow-hidden rounded-lg border">
    <div class="px-6 py-8">
      <slot />
    </div>
  </div>

  <!-- One box, with the switch inside its own header — the same shape as a code
       block's filename bar, so an example and a fence read as siblings rather
       than as two unrelated widgets. -->
  <TabsRoot
    v-else
    v-model="active"
    class="my-6 overflow-hidden rounded-lg border"
  >
    <TabsList
      class="flex items-center gap-1 border-b bg-muted/40 px-2 py-1.5"
      :aria-label="$t('duxt.code.previewTabs') as string"
    >
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        class="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
      >
        {{ tab.label }}
      </TabsTrigger>
    </TabsList>

    <TabsContent value="preview" class="outline-none">
      <!-- Generous padding, and the page's own background: a component with its
           own margins should not touch the frame it is being shown in. -->
      <div class="px-6 py-8">
        <slot />
      </div>
    </TabsContent>

    <!-- The fence brings its own card. Inside this box that is one border too
         many, so its frame, its rounding and its margin are taken back off. -->
    <TabsContent
      value="code"
      class="outline-none [&_.duxt-code]:my-0 [&_.duxt-code]:rounded-none [&_.duxt-code]:border-0 [&_.duxt-code]:bg-transparent"
    >
      <slot name="code" />
    </TabsContent>
  </TabsRoot>
</template>
