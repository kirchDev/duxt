<script setup lang="ts">
/**
 * THE WHOLE HEADING IS THE LINK, not just the marker beside it.
 *
 * A '#' that appears at -left-5 on hover is a target most readers never find,
 * and no touch device can hover onto it at all. The words are what someone aims
 * at when they want to link to a section.
 *
 * The marker stays, now decorative: it says the heading is anchored. It is
 * aria-hidden so the link is announced by the heading text itself, which also
 * drops the generic "anchor" label a screen reader used to read in its place.
 *
 * `scroll-mt-28` clears the whole sticky stack — the 57px header AND the
 * section row under it — because 20 (80px) only cleared the header and left an
 * anchored heading hiding behind the sections.
 *
 * The explanation sits here rather than in the template because a Prose heading
 * is instantiated once per heading: Vue keeps template comments in the rendered
 * HTML, so a comment there ships to the browser as many times as the page has
 * headings.
 */
defineProps<{ id?: string }>();
</script>

<template>
  <h2 :id="id" class="group scroll-mt-28">
    <a v-if="id" :href="`#${id}`" class="duxt-heading-link">
      <span class="duxt-anchor" aria-hidden="true">#</span>
      <slot />
    </a>
    <slot v-else />
  </h2>
</template>
