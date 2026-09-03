<script setup lang="ts">
const props = defineProps<{
  /** Raw source, used for the copy button and as the body when no slot is given. */
  code?: string;
  language?: string;
  filename?: string;
}>();

const slots = useSlots();

// Content hands ProsePre the highlighted markup in the slot and the raw source
// in `code`. Rendering `code` when a slot exists throws the highlighting away —
// which is exactly what happened, and looked like Shiki being switched off.
const hasBody = computed(() => Boolean(slots.default));

// The filename wins over the language: `nuxt.config.ts` gets Nuxt's icon, a
// bare ```ts fence gets TypeScript's.
const icon = computed(() =>
  fileIcon(
    props.filename ?? props.language,
    props.language ? 'lucide:terminal' : 'lucide:file'
  )
);

const label = computed(() => props.filename ?? props.language);

const copied = ref(false);
const notify = useDuxtToast();
const root = useTemplateRef<HTMLElement>('root');

async function copy() {
  const text =
    props.code ?? root.value?.querySelector('code')?.textContent ?? '';

  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    notify.success('Copied to clipboard');
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
  <div class="group relative my-6 overflow-hidden rounded-lg border bg-card">
    <div
      v-if="label"
      class="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
    >
      <Icon :name="icon" class="size-4 shrink-0" />
      <span class="truncate font-mono">{{ label }}</span>

      <Button
        variant="ghost"
        size="icon"
        class="ml-auto size-7 hover:bg-accent hover:text-foreground"
        :aria-label="copied ? 'Copied' : 'Copy code'"
        @click="copy"
      >
        <Icon
          :name="copied ? 'lucide:check' : 'lucide:copy'"
          class="size-3.5"
        />
      </Button>
    </div>

    <Button
      v-else
      variant="ghost"
      size="icon"
      class="absolute top-2 right-2 size-7 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent focus-visible:opacity-100"
      :class="{ 'opacity-100': copied }"
      :aria-label="copied ? 'Copied' : 'Copy code'"
      @click="copy"
    >
      <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="size-3.5" />
    </Button>

    <div ref="root">
      <slot v-if="hasBody" />
      <pre
        v-else
        class="overflow-x-auto p-4 text-sm"
      ><code>{{ code }}</code></pre>
    </div>
  </div>
</template>
