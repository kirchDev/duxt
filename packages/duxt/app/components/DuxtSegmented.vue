<script setup lang="ts" generic="T extends string">
import type { HTMLAttributes } from 'vue';
import { cn } from '@duxt/lib/utils';

/**
 * A row of pressed-or-not buttons: pick one of a few, see which is picked.
 *
 * `role="group"` with `aria-pressed`, NOT a radiogroup or a tablist: a
 * radiogroup promises arrow-key navigation between its options and a tablist
 * promises panels, and this implements neither. A group of pressed buttons
 * promises only what it does — every one reachable by Tab, every one saying
 * whether it is on. Where a strip really does switch panels, it is a
 * `UiTabsList` with `variant="pill"`, which draws the same pill.
 *
 * The `option` slot is for a label that is more than an icon and a word — the
 * package managers swap their mark with the theme.
 */
export interface DuxtSegmentedOption<Value extends string = string> {
  value: Value;
  label: string;
  icon?: string;
}

const props = withDefaults(
  defineProps<{
    options: readonly DuxtSegmentedOption<T>[];
    /** The group's accessible name. */
    label?: string;
    size?: DuxtPillSize;
    tone?: DuxtPillTone;
    /** Monospaced labels, for things a reader would type: a media type, a client. */
    mono?: boolean;
    class?: HTMLAttributes['class'];
  }>(),
  { size: 'md', tone: 'raised', mono: false }
);

const model = defineModel<T>({ required: true });
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    :class="cn('flex items-center gap-1', props.class)"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="model === option.value"
      :class="[
        duxtPill(model === option.value, { size, tone }),
        mono && 'font-mono'
      ]"
      @click="model = option.value"
    >
      <slot name="option" :option="option" :active="model === option.value">
        <Icon v-if="option.icon" :name="option.icon" class="size-3.5" />
        {{ option.label }}
      </slot>
    </button>
  </div>
</template>
