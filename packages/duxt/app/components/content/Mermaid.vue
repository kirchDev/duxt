<script setup lang="ts">
import { renderDuxtMermaid } from '../../utils/mermaid-render';
/**
 * A mermaid diagram, from ```mermaid or from `::mermaid`.
 *
 * Loaded on demand and only in the browser: mermaid is roughly half a megabyte
 * and pulls in its own parser, and a documentation site where three pages in
 * sixty carry a diagram must not make the other fifty-seven pay for it. That
 * also means the diagram is client-rendered — the SSR output is the source
 * text, which is the honest fallback for a reader with no JavaScript.
 *
 * The theme follows the site's own: mermaid takes a base theme at init, so the
 * colour mode is read and the diagram is re-rendered when it changes.
 */
const props = defineProps<{ code?: string }>();

const authored = useTemplateRef<HTMLElement>('authored');
const colorMode = useColorMode();
const source = ref('');
const failed = ref(false);
const svg = ref('');
const id = `duxt-mermaid-${useId().replace(/[^A-Za-z0-9_-]/g, '_')}`;
let revision = 0;
let mounted = false;

async function render() {
  if (!import.meta.client || !mounted) return;
  const current = ++revision;
  const text = source.value.trim();
  if (!text) {
    svg.value = '';
    return;
  }

  try {
    const rendered = await renderDuxtMermaid(
      `${id}-${current}`,
      text,
      colorMode.value === 'dark',
      () => mounted && current === revision
    );
    if (current !== revision || !mounted) return;
    svg.value = rendered;
    failed.value = false;
  } catch {
    if (current !== revision || !mounted) return;
    // A diagram that does not parse must not take the page with it. The source
    // stays on screen, which is more useful than an empty box.
    svg.value = '';
    failed.value = true;
  }
}

onMounted(() => {
  mounted = true;
  source.value = props.code ?? authored.value?.textContent?.trim() ?? '';
  void render();
});
onUpdated(() => {
  const next = props.code ?? authored.value?.textContent?.trim() ?? '';
  if (next !== source.value) {
    source.value = next;
    void render();
  }
});
watch(() => colorMode.value, render);
onBeforeUnmount(() => {
  mounted = false;
  revision++;
});
</script>

<template>
  <div class="my-6 flex justify-center overflow-x-auto rounded-lg border p-4">
    <div
      ref="authored"
      :hidden="Boolean(svg)"
      :class="{ 'text-sm whitespace-pre': failed }"
    >
      <slot>{{ code }}</slot>
    </div>
    <div v-if="svg" v-html="svg" />
  </div>
</template>
