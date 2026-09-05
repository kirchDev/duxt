<script setup lang="ts">
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem as Item,
  AccordionTrigger
} from 'reka-ui';
import type { DuxtAccordionContext } from './Accordion.vue';

const props = defineProps<{ label?: string; icon?: string }>();

const parent = inject<DuxtAccordionContext | undefined>(
  'duxt-accordion',
  undefined
);

const value = parent?.register(props.label ?? '') ?? 'item-0';
</script>

<template>
  <Item :value="value" class="border-b last:border-b-0">
    <AccordionHeader>
      <AccordionTrigger
        class="group flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-accent/50"
      >
        <Icon v-if="icon" :name="icon" class="size-4 text-muted-foreground" />
        <span class="min-w-0">{{ label }}</span>
        <Icon
          name="lucide:chevron-down"
          class="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
        />
      </AccordionTrigger>
    </AccordionHeader>

    <!-- No enter/leave animation: the keyframes shadcn's own Accordion ships
         come with that component, which this theme does not install. An
         unstyled `animate-accordion-down` class is a silent no-op, and a
         disclosure that opens instantly is not worse than one that appears
         to. -->
    <AccordionContent class="overflow-hidden">
      <div class="px-4 pb-3 text-sm [&>*:last-child]:mb-0">
        <slot />
      </div>
    </AccordionContent>
  </Item>
</template>
