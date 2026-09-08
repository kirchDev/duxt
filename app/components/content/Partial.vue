<script setup lang="ts">
import { partialsCollection } from '../../../sources-resolve';

/**
 * `:partial{name="install"}` — a block written once and rendered in every
 * source that needs it.
 *
 * Content ships no include directive, and across repositories that is a gap
 * with no workaround: an install note that must read the same in three projects
 * is copied into three projects and drifts. The partials collection is built
 * from every source's `_partials/` folder, so a block defined in one repository
 * is available to the pages of another.
 *
 * TRANSLATED like the pages around it, and through the same chain: a partials
 * collection per language, tried best first, falling back to the untranslated
 * original. Without that a German page including `:partial{name="install"}`
 * renders an English block in the middle of German prose — which is worse than
 * an untranslated page, because nothing on the page says it happened.
 *
 * A missing partial renders nothing rather than an error. A page whose install
 * note failed to resolve is still a readable page; the build says so instead —
 * see `modules/validate.ts`.
 */
const props = defineProps<{ name?: string }>();

const { source, fallbacks } = useDuxtCollection();

/**
 * The collections to try, best first — the page's own chain, mapped onto the
 * partials collections. The same order, deliberately: a page and the blocks it
 * includes falling back to different languages is how a page ends up half
 * translated.
 */
const chain = computed(() =>
  [
    ...new Set(
      [source.value, ...fallbacks.value]
        .filter(Boolean)
        .map((entry) => partialsCollection(entry!))
    )
  ].map((name) => name as DuxtCollectionArg)
);

const { data: partial } = await useAsyncData(
  () => `duxt-partial-${props.name}`,
  async () => {
    if (!props.name) return null;

    for (const collection of chain.value) {
      const found = await queryCollection(collection)
        .where('stem', 'LIKE', `%_partials/${props.name}`)
        .first();

      if (found) return found;
    }

    return null;
  },
  { watch: [() => props.name, chain] }
);
</script>

<template>
  <ContentRenderer v-if="partial" :value="partial" />
</template>
