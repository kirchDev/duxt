<script setup lang="ts">
const props = defineProps<{
  code?: string;
  language?: string;
  filename?: string;
}>();

const copied = ref(false);
const root = useTemplateRef<HTMLElement>('root');

async function copy() {
  // Prefer the prop; fall back to the rendered text so this works for both a
  // Markdown fence (where Content passes highlighted HTML) and a direct call.
  const text =
    props.code ?? root.value?.querySelector('code')?.textContent ?? '';

  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    // Clipboard is unavailable over plain HTTP and in some embeds; a failed
    // copy should be silent, not a thrown error in the console.
  }
}
</script>

<template>
  <div
    ref="root"
    class="group relative my-6 overflow-hidden rounded-lg border bg-muted/40"
  >
    <div
      v-if="filename || language"
      class="flex items-center gap-2 border-b bg-muted/60 px-4 py-2 text-xs text-muted-foreground"
    >
      <Icon v-if="filename" name="lucide:file-code" class="size-3.5" />
      <span class="font-mono">{{ filename ?? language }}</span>
    </div>

    <Button
      variant="ghost"
      size="icon"
      class="absolute top-2 right-2 size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      :class="{ 'opacity-100': copied }"
      :aria-label="copied ? 'Copied' : 'Copy code'"
      @click="copy"
    >
      <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="size-3.5" />
    </Button>

    <pre
      v-if="code"
      class="overflow-x-auto p-4 text-sm"
    ><code>{{ code }}</code></pre>
    <slot v-else />
  </div>
</template>
