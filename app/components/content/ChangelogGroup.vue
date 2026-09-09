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
 * A LABEL, NOT A HEADLINE. The name is set small, upper-case and in the
 * group's own tone, above a list that closes up under it — the shape a release
 * note actually has. Set as a 20-pixel headline it claimed the weight of a
 * chapter for a word that names four bullet points, and six of them down a page
 * read as six sections rather than as one release. It is still an `<h2>`: the
 * outline, the contents column and the anchor are unchanged, and only its
 * setting says what it is worth.
 *
 * The COLOUR is the one thing added to the name, and it is the same colour the
 * group has on the overview — see `changelogTone`. Here it is the tone's TEXT
 * pair rather than the dot's fill: a run of words and a six-pixel dot do not
 * clear contrast at the same lightness. It stays a hint and never a meaning: a
 * name the hint list does not know still gets a stable colour of its own, which
 * is what makes the same kind of change scannable down a page of forty releases
 * in any language.
 *
 * The `⚠` release-please prefixes its breaking block with is DRAWN AWAY rather
 * than parsed away — see `changelogLabel`. The name it matches, anchors and
 * filters on is still the file's own, whole.
 *
 * The entries' own markers are GREY, and deliberately not the tone. The colour
 * is already stated once, in the label directly above them; stated again on
 * every line it stopped being a signal and became a page of confetti — which is
 * the failure a hint makes when it is repeated rather than placed. They are
 * styled from `duxt.css`, because they arrive as Markdown from the slot.
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
  <section class="mt-9 first:mt-5">
    <!-- Flex rather than inline runs, which is what put the count a few pixels
         off the word beside it: a badge set with `align-middle` sits on the
         font's own middle, and neither an upper-case label nor a 0.75rem number
         is centred there. A flex line centres the boxes, and `leading-none`
         is what makes the number's box its digits — with the inherited line
         height it sits low by the difference. -->
    <h2
      :id="anchor"
      class="duxt-label group mb-3 flex scroll-mt-28 items-center gap-2"
      :class="tone.text"
    >
      <a v-if="anchor" :href="`#${anchor}`" class="duxt-heading-link">
        <span class="duxt-anchor" aria-hidden="true">#</span>
        {{ changelogLabel(name) }}
      </a>
      <template v-else>{{ changelogLabel(name) }}</template>

      <!-- Outside the link: a count is a fact about the group, not part of the
           words it is called. A `span`, because a heading holds phrasing
           content. Its own tracking, because the label's letter-spacing is for
           upper-case words and pushes a number away from nothing. -->
      <span
        v-if="count"
        class="text-xs leading-none font-medium tracking-normal text-muted-foreground tabular-nums"
      >
        {{ count }}
      </span>
    </h2>

    <div class="duxt-release">
      <slot />
    </div>
  </section>
</template>
