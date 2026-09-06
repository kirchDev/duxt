<script setup lang="ts">
/**
 * The visible half of the version problem.
 *
 * `canonical` and `noindex` tell a crawler which version to serve; they tell
 * the reader nothing. Someone who arrived on v0.7.0 from a search result, or
 * from a link in an old issue, sees documentation that looks exactly like the
 * current one. Either half alone leaves one audience wrong, so the head tags in
 * `[...slug].vue` and this banner ship together.
 */
const { current, kind, preferred, preferredPath, shouldWarn } =
  useDuxtVersion();
const localeLink = useDuxtLink();

const message = computed(() => `duxt.version.${kind.value}`);

/**
 * An upcoming version is not a mistake to correct.
 *
 * Its reader is told what changes under them, not to upgrade — so the link out
 * is offered only where going to the current version is actually the answer.
 */
const offersUpgrade = computed(() =>
  ['old', 'deprecated', 'eol'].includes(kind.value)
);

/**
 * Drawn as a Callout, because the theme already has a notice and this is one.
 *
 * The first version of this invented a second: a full coloured border over a
 * tinted surface, beside a Callout three paragraphs below it in the same quiet
 * style. Two notice styles on one page is one too many — a reader learns what a
 * bordered panel means once. So the colour sits on the icon and a thin left
 * rule, the surface stays close to the page, and the state reads as a title
 * with the sentence beneath it.
 *
 * Same palette as `Callout`'s variants, on purpose: sky for information, amber
 * for old, red for over. Whole class names rather than composed ones, because
 * Tailwind scans source text and a class assembled at runtime is not in the
 * stylesheet.
 */
const TONES = {
  upcoming: {
    rule: 'border-l-sky-500',
    text: 'text-sky-500',
    icon: 'lucide:flask-conical'
  },
  old: {
    rule: 'border-l-amber-500',
    text: 'text-amber-500',
    icon: 'lucide:triangle-alert'
  },
  deprecated: {
    rule: 'border-l-red-500',
    text: 'text-red-500',
    icon: 'lucide:triangle-alert'
  },
  eol: {
    rule: 'border-l-red-500',
    text: 'text-red-500',
    icon: 'lucide:circle-off'
  }
} as const;

const tone = computed(
  () => TONES[kind.value as keyof typeof TONES] ?? TONES.old
);
</script>

<template>
  <!-- The icon belongs to the FIRST LINE of the text, not to a line of its own.
       As siblings of one flex row the sentence became its own item and wrapped
       below, leaving the icon stranded above it. -->
  <Alert
    v-if="shouldWarn"
    role="status"
    class="mb-6 flex items-start gap-2.5 rounded-md border border-l-2 bg-muted/30 px-3 py-2.5"
    :class="tone.rule"
  >
    <Icon
      :name="tone.icon"
      class="mt-[3px] size-4 shrink-0"
      :class="tone.text"
    />

    <div class="min-w-0 flex-1">
      <AlertTitle class="mb-0.5 font-medium text-foreground">
        {{ $t(`duxt.version.titles.${kind}`) }}
      </AlertTitle>

      <AlertDescription class="text-muted-foreground">
        {{
          $t(message, {
            version: current?.version ?? '',
            preferred: preferred?.version ?? ''
          })
        }}

        <NuxtLink
          v-if="offersUpgrade && preferred"
          :to="localeLink(preferredPath)"
          class="font-medium text-foreground underline underline-offset-4"
        >
          {{ $t('duxt.version.goToCurrent', { preferred: preferred.version }) }}
        </NuxtLink>
      </AlertDescription>
    </div>
  </Alert>
</template>
