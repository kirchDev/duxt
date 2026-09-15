<script setup lang="ts">
/**
 * An HTTP method, as the chip every reference draws it as.
 *
 * A `UiBadge` WITH A TONE, not a pill of its own. The shape, the border, the
 * radius and the sizing are the badge's — the same object the rest of the site
 * marks things with — and what this component adds is the one thing a badge
 * cannot know: which colour a method has. It was its own `span` before, built
 * out of the same parts by hand, and it drifted from them the moment the badge
 * changed.
 *
 * The colour is not decoration: a reader scanning a list of thirty endpoints
 * finds the destructive one by its colour long before reading the word.
 *
 * `success` and `destructive` are the palette's own tokens; the rest are
 * Tailwind's ramp, exactly as `Callout.vue` uses it — the theme has no token
 * for "amber" and inventing four would put four more pairs into a palette a
 * consumer overrides. A tenth of the colour as surface and a fifth as border is
 * the badge's own construction, so every method reads as one of its badges and
 * every one of them clears the contrast floor in both themes.
 */
const props = defineProps<{ method: string; class?: string }>();

const tones: Record<string, string> = {
  get: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  post: 'border-success/20 bg-success/10 text-success',
  put: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  patch:
    'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-400',
  delete: 'border-destructive/20 bg-destructive/10 text-destructive',
  head: 'border-border bg-muted text-muted-foreground',
  options: 'border-border bg-muted text-muted-foreground',
  trace: 'border-border bg-muted text-muted-foreground'
};

const tone = computed(
  () =>
    tones[props.method.toLowerCase()] ??
    'border-border bg-muted text-muted-foreground'
);
</script>

<template>
  <!-- `leading-none` and a fixed height rather than vertical padding around a
       line box: an uppercase monospace face leaves more room under the caps
       than over them, so the word sat visibly high in a padded chip. With no
       leading of its own the text box is the glyphs, and centring is exact.
       Callers still set the width, which is what lines a column of methods up
       beside a column of paths. -->
  <UiBadge
    :class="[
      'h-5 px-1.5 font-mono text-[0.6875rem] leading-none font-semibold tracking-wide uppercase',
      tone,
      props.class
    ]"
  >
    {{ method }}
  </UiBadge>
</template>
