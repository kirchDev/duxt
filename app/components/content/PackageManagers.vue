<script setup lang="ts">
// `::package-managers{command="add -D @kirchdev/duxt"}` — one command, every
// manager, in a single box: tabs and copy button sit in the code block's own
// header rather than floating above a separate card.
const props = defineProps<{
  command: string;
  managers?: DuxtPackageManager[];
}>();

const duxt = useDuxtConfig();

// Per block, then the site's configured order, then all four.
const offered = computed(
  () => props.managers ?? duxt.packageManagers ?? duxtPackageManagers
);

/**
 * A manager that cannot express this command gets NO TAB.
 *
 * Berry has no `outdated` and npm no `patch`, and the nearest relative in each
 * case does a different job — so a tab there would be a control that lies.
 * Dropping it reuses what the block could already do: it may list fewer
 * managers than the reader's cookie covers, and falls back to its own first tab.
 * `modules/validate.ts` reports which page asked, so the omission is not silent.
 */
const managers = computed(() =>
  offered.value.filter(
    (manager) => packageCommand(manager, props.command) !== undefined
  )
);

/**
 * The mark each manager is drawn with.
 *
 * vscode-icons, because it carries the real colours in the file itself — the
 * same collection every file name and every fence language on this site is
 * drawn from. What stood here before was simple-icons, which is monochrome by
 * design, plus eight hand-set hex values: two per manager, because one cannot
 * serve both themes. That table is gone with it.
 */
const managerIcons: Record<DuxtPackageManager, string> = {
  npm: 'vscode-icons:file-type-npm',
  pnpm: 'vscode-icons:file-type-pnpm',
  yarn: 'vscode-icons:file-type-yarn',
  bun: 'vscode-icons:file-type-bun'
};

/**
 * pnpm, and pnpm alone, needs a second spelling.
 *
 * Its mark is orange squares AND WHITE ONES, so half the grid disappears on a
 * white page. vscode-icons ships a `light` variant for exactly that — the white
 * cells drawn `#4e4e4e` instead — and it ships one for no other manager here,
 * which is the collection reaching the same conclusion. Two elements swapped by
 * the theme class, the way the preview poster serves its two screenshots.
 */
const managerIconsLight: Partial<Record<DuxtPackageManager, string>> = {
  pnpm: 'vscode-icons:file-type-light-pnpm'
};

const commands = computed(() =>
  Object.fromEntries(
    managers.value.map((manager) => [
      manager,
      packageCommand(manager, props.command)!
    ])
  )
);

const { data: highlighted } = await useAsyncData(
  `package-managers-${props.command}`,
  async () => {
    const entries = await Promise.all(
      Object.entries(commands.value).map(
        async ([manager, command]) =>
          [manager, await highlightCode(command, 'bash')] as const
      )
    );
    return Object.fromEntries(entries);
  }
);

// Shared across every block on the page and remembered between pages, so a
// reader picks their manager once for the whole site. The value arrives with
// the request, so the server renders the right tab and nothing jumps.
const stored = usePackageManager();

// A block can list fewer managers than the reader's choice covers; fall back to
// its first rather than showing nothing.
const active = computed<DuxtPackageManager>({
  get: () =>
    managers.value.find((manager) => manager === stored.value) ??
    managers.value[0]!,
  set: (value) => {
    stored.value = value;
  }
});
const copied = ref(false);
const notify = useDuxtToast();
const { t } = useI18n();

async function copy() {
  try {
    await navigator.clipboard.writeText(commands.value[active.value]!);
    copied.value = true;
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
  <!-- Nothing to show where NO manager can express the command: `active` has
       no first tab to fall back on, and a card with an empty header reads as a
       broken component rather than as a command nobody can run. The build
       validator names the page. -->
  <div
    v-if="managers.length"
    class="duxt-code my-6 overflow-hidden rounded-lg border bg-card"
  >
    <div
      class="flex min-h-11 items-center gap-1 border-b bg-muted/40 px-2 py-1.5"
    >
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
          :name="
            managerIconsLight[manager] ??
            managerIcons[manager] ??
            'lucide:terminal'
          "
          class="size-3.5"
          :class="managerIconsLight[manager] ? 'dark:hidden' : ''"
        />
        <Icon
          v-if="managerIconsLight[manager]"
          :name="managerIcons[manager]"
          class="hidden size-3.5 dark:block"
        />
        {{ manager }}
      </button>

      <UiButton
        variant="ghost"
        size="icon"
        class="ml-auto size-7"
        :aria-label="
          copied ? $t('duxt.code.copied') : $t('duxt.code.copyCommand')
        "
        @click="copy"
      >
        <Icon
          :name="copied ? 'lucide:check' : 'lucide:copy'"
          class="size-3.5"
        />
      </UiButton>
    </div>

    <!-- eslint-disable-next-line vue/no-v-html -- Shiki output, built on the
         server from this component's own prop, never from page content. -->
    <div
      v-if="highlighted?.[active]"
      class="duxt-shell overflow-x-auto px-4 py-3 font-mono text-sm"
      v-html="highlighted[active]"
    />
    <pre
      v-else
      class="overflow-x-auto px-4 py-3 font-mono text-sm"
    ><code>{{ commands[active] }}</code></pre>
  </div>
</template>
