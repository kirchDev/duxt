<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '@duxt/lib/utils';

/**
 * The icon button beside a block of code: a copy mark that turns into a check.
 *
 * Its state comes from `useDuxtCopy` in the component that owns the text —
 * this only draws it, because what gets copied is the owner's to know (a fence's
 * source, the tab that is showing, the manager that is picked).
 */
const props = defineProps<{
  copied: boolean;
  /** The accessible name before copying. Defaults to "Copy code". */
  label?: string;
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <UiButton
    variant="ghost"
    size="icon"
    :class="
      cn('size-7 shrink-0 hover:bg-accent hover:text-foreground', props.class)
    "
    :aria-label="
      copied ? $t('duxt.code.copied') : (label ?? $t('duxt.code.copy'))
    "
  >
    <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="size-3.5" />
  </UiButton>
</template>
