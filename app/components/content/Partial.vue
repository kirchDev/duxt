<script setup lang="ts">
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
 * A missing partial renders nothing rather than an error. A page whose install
 * note failed to resolve is still a readable page; the build says so instead —
 * see `modules/validate.ts`.
 */
const props = defineProps<{ name?: string }>();

const { data: partial } = await useAsyncData(
  () => `duxt-partial-${props.name}`,
  () =>
    props.name
      ? queryCollection('duxt_partials' as DuxtCollectionArg)
          .where('stem', 'LIKE', `%_partials/${props.name}`)
          .first()
      : Promise.resolve(null),
  { watch: [() => props.name] }
);
</script>

<template>
  <ContentRenderer v-if="partial" :value="partial" />
</template>
