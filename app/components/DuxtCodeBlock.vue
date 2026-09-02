<script setup lang="ts">
const props = defineProps<{
  code?: string;
  language?: string;
  filename?: string;
}>();

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
const root = useTemplateRef<HTMLElement>('root');

async function copy() {
  const text =
    props.code ?? root.value?.querySelector('code')?.textContent ?? '';

  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
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
        class="ml-auto size-7"
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
      class="absolute top-2 right-2 size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      :class="{ 'opacity-100': copied }"
      :aria-label="copied ? 'Copied' : 'Copy code'"
      @click="copy"
    >
      <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="size-3.5" />
    </Button>

    <div ref="root">
      <pre
        v-if="code"
        class="overflow-x-auto p-4 text-sm"
      ><code>{{ code }}</code></pre>
      <slot v-else />
    </div>
  </div>
</template>
