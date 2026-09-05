<script setup lang="ts">
import { AccordionRoot } from 'reka-ui';

/**
 * `::accordion` around `:::accordion-item{label="…"}` blocks.
 *
 * On reka-ui's primitives, like the tree and the tabs, for the same reason:
 * a hand-rolled disclosure has no keyboard handling, no `aria-expanded` and no
 * relationship between the trigger and the region it opens.
 *
 * `type="multiple"` on purpose. A FAQ where opening one answer closes the one
 * you were half-way through is a worse FAQ.
 */
export interface DuxtAccordionContext {
  register: (label: string) => string;
}

const items = ref<{ value: string; label: string }[]>([]);

provide<DuxtAccordionContext>('duxt-accordion', {
  register(label: string) {
    const value = `item-${items.value.length}`;
    items.value.push({ value, label });
    return value;
  }
});

// The item component imports its own primitives from reka-ui. Re-exporting them
// here would be an ES module export inside <script setup>, which the SFC
// compiler rejects outright — a type export is fine, a value export is not.
</script>

<template>
  <AccordionRoot type="multiple" class="my-6 rounded-lg border">
    <slot />
  </AccordionRoot>
</template>
