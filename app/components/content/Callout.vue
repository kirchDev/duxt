<script setup lang="ts">
// MDC: `::callout{type="warning"}`. Built on shadcn's Alert so a consumer that
// restyles Alert restyles callouts with it.
const props = withDefaults(
  defineProps<{
    type?: 'info' | 'tip' | 'warning' | 'danger';
    title?: string;
    icon?: string;
  }>(),
  { type: 'info' }
);

const variants = {
  info: {
    icon: 'lucide:info',
    class: 'border-sky-500/40 text-sky-700 dark:text-sky-300'
  },
  tip: {
    icon: 'lucide:lightbulb',
    class: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
  },
  warning: {
    icon: 'lucide:triangle-alert',
    class: 'border-amber-500/40 text-amber-700 dark:text-amber-300'
  },
  danger: {
    icon: 'lucide:octagon-alert',
    class: 'border-red-500/40 text-red-700 dark:text-red-300'
  }
};

const variant = computed(() => variants[props.type]);
</script>

<template>
  <Alert class="my-6 bg-muted/40" :class="variant.class">
    <Icon :name="icon ?? variant.icon" class="size-4" />
    <AlertTitle v-if="title">{{ title }}</AlertTitle>
    <AlertDescription
      class="text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2"
    >
      <slot />
    </AlertDescription>
  </Alert>
</template>
