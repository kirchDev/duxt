<script setup lang="ts">
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

const container = useTemplateRef<HTMLElement>('container');
const colorMode = useColorMode();
const slots = useSlots();
const source = ref('');
const failed = ref(false);

let mermaid: typeof import('mermaid').default | undefined;
let counter = 0;

async function render() {
  if (!import.meta.client || !container.value) return;

  const text = source.value.trim();
  if (!text) return;

  try {
    mermaid ??= (await import('mermaid')).default;

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: colorMode.value === 'dark' ? 'dark' : 'default'
    });

    const { svg } = await mermaid.render(`duxt-mermaid-${counter++}`, text);
    container.value.innerHTML = svg;
    failed.value = false;
  } catch {
    // A diagram that does not parse must not take the page with it. The source
    // stays on screen, which is more useful than an empty box.
    failed.value = true;
  }
}

onMounted(() => {
  source.value =
    props.code ??
    container.value?.textContent?.trim() ??
    (typeof slots.default?.()[0]?.children === 'string'
      ? (slots.default()[0]!.children as string)
      : '');

  void render();
});

watch(() => colorMode.value, render);
</script>

<template>
  <div class="my-6 flex justify-center overflow-x-auto rounded-lg border p-4">
    <div ref="container" :class="{ 'text-sm whitespace-pre': failed }">
      <slot>{{ code }}</slot>
    </div>
  </div>
</template>
