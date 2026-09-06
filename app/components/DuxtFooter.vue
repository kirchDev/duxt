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
</script>

<template>
  <!-- One line, and only what a page footer owes: whose site this is, and the
       links the law asks for. Navigation lives in the header and the sidebar,
       so repeating it down here buys nothing. -->
  <footer class="mt-16 border-t">
    <div
      class="mx-auto flex max-w-[90rem] flex-col gap-3 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8"
    >
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <NuxtLink
          :to="localeLink('/')"
          class="inline-flex items-center gap-2 font-medium text-foreground"
        >
          <Icon name="lucide:book-open-text" class="size-4 text-primary" />
          {{ duxt.title }}
        </NuxtLink>
        <span v-if="duxt.footer?.copyright">{{ duxt.footer.copyright }}</span>
      </div>

      <!-- The whole phrase is the link, not just the name. It is a bigger
           target for one destination, and in a screen reader's link list
           "Powered by duxt v0.0.0" reads as a sentence where a bare "Powered
           by" beside it would read as nothing at all. -->
      <p v-if="poweredBy" class="sm:text-center">
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
           template's to claim. -->
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <NuxtLink
          v-for="link in duxt.footer?.legal ?? []"
          :key="link.to"
          :to="localeLink(link.to)"
          :target="link.external ? '_blank' : undefined"
          :rel="link.external ? 'noopener' : undefined"
          class="transition-colors hover:text-foreground"
        >
          {{ link.label }}
        </NuxtLink>

        <div v-if="duxt.links?.length" class="-mr-2 flex items-center gap-1">
          <Button
            v-for="link in duxt.links"
            :key="link.to"
            as-child
            variant="ghost"
            size="icon"
            class="size-8 text-muted-foreground"
          >
            <NuxtLink
              :to="link.to"
              :aria-label="asText(link.label)"
              :title="asText(link.label)"
              target="_blank"
              rel="noopener"
            >
              <Icon v-if="link.icon" :name="link.icon" class="size-4" />
            </NuxtLink>
          </Button>
        </div>
      </div>
    </div>
  </footer>
</template>
