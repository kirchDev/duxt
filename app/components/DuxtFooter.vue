<script setup lang="ts">
const duxt = useDuxtConfig();
const localeLink = useDuxtLink();

/**
 * The layer's own line, in the middle.
 *
 * Version and repository come from duxt's `package.json`, read at build time —
 * release-please bumps that file, and a second copy of the number is a copy
 * that is wrong from the first release onwards.
 *
 * Switchable, because a layer that cannot be told to stop naming itself is
 * adware. `poweredBy: false` drops it.
 */
const poweredBy = computed(() =>
  duxt.poweredBy !== false && duxt.layerVersion
    ? { version: duxt.layerVersion, to: duxt.layerRepository }
    : undefined
);

/**
 * However many the consumer configured — never assumed to be two.
 *
 * Named rather than inlined because the row has to know whether it is empty:
 * on the stacked mobile layout an empty row is still a flex item, and the
 * column's gap would draw a blank line under the attribution for links that do
 * not exist.
 */
const legal = computed(() => duxt.footer?.legal ?? []);
</script>

<template>
  <!-- Only what a page footer owes: whose site this is, and the links the law
       asks for. Navigation lives in the header and the sidebar, so repeating it
       down here buys nothing.

       ONE ROW FROM `sm` UP, A CENTERED STACK BELOW IT. The three groups are the
       same three either way — only the axis and the alignment change, which is
       why this is two sets of utilities on the existing markup rather than a
       second template. Narrow, the groups have unrelated widths and left-
       aligning them reads as a ragged column rather than a composition, so the
       stack is centered and takes the order the eye wants: whose site, whose
       copyright, what built it, what the law asks for. -->
  <footer class="mt-16 border-t">
    <div
      class="mx-auto flex max-w-[90rem] flex-col items-center gap-2 px-4 py-5 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:gap-3 sm:text-start lg:px-8"
    >
      <!-- Brand and copyright: two centered lines below `sm`, one wrapping row
           above it. Splitting them is the whole reason the stack has four lines
           and not three — sharing a row, they wrap against each other at the
           narrow widths where there is least room to spare. -->
      <div
        class="flex flex-col items-center gap-2 sm:flex-1 sm:basis-0 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1"
      >
        <NuxtLink
          :to="localeLink('/')"
          class="inline-flex items-center gap-2 font-medium text-foreground"
        >
          <DuxtBrand size="sm" />
        </NuxtLink>
        <span v-if="duxt.footer?.copyright">{{ duxt.footer.copyright }}</span>
      </div>

      <!-- The whole phrase is the link, not just the name. It is a bigger
           target for one destination, and in a screen reader's link list
           "Powered by duxt v0.0.0" reads as a sentence where a bare "Powered
           by" beside it would read as nothing at all. -->
      <p v-if="poweredBy" class="sm:flex-1 sm:basis-0 sm:text-center">
        <a
          :href="poweredBy.to"
          target="_blank"
          rel="noopener"
          class="transition-colors hover:text-foreground"
        >
          {{ $t('duxt.footer.poweredBy') }}
          <!-- A real non-breaking space, not a flex gap and not markup
               whitespace. Vue's `condense` deletes a whitespace-only text node
               that contains a newline, which is what left "duxtv0.0.0"; a CSS
               gap puts the space back on screen and nowhere else, so the name
               still copies and reads aloud as one word. Non-breaking because a
               version belongs to the name it follows. -->
          <span class="font-medium text-foreground">duxt</span>&nbsp;<span
            class="font-mono"
            >v{{ poweredBy.version }}</span
          >
        </a>
      </p>

      <!-- A consumer's legal links belong to the consumer: the layer offers the
           row and ships nothing in it, because an imprint is never the
           template's to claim. However many there are, they stay one wrapping
           row and wrap together.

           HIDDEN RATHER THAN DROPPED, and only below `sm`. An empty row must
           not draw a blank line under the attribution, but `v-if` would take
           the element out of the desktop row too — and there its
           `flex-1 basis-0` is a third of what holds the attribution in the
           middle of the page. Removing it would re-center that line, which is
           a change to the desktop layout and not this one's to make. -->
      <div
        class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:flex-1 sm:basis-0 sm:justify-end"
        :class="{ 'max-sm:hidden': !legal.length }"
      >
        <NuxtLink
          v-for="link in legal"
          :key="link.to"
          :to="localeLink(link.to)"
          :target="link.external ? '_blank' : undefined"
          :rel="link.external ? 'noopener' : undefined"
          class="transition-colors hover:text-foreground"
        >
          {{ link.label }}
        </NuxtLink>
      </div>
    </div>
  </footer>
</template>
