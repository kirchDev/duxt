<script setup lang="ts">
const code = ref('graph TD; Start --> Finish');
const mode = useColorMode();
</script>

<template>
  <div data-diagram-demo>
    <Mermaid code="graph TD; First --> Second" />
    <Mermaid code="graph LR; Left --> Right" />
    <label for="diagram-source" class="block text-sm font-medium"
      >Diagram source</label
    >
    <textarea
      id="diagram-source"
      v-model="code"
      class="w-full rounded border p-2 font-mono text-sm"
    />
    <UiButton
      variant="outline"
      @click="mode.preference = mode.value === 'dark' ? 'light' : 'dark'"
      >Change diagram theme</UiButton
    >
    <div data-reactive-diagram><Mermaid :code="code" /></div>
  </div>
</template>
