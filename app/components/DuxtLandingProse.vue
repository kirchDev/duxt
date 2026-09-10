<script setup lang="ts">
/**
 * The words half of a band: eyebrow, heading, paragraph, checked list, link.
 *
 * Extracted because a band may need two of them. A split try-it client is two
 * rows — the form, then the samples — and each row wants its own sentence
 * saying what the reader is looking at; without this they were one block of
 * markup copied twice, which is how the second copy stops matching the first.
 *
 * THE HEADING LEVEL IS A PROP, not a fixed `h2`. The band's own title is the
 * `h2` its `aria-labelledby` points at; a second row inside the same section is
 * a part of it, and an `h2` there would announce a section that does not exist.
 */
withDefaults(
  defineProps<{
    prose: DuxtResolved<DuxtShowcaseProse>;
    /** The DOM id the band's section is labelled by. Only the `h2` needs one. */
    headingId?: string;
    level?: 2 | 3;
  }>(),
  { level: 2 }
);

const localeLink = useDuxtLink();
</script>

<template>
  <div>
    <p
      v-if="prose.badge"
      class="mb-4 flex items-center gap-2 text-sm font-medium text-primary"
    >
      <span
        v-if="prose.icon"
        class="flex size-7 items-center justify-center rounded-lg border bg-muted/50"
      >
        <Icon :name="prose.icon" class="size-4" />
      </span>
      {{ prose.badge }}
    </p>

    <component
      :is="`h${level}`"
      :id="headingId"
      class="text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
    >
      {{ prose.title }}
    </component>

    <p
      v-if="prose.description"
      class="mt-4 text-base text-muted-foreground text-pretty"
    >
      {{ prose.description }}
    </p>

    <ul v-if="prose.bullets?.length" class="mt-6 space-y-3">
      <li
        v-for="bullet in prose.bullets"
        :key="bullet.label"
        class="flex items-start gap-3 text-sm"
      >
        <Icon
          :name="bullet.icon ?? 'lucide:check'"
          class="mt-0.5 size-4 shrink-0 text-primary"
        />
        <span class="text-pretty">{{ bullet.label }}</span>
      </li>
    </ul>

    <UiButton v-if="prose.action" as-child variant="link" class="mt-6 px-0">
      <NuxtLink
        :to="localeLink(prose.action.to ?? '/')"
        :target="prose.action.external ? '_blank' : undefined"
        :rel="prose.action.external ? 'noopener' : undefined"
      >
        {{ prose.action.label }}
        <Icon
          :name="
            prose.action.external
              ? 'lucide:arrow-up-right'
              : 'lucide:arrow-right'
          "
          class="size-4"
        />
      </NuxtLink>
    </UiButton>
  </div>
</template>
