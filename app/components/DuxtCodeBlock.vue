<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Raw source, used for the copy button and as the body when no slot is given. */
    code?: string;
    language?: string;
    filename?: string;
    /**
     * The block's own controls — the header bar AND the copy button.
     *
     * `false` says a CONTAINER draws them instead: `CodeGroup` puts the file
     * names in a tab bar and the copy button beside them, the way
     * `PackageManagers` does, and a block that kept its own would print the
     * language under the file name and offer a second button for the same
     * text.
     *
     * Both together, deliberately. Switching off only the bar left the copy
     * button in its floating position, where it appears on hover — so a group
     * of fences lost the visible control the same block outside a group has.
     */
    header?: boolean;
  }>(),
  { header: true }
);

const slots = useSlots();

// Content hands ProsePre the highlighted markup in the slot and the raw source
// in `code`. Rendering `code` when a slot exists throws the highlighting away —
// which is exactly what happened, and looked like Shiki being switched off.
const hasBody = computed(() => Boolean(slots.default));

/**
 * The other half of that: a block with NO slot never passed through Content at
 * all — it is code this site derived at runtime, an example body off a schema
 * or a response the client just received — and it used to render as flat text
 * beside fences that were coloured, which reads as the highlighter being off
 * for that one box. Highlighted here instead, with the same themes.
 *
 * Skipped where there is a slot, because Content already did it, and where the
 * language is not one this site generates — see `duxtCodeLang`.
 */
const { data: highlighted } = await useAsyncData(
  () => `duxt-code-${props.language ?? 'text'}-${props.code ?? ''}`,
  () => {
    const lang = duxtCodeLang(props.language);

    return !hasBody.value && props.code && lang
      ? highlightCode(props.code, lang)
      : // `null`, not `undefined`: Nuxt reads a handler that resolves to
        // nothing as one that failed to return, warns, and repeats the request
        // on the client. Here nothing to highlight is a real answer.
        Promise.resolve(null);
  },
  { watch: [() => props.code, () => props.language] }
);

const icon = computed(() =>
  fileIcon(
    props.filename ?? props.language,
    props.language ? 'lucide:terminal' : 'lucide:file'
  )
);

const label = computed(() => props.filename ?? props.language);

const copied = ref(false);
const notify = useDuxtToast();
const { t } = useI18n();
const root = useTemplateRef<HTMLElement>('root');
const analytics = useDuxtAnalytics();

async function copy() {
  const text =
    props.code ?? root.value?.querySelector('code')?.textContent ?? '';

  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    // After the write, so a copy the clipboard refused is not reported as one —
    // and the language only: the copied TEXT never travels.
    analytics.track({ name: 'copy', kind: 'code', language: props.language });
    notify.success(t('duxt.code.copiedToast'));
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    notify.error(
      'Could not copy',
      'The clipboard is unavailable in this context.'
    );
    // Clipboard is unavailable over plain HTTP; a failed copy stays silent.
  }
}
</script>

<template>
  <!-- `dir="ltr"` on the block, not on the `pre` alone: the header carries a
       file name and the floating button sits over the code, and all three are
       one technical surface. Inside the island the logical utilities below
       resolve left-to-right, so they stay logical rather than turning physical
       — the direction is declared once, in one place, instead of being spelled
       out again in every class. -->
  <div
    dir="ltr"
    class="duxt-code group relative my-6 overflow-hidden rounded-lg border bg-card"
  >
    <div
      v-if="header && label"
      class="duxt-code-header flex min-h-11 items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
    >
      <Icon :name="icon" class="size-4 shrink-0" />
      <span class="truncate font-mono">{{ label }}</span>

      <UiButton
        variant="ghost"
        size="icon"
        class="ms-auto size-7 hover:bg-accent hover:text-foreground"
        :aria-label="copied ? $t('duxt.code.copied') : $t('duxt.code.copy')"
        @click="copy"
      >
        <Icon
          :name="copied ? 'lucide:check' : 'lucide:copy'"
          class="size-3.5"
        />
      </UiButton>
    </div>

    <UiButton
      v-else-if="header"
      variant="ghost"
      size="icon"
      class="duxt-code-copy absolute top-2 end-2 size-7 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent focus-visible:opacity-100"
      :class="{ 'opacity-100': copied }"
      :aria-label="copied ? $t('duxt.code.copied') : $t('duxt.code.copy')"
      @click="copy"
    >
      <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="size-3.5" />
    </UiButton>

    <div ref="root">
      <slot v-if="hasBody" />
      <!-- eslint-disable-next-line vue/no-v-html -- Shiki's own output, from
           this site's own string; nothing a reader typed reaches it. -->
      <div
        v-else-if="highlighted"
        class="duxt-code-body"
        v-html="highlighted"
      />
      <pre
        v-else
        class="overflow-x-auto p-4 text-sm"
      ><code>{{ code }}</code></pre>
    </div>
  </div>
</template>
