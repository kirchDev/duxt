<script setup lang="ts">
import type { TabsTriggerProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { reactiveOmit } from '@vueuse/core';
import { TabsTrigger, useForwardProps } from 'reka-ui';
import { cn } from '@duxt/lib/utils';
import { duxtPill, type DuxtPillSize } from '../../../utils/pill';

/**
 * Three looks, one behaviour.
 *
 * `pill` is the site's own — the code group, the preview and the request
 * samples, drawn by `duxtPill` like every other "pick one of these" strip.
 * `underline` is the prose tab group, which sits in running text rather than in
 * a card. `default` is shadcn's, untouched, for a consumer who wants it.
 */
const props = defineProps<
  TabsTriggerProps & {
    class?: HTMLAttributes['class'];
    variant?: 'default' | 'pill' | 'underline';
    size?: DuxtPillSize;
  }
>();

const delegatedProps = reactiveOmit(props, 'class', 'variant', 'size');

const forwardedProps = useForwardProps(delegatedProps);

const looks = {
  default: `data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-3 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
  underline:
    '-mb-px cursor-pointer border-b-2 border-transparent px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:border-primary data-[state=active]:text-foreground'
};
</script>

<template>
  <TabsTrigger
    data-slot="tabs-trigger"
    :class="
      cn(
        props.variant === 'pill'
          ? duxtPill('tab', { size: props.size })
          : looks[props.variant ?? 'default'],
        props.class
      )
    "
    v-bind="forwardedProps"
  >
    <slot />
  </TabsTrigger>
</template>
