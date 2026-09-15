<script setup lang="ts">
import type { TabsListProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { reactiveOmit } from '@vueuse/core';
import { TabsList } from 'reka-ui';
import { cn } from '@duxt/lib/utils';

/**
 * `variant="bare"` is the strip inside a code card's toolbar: no track of its
 * own, because the toolbar already is one. `default` is shadcn's segmented
 * track, kept for a consumer who wants it.
 */
const props = defineProps<
  TabsListProps & {
    class?: HTMLAttributes['class'];
    variant?: 'default' | 'bare';
  }
>();

const delegatedProps = reactiveOmit(props, 'class', 'variant');
</script>

<template>
  <TabsList
    data-slot="tabs-list"
    v-bind="delegatedProps"
    :class="
      cn(
        props.variant === 'bare'
          ? 'flex items-center gap-1'
          : 'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-0.75',
        props.class
      )
    "
  >
    <slot />
  </TabsList>
</template>
