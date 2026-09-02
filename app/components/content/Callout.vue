<script setup lang="ts">
// MDC: `::callout{type="warning"}`. shadcn's Alert is the base, but the icon
// column is declared here rather than left to Alert's `has-[>svg]` selector —
// that depends on the icon rendering as a direct svg child, and it collapsed
// to a zero-width column twice, printing the icon on top of the title.
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
    class: 'border-sky-500/30 bg-sky-500/5',
    text: 'text-sky-500'
  },
  tip: {
    icon: 'lucide:lightbulb',
    class: 'border-emerald-500/30 bg-emerald-500/5',
    text: 'text-emerald-500'
  },
  warning: {
    icon: 'lucide:triangle-alert',
    class: 'border-amber-500/30 bg-amber-500/5',
    text: 'text-amber-500'
  },
  danger: {
    icon: 'lucide:octagon-alert',
    class: 'border-red-500/30 bg-red-500/5',
    text: 'text-red-500'
  }
};

const variant = computed(() => variants[props.type]);
</script>

<template>
  <Alert class="my-6 flex gap-3 border" :class="variant.class">
    <Icon
      :name="icon ?? variant.icon"
      class="mt-0.5 size-4 shrink-0"
      :class="variant.text"
    />

    <div class="min-w-0 flex-1">
      <AlertTitle v-if="title" class="mb-1 font-medium" :class="variant.text">
        {{ title }}
      </AlertTitle>
      <AlertDescription
        class="text-foreground/80 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2"
      >
        <slot />
      </AlertDescription>
    </div>
  </Alert>
</template>
