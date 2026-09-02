<script setup lang="ts">
// An MDC component: Markdown calls it as `::callout{type="warning"}`. Content
// v3 ships MDC, so this needs no extra module — only a component in
// components/content/.
const props = withDefaults(
  defineProps<{
    type?: 'info' | 'tip' | 'warning' | 'danger';
    title?: string;
  }>(),
  { type: 'info' }
);

const styles = {
  info: {
    border: 'border-l-sky-500',
    icon: 'lucide:info',
    text: 'text-sky-600 dark:text-sky-400'
  },
  tip: {
    border: 'border-l-emerald-500',
    icon: 'lucide:lightbulb',
    text: 'text-emerald-600 dark:text-emerald-400'
  },
  warning: {
    border: 'border-l-amber-500',
    icon: 'lucide:triangle-alert',
    text: 'text-amber-600 dark:text-amber-400'
  },
  danger: {
    border: 'border-l-red-500',
    icon: 'lucide:octagon-alert',
    text: 'text-red-600 dark:text-red-400'
  }
};

const style = computed(() => styles[props.type]);
</script>

<template>
  <div
    class="my-4 rounded-r-md border border-l-4 bg-muted/40 px-4 py-3"
    :class="style.border"
  >
    <p
      v-if="title"
      class="mb-1 flex items-center gap-2 font-medium"
      :class="style.text"
    >
      <Icon :name="style.icon" class="size-4" />
      {{ title }}
    </p>
    <div class="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <slot />
    </div>
  </div>
</template>
