<script setup lang="ts">
// `::package-managers{command="add -D @kirchdev/duxt"}` renders the same
// command for every manager, so a docs author writes it once.
const props = withDefaults(
  defineProps<{ command: string; managers?: string[] }>(),
  {
    managers: () => ['pnpm', 'npm', 'yarn', 'bun']
  }
);

// npm needs `install` where the others take `add`; everything else passes through.
function render(manager: string) {
  if (manager === 'npm' && props.command.startsWith('add ')) {
    return `npm install ${props.command.slice(4)}`;
  }
  return `${manager} ${props.command}`;
}
</script>

<template>
  <Tabs :default-value="managers[0]" class="my-6">
    <TabsList>
      <TabsTrigger v-for="manager in managers" :key="manager" :value="manager">
        {{ manager }}
      </TabsTrigger>
    </TabsList>
    <TabsContent v-for="manager in managers" :key="manager" :value="manager">
      <DuxtCodeBlock :code="render(manager)" language="bash" />
    </TabsContent>
  </Tabs>
</template>
