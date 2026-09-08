<script setup lang="ts">
/**
 * An HTTP method, as the chip every reference draws it as.
 *
 * The colour is the only thing this adds, and it is not decoration: a reader
 * scanning a list of thirty endpoints finds the destructive one by its colour
 * long before reading the word.
 *
 * `success` and `destructive` are the palette's own tokens; the rest are
 * Tailwind's ramp, exactly as `Callout.vue` uses it — the theme has no token
 * for "amber" and inventing four would put four more pairs into a palette a
 * consumer overrides. The tinted surface with a matching ring keeps every one
 * of them well clear of the contrast floor in both themes.
 */
const props = defineProps<{ method: string; class?: string }>();

const tones: Record<string, string> = {
  get: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/30',
  post: 'bg-success/10 text-success ring-success/30',
  put: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30',
  patch:
    'bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/30',
  delete: 'bg-destructive/10 text-destructive ring-destructive/30',
  head: 'bg-muted text-muted-foreground ring-border',
  options: 'bg-muted text-muted-foreground ring-border',
  trace: 'bg-muted text-muted-foreground ring-border'
};

const tone = computed(
  () =>
    tones[props.method.toLowerCase()] ??
    'bg-muted text-muted-foreground ring-border'
);
</script>

<template>
  <!-- A FIXED HEIGHT and `leading-none`, rather than vertical padding around a
       line box. `items-center` centres the chip in its row correctly either
       way, but the glyphs inside it were not centred in the chip: an uppercase
       monospace face leaves more room under the caps than over them, so the
       word sat visibly high. With no leading of its own the text box is the
       glyphs, and centring it is exact. Callers set width and horizontal
       padding; the height is the component's. -->
  <span
    class="inline-flex h-5 shrink-0 items-center justify-center rounded px-1.5 font-mono text-[0.6875rem] leading-none font-semibold tracking-wide uppercase ring-1 ring-inset"
    :class="[tone, props.class]"
  >
    {{ method }}
  </span>
</template>
