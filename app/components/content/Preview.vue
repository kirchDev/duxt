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

/**
 * The fence in `#code`, read off its VNode — the same trick `::code-group`
 * uses on its children. What it yields is the filename or the language, which
 * is what the tab should say and which icon it should carry: a reader picking
 * between an example and its source is picking between a rendered thing and a
 * `.vue`, a `.md` or an `.mdc` file, and the icon says which without a word.
 */
const codeMeta = computed(() => {
  const nodes = (slots.code?.() ?? []).flatMap((node) =>
    Array.isArray(node.children) && typeof node.type === 'symbol'
      ? (node.children as VNode[])
      : [node]
  );

  const props = (nodes.find((node) => typeof node.type === 'object')?.props ??
    {}) as { filename?: string; language?: string; code?: string };

  return {
    label: props.filename ?? props.language ?? t('duxt.code.source'),
    icon: fileIcon(props.filename ?? props.language ?? 'md'),
    code: props.code
  };
});

/**
 * The copy button lives up here rather than in the fence's own header, because
 * the fence's header is hidden: it would say `mdc` directly under a tab that
 * already says `mdc`, and one card does not need naming twice.
 */
const notify = useDuxtToast();
const copied = ref(false);

async function copy() {
  const code = codeMeta.value.code;
  if (!code) return;

  try {
    await navigator.clipboard.writeText(code);
    copied.value = true;
    notify.success(t('duxt.code.copiedToast'));
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    notify.error(t('duxt.page.copyFailed'));
  }
}

const tabs = computed(() => [
  { value: 'preview', label: t('duxt.code.preview'), icon: 'lucide:eye' },
  { value: 'code', label: codeMeta.value.label, icon: codeMeta.value.icon }
]);
</script>

<template>
  <!-- No tabs at all when there is no source: a tab strip with one tab is a
       control that cannot be operated, and reka would still put it in the
       accessibility tree as one. -->
  <div v-if="!hasCode" class="my-6">
    <slot />
  </div>

  <!-- One card, built like the package-manager block and the code block beside
       it: a header of pills, then the panel. Three blocks on a page that all
       switch between things should not switch in three different shapes.

       One surface for the whole card, example and source alike: switching
       tabs should change what is in the box, not what the box is made of. -->
  <TabsRoot
    v-else
    v-model="active"
    class="my-6 overflow-hidden rounded-lg border bg-card"
  >
    <!-- The header row is the flex container, and the strip is one child of
         it: a `tablist` may hold tabs and nothing else, and a button inside one
         is an `aria-required-children` failure — latent here only because it
         renders on the source tab, which is not the tab a page loads on. -->
    <div
      class="flex min-h-11 items-center gap-1 border-b bg-muted/40 px-2 py-1.5"
    >
      <TabsList
        class="flex items-center gap-1"
        :aria-label="$t('duxt.code.previewTabs') as string"
      >
        <TabsTrigger
          v-for="tab in tabs"
          :key="tab.value"
          :value="tab.value"
          class="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <Icon :name="tab.icon" class="size-3.5" />
          {{ tab.label }}
        </TabsTrigger>
      </TabsList>

      <!-- Right of the tabs, where every other card on the site puts it. Only
           on the source tab: a copy button beside a rendered example copies
           something the reader cannot see. -->
      <UiButton
        v-if="active === 'code' && codeMeta.code"
        variant="ghost"
        size="icon"
        class="ms-auto size-7"
        :aria-label="copied ? $t('duxt.code.copied') : $t('duxt.code.copy')"
        @click="copy"
      >
        <Icon
          :name="copied ? 'lucide:check' : 'lucide:copy'"
          class="size-3.5"
        />
      </UiButton>
    </div>

    <TabsContent value="preview" class="outline-none">
      <!-- The example on the card's own surface, its outer margins taken off:
           a callout carries `my-6`, and inside a padded panel that margin is
           the padding a second time. -->
      <div class="px-4 py-6 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        <slot />
      </div>
    </TabsContent>

    <!-- The fence brought its own card into a card, so its frame, its rounding
         and its own header come off — the tab above already names the language,
         and the copy button moved up there with it. Its surface stays, and it is
         the card's own — so the panel does not change colour between tabs. -->
    <TabsContent
      value="code"
      class="outline-none [&_.duxt-code]:my-0 [&_.duxt-code]:rounded-none [&_.duxt-code]:border-0 [&_.duxt-code-header]:hidden [&_.duxt-code-copy]:hidden"
    >
      <slot name="code" />
    </TabsContent>
  </TabsRoot>
</template>
