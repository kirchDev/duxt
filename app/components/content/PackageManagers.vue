<script setup lang="ts">
// `::package-managers{command="add -D @kirchdev/duxt"}` — one command, every
// manager, in a single box: tabs and copy button sit in the code block's own
// header rather than floating above a separate card.
const props = withDefaults(
  defineProps<{ command: string; managers?: string[] }>(),
  {
    managers: () => ['pnpm', 'npm', 'yarn', 'bun']
  }
);

// Brand colours per theme. A single value does not work: bun's cream is
// invisible on a light background and npm's red is muddy on a dark one, so
// each manager carries both and CSS picks by theme class.
const managerBrands: Record<
  string,
  { icon: string; light: string; dark: string }
> = {
  npm: { icon: 'simple-icons:npm', light: '#CB3837', dark: '#F1554C' },
  pnpm: { icon: 'simple-icons:pnpm', light: '#F69220', dark: '#F9AD00' },
  yarn: { icon: 'simple-icons:yarn', light: '#2C8EBB', dark: '#4FA8D8' },
  bun: { icon: 'simple-icons:bun', light: '#14151A', dark: '#FBF0DF' }
};

// npm spells it `install` where the others take `add`; `dlx` differs too.
function render(manager: string) {
  const command = props.command;
  if (manager === 'npm') {
    if (command.startsWith('add ')) return `npm install ${command.slice(4)}`;
    if (command.startsWith('dlx ')) return `npx ${command.slice(4)}`;
  }
  if (manager === 'yarn' && command.startsWith('dlx '))
    return `yarn dlx ${command.slice(4)}`;
  if (manager === 'bun' && command.startsWith('dlx '))
    return `bunx ${command.slice(4)}`;
  return `${manager} ${command}`;
}

const active = ref(props.managers[0] ?? 'pnpm');
const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(render(active.value));
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    // Clipboard is unavailable over plain HTTP; a failed copy stays silent.
  }
}
</script>

<template>
  <div class="my-6 overflow-hidden rounded-lg border bg-card">
    <div class="flex items-center gap-1 border-b bg-muted/40 px-2 py-1.5">
      <button
        v-for="manager in managers"
        :key="manager"
        type="button"
        class="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
        :class="
          active === manager
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        "
        @click="active = manager"
      >
        <Icon
          :name="managerBrands[manager]?.icon ?? 'lucide:terminal'"
          class="duxt-brand size-3.5"
          :style="{
            '--brand': managerBrands[manager]?.light,
            '--brand-dark': managerBrands[manager]?.dark
          }"
        />
        {{ manager }}
      </button>

      <Button
        variant="ghost"
        size="icon"
        class="ml-auto size-7"
        :aria-label="copied ? 'Copied' : 'Copy command'"
        @click="copy"
      >
        <Icon
          :name="copied ? 'lucide:check' : 'lucide:copy'"
          class="size-3.5"
        />
      </Button>
    </div>

    <pre
      class="overflow-x-auto px-4 py-3 font-mono text-sm"
    ><code>{{ render(active) }}</code></pre>
  </div>
</template>
