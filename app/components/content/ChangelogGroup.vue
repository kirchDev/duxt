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
 *
 * The COLOUR is the one thing added to the name, and it is the same colour the
 * group has on the overview — see `changelogTone`. It is a hint and never a
 * meaning: a name the hint list does not know still gets a stable colour of its
 * own, which is what makes the same kind of change scannable down a page of
 * forty releases in any language.
 */
const props = defineProps<{ name: string; count?: number }>();

/**
 * The heading's anchor, so one group of one release can be linked to.
 *
 * Shared with the contents column, which is built from the page's AST and
 * never sees this component render — a slug computed in both places is a
 * contents column whose links go nowhere. See `app/utils/changelog.ts`.
 */
const anchor = computed(() => changelogAnchor(props.name));

const tone = computed(() => changelogTone(props.name));
</script>

<template>
  <section class="mt-10 first:mt-6">
    <!-- Flex rather than inline runs, which is what put the count a few pixels
         off the word beside it: a badge set with `align-middle` sits on the
         font's own middle, and a semibold heading's middle is not where a
         0.75rem pill looks centred. A flex line centres the boxes.

         Nothing else is added to the heading — no rule under it, no pill around
         the number. A release page is Markdown, and it should read as the rest
         of the site's Markdown does; the count is set in the heading's own
         colour scale at a fraction of its size, which is as much weight as a
         fact about the group deserves. -->
    <h2 :id="anchor" class="group flex scroll-mt-28 items-center gap-2.5">
      <!-- The dot and the `#` marker want the same place, and before this they
           took it: the marker `typeset` reveals on hover is positioned against
           the heading's text and landed straight on top of the dot. So the dot
           yields — it fades out exactly as the marker fades in, which is also
           the honest reading of the hover, since the anchor is what the
           heading offers at that moment. -->
      <span
        aria-hidden="true"
        class="size-2 shrink-0 rounded-full transition-opacity group-focus-within:opacity-0 group-hover:opacity-0"
        :class="tone.dot"
      />

      <a v-if="anchor" :href="`#${anchor}`" class="duxt-heading-link">
        <span class="duxt-anchor" aria-hidden="true">#</span>
        {{ name }}
      </a>
      <template v-else>{{ name }}</template>

      <!-- Outside the link: a count is a fact about the group, not part of the
           words it is called. A `span`, because a heading holds phrasing
           content. -->
      <span
        v-if="count"
        class="text-[0.7em] font-normal text-muted-foreground tabular-nums"
      >
        {{ count }}
      </span>
    </h2>

    <slot />
  </section>
</template>
