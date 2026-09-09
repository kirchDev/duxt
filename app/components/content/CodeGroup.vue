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
 *
 * NOT ONLY FOR FENCES. Anything rendering a `DuxtCodeBlock` and carrying a
 * `filename` or `language` prop works here — the landing page's code demos hand
 * it blocks built from config rather than from Markdown. That is why this is a
 * component and the landing page does not grow a second tab bar of its own.
 *
 * THE BAR IS `PackageManagers`' BAR: pills with the file's own icon, and the
 * copy button at the end of the same row. Those two components are the same
 * control — pick one of several spellings of one thing, copy the one you
 * picked — and they read as one only if they look alike.
 */
const slots = useSlots();

interface Entry {
  value: string;
  label: string;
  icon: string;
  code: string;
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
        code?: string;
      };

      return {
        value: `code-${index}`,
        label: props.filename ?? props.language ?? `${index + 1}`,
        icon: fileIcon(
          props.filename ?? props.language,
          props.language ? 'lucide:terminal' : 'lucide:file'
        ),
        code: props.code ?? '',
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

const current = computed(() =>
  entries.value.find((entry) => entry.value === active.value)
);

/**
 * The copy button, on the group rather than on each fence.
 *
 * `code` is the fence's raw source and is the honest thing to copy; a group
 * whose children were built without it falls back to the rendered text of the
 * panel that is showing, which is what `DuxtCodeBlock` does for itself.
 */
const root = useTemplateRef<HTMLElement>('root');

/** The height follows the file that is showing — see the composable. */
const shell = useTemplateRef<HTMLElement>('shell');
const body = useTemplateRef<HTMLElement>('body');

useDuxtAnimatedHeight(shell, body);
const copied = ref(false);
const notify = useDuxtToast();
const { t } = useI18n();

async function copy() {
  const text =
    current.value?.code ||
    root.value?.querySelector('[data-state="active"] code')?.textContent ||
    '';

  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    notify.success(t('duxt.code.copiedToast'));
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    notify.error(t('duxt.page.copyFailed'));
  }
}
</script>

<template>
  <TabsRoot
    ref="root"
    v-model="active"
    class="duxt-code my-6 overflow-hidden rounded-lg border bg-card"
  >
    <!-- THE BUTTON IS NOT IN THE TABLIST. It looks like one row and has to be
         one row, but `role="tablist"` may only contain tabs — a copy button
         inside it is a control a screen reader is told to treat as a tab and
         cannot. So the row is a plain box and the tablist is the part of it
         that actually holds tabs. -->
    <div
      class="flex min-h-11 items-center gap-1 border-b bg-muted/40 px-2 py-1.5"
    >
      <TabsList
        class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
        :aria-label="$t('duxt.page.tabs') as string"
      >
        <TabsTrigger
          v-for="entry in entries"
          :key="entry.value"
          :value="entry.value"
          class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Icon :name="entry.icon" class="size-3.5" />
          {{ entry.label }}
        </TabsTrigger>
      </TabsList>

      <UiButton
        variant="ghost"
        size="icon"
        class="size-7 shrink-0"
        :aria-label="copied ? $t('duxt.code.copied') : $t('duxt.code.copy')"
        @click="copy"
      >
        <Icon
          :name="copied ? 'lucide:check' : 'lucide:copy'"
          class="size-3.5"
        />
      </UiButton>
    </div>

    <!-- THE BLOCK FOLLOWS THE FILE THAT IS SHOWING, over 300ms.

         The first version mounted every panel stacked in one grid cell, so the
         block was always as tall as the LONGEST file. It never moved, which was
         the point — and it left a three-line config sitting in the space a
         twelve-line one needs, which is a lot of empty box on a landing page.

         So one panel at a time, and the height is animated instead of switched:
         the same treatment the request-sample card gets, out of the same
         composable. Nothing below the block jumps, and nothing above it sits in
         a hole. -->
    <div
      ref="shell"
      class="overflow-hidden motion-safe:transition-[height] motion-safe:duration-300 motion-safe:ease-out"
    >
      <div ref="body">
        <TabsContent
          v-for="entry in entries"
          :key="entry.value"
          :value="entry.value"
          class="focus-visible:outline-none [&_.duxt-code]:my-0 [&_.duxt-code]:rounded-none [&_.duxt-code]:border-0"
        >
          <!-- `:header="false"`: the tab above already says what the bar inside
               would, and the copy button now sits beside the tabs. -->
          <component :is="entry.node" :header="false" />
        </TabsContent>
      </div>
    </div>
  </TabsRoot>
</template>
