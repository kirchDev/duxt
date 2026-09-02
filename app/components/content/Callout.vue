<script setup lang="ts">
// MDC: `::callout{type="warning"}`. Quieter than a coloured panel — the colour
// sits on the icon and a thin left rule, the surface stays close to the page,
// and the title reads as text rather than as a warning label.
const props = withDefaults(
  defineProps<{
    type?: 'info' | 'tip' | 'warning' | 'danger';
    title?: string;
    icon?: string;
  }>(),
  { type: 'info' }
);

const variants = {
  info: { icon: 'lucide:info', rule: 'border-l-sky-500', text: 'text-sky-500' },
  tip: {
    icon: 'lucide:lightbulb',
    rule: 'border-l-emerald-500',
    text: 'text-emerald-500'
  },
  warning: {
    icon: 'lucide:triangle-alert',
    rule: 'border-l-amber-500',
    text: 'text-amber-500'
  },
  danger: {
    icon: 'lucide:octagon-alert',
    rule: 'border-l-red-500',
    text: 'text-red-500'
  }
};

const variant = computed(() => variants[props.type]);
</script>

<template>
  <Alert
    class="my-6 flex gap-3 rounded-md border border-l-2 bg-muted/30 py-3"
    :class="variant.rule"
  >
    <Icon
      :name="icon ?? variant.icon"
      class="mt-0.5 size-4 shrink-0"
      :class="variant.text"
    />

    <div class="min-w-0 flex-1">
      <AlertTitle v-if="title" class="mb-1 font-medium text-foreground">
        {{ title }}
      </AlertTitle>
      <AlertDescription
        class="text-muted-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_a]:text-foreground [&_code]:text-foreground [&_p]:my-2"
      >
        <slot />
      </AlertDescription>
    </div>
  </Alert>
</template>
