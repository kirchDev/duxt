<script setup lang="ts">
import { TabsRoot } from 'reka-ui';

/**
 * `::tab-group` with `:::tab{label="…"}` children.
 *
 * NOT `::tabs`. The theme's own UI kit already registers a `Tabs` — shadcn's —
 * and two components of one name is not an override a build resolves in your
 * favour: Nuxt warns and keeps one of them, and the one it kept was shadcn's,
 * so `::tabs` in a page rendered a primitive with no triggers and no state.
 * A content component may not take a name the UI kit owns. `::code-group` next
 * to it reads the same way, which is the consolation.
 *
 * The root is reka-ui's own, because the labels are not known until the
 * children have registered themselves: MDC hands them in as slot content, not as
 * a prop. A provide/inject pair collects them, which is also what makes a
 * `:::tab` work at any depth inside the block. The strip is the UI kit's, in its
 * `underline` look.
 *
 * Keyboard navigation, roving focus and the ARIA roles come from reka-ui — the
 * reason not to hand-roll this out of divs.
 */
export interface DuxtTabGroupContext {
  register: (label: string) => string;
}

const tabs = ref<{ value: string; label: string }[]>([]);
const active = ref<string>();

provide<DuxtTabGroupContext>('duxt-tabs', {
  register(label: string) {
    const value = `tab-${tabs.value.length}`;
    tabs.value.push({ value, label });
    active.value ??= value;
    return value;
  }
});
</script>

<template>
  <TabsRoot v-model="active" class="my-6">
    <UiTabsList
      variant="bare"
      class="border-b"
      :aria-label="$t('duxt.page.tabs') as string"
    >
      <UiTabsTrigger
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        variant="underline"
      >
        {{ tab.label }}
      </UiTabsTrigger>
    </UiTabsList>

    <slot />
  </TabsRoot>
</template>
