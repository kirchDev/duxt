<script setup lang="ts">
// MDC: `::callout{type="warning"}`. Built on shadcn's Alert, whose grid places
// the icon in its own column — the icon must render as an svg for that to
// match, which is why the layer runs @nuxt/icon in svg mode.
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
    class: 'border-sky-500/30 bg-sky-500/5 [&>svg]:text-sky-500'
  },
  tip: {
    icon: 'lucide:lightbulb',
    class: 'border-emerald-500/30 bg-emerald-500/5 [&>svg]:text-emerald-500'
  },
  warning: {
    icon: 'lucide:triangle-alert',
    class: 'border-amber-500/30 bg-amber-500/5 [&>svg]:text-amber-500'
  },
  danger: {
    icon: 'lucide:octagon-alert',
    class: 'border-red-500/30 bg-red-500/5 [&>svg]:text-red-500'
  }
};

const variant = computed(() => variants[props.type]);
</script>

<template>
  <Alert class="my-6" :class="variant.class">
    <Icon :name="icon ?? variant.icon" class="size-4" />
    <AlertTitle v-if="title" class="font-medium">{{ title }}</AlertTitle>
    <AlertDescription
      class="text-foreground/80 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
    >
      <slot />
    </AlertDescription>
  </Alert>
</template>
