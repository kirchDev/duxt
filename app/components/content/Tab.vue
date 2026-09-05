<script setup lang="ts">
import { TabsContent } from 'reka-ui';
import type { DuxtTabGroupContext } from './TabGroup.vue';

/**
 * One panel of a `::tab-group` block. Registers its own label with the parent on
 * setup, which is what lets the list of triggers be built from children MDC
 * has not rendered yet.
 */
const props = defineProps<{ label?: string }>();

const parent = inject<DuxtTabGroupContext | undefined>('duxt-tabs', undefined);
const value = parent?.register(props.label ?? '') ?? 'tab-0';
</script>

<template>
  <TabsContent
    :value="value"
    class="pt-2 focus-visible:outline-none [&>*:last-child]:mb-0"
  >
    <slot />
  </TabsContent>
</template>
