<script setup lang="ts">
/**
 * One group of a release — "Features", "Bug Fixes", whatever the file said.
 *
 * MDC: `::changelog-group{name}`, written by `sections-changelog.ts` around the
 * entries it found under one heading. The NAME IS THE FILE'S OWN, verbatim and
 * untranslated: release-please, changesets and Keep a Changelog each write
 * their own set, in the language the project is kept in, and a layer that
 * mapped them onto a fixed taxonomy would drop the first heading it did not
 * recognise. The count beside it is the entries this group lists.
 *
 * The entries themselves arrive in the SLOT, as the Markdown they were written
 * as — so the search indexes them, `llms-full.txt` carries them and the copy
 * button hands a model prose rather than a component call.
 */
const props = defineProps<{ name: string; count?: number }>();

/**
 * The heading's anchor, so one group of one release can be linked to.
 *
 * Built here rather than taken from Content: a heading a component draws is not
 * in the document outline Content slugifies, so nothing upstream has an id to
 * give. Empty for a name with no ASCII in it at all, which drops the link
 * rather than pointing every group at `#`.
 */
const anchor = computed(
  () =>
    props.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || undefined
);
</script>

<template>
  <section class="mt-8 first:mt-6">
    <h2 :id="anchor" class="group scroll-mt-28">
      <a v-if="anchor" :href="`#${anchor}`" class="duxt-heading-link">
        <span class="duxt-anchor" aria-hidden="true">#</span>
        {{ name }}
      </a>
      <template v-else>{{ name }}</template>

      <!-- Outside the link and outside the typeset flow: a count is a fact
           about the group, not part of the words it is called. A `span`,
           because a heading holds phrasing content and the badge's own default
           is a `div`. -->
      <Badge
        v-if="count"
        as="span"
        variant="secondary"
        class="not-typeset ml-2 align-middle"
      >
        {{ count }}
      </Badge>
    </h2>

    <slot />
  </section>
</template>
