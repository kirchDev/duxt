<script setup lang="ts">
/**
 * The site's own notices — a release, a migration window, an outage.
 *
 * NOT the version and translation banners beside it: those describe the page a
 * reader is on and the layer decides when to draw them. This one says nothing
 * until a consumer writes `duxt.announcements`, and then says exactly what they
 * wrote.
 *
 * CLIENT-ONLY, and it has to be. Two of the three things this draws depend on
 * the reader rather than on the build: whether they have already closed the
 * notice, which lives in their browser, and whether the notice is inside its
 * window, which is their clock. Every page here is prerendered, so a banner
 * rendered at build time would carry a decision taken hours or weeks earlier —
 * an announcement that expired overnight would still be in the HTML, and one a
 * reader dismissed would flash back on every navigation before the script
 * caught up.
 */
const props = defineProps<{ placement: DuxtAnnouncementPlacement }>();

const { visible, dismiss } = useDuxtAnnouncements(props.placement);
const localeLink = useDuxtLink();

/**
 * The two full-width placements belong to the header; the third to the page.
 *
 * `above-header` and `below-header` run to the browser edge and align their
 * contents with the header above or below them, so the sentence starts where
 * the site's name does. `above-content` sits in the document column with the
 * version and translation banners, and takes their shape — a reader learns what
 * a bordered notice over a page means once.
 */
const edge = computed(() => props.placement !== 'above-content');

const strip = useTemplateRef<HTMLElement>('strip');

/**
 * Dismiss, and then put focus somewhere a keyboard reader can carry on from.
 *
 * The button that was just activated leaves the DOM with the row it sat in, and
 * a focused element that disappears drops focus onto `<body>` — which sends a
 * screen reader back to the top of the document, several notices above where
 * the reader actually was. So focus moves to whatever is left: the strip itself
 * while it still holds an announcement, and the page's own main region once the
 * last one is closed.
 */
async function close(key: string) {
  dismiss(key);
  await nextTick();
  (strip.value ?? document.getElementById('duxt-main'))?.focus();
}
</script>

<template>
  <ClientOnly>
    <!-- `role="status"` because the strip ARRIVES: it is drawn after hydration,
         so a reader already reading the page is told once, politely, rather
         than having a banner appear silently above them. -->
    <div
      v-if="visible.length"
      ref="strip"
      role="status"
      tabindex="-1"
      class="outline-none"
      :class="
        edge
          ? 'w-full divide-y border-b bg-muted/40'
          : 'mb-6 divide-y rounded-md border bg-muted/30'
      "
    >
      <div
        v-for="entry in visible"
        :key="entry.key"
        :class="
          edge
            ? 'mx-auto flex max-w-[90rem] items-start gap-3 px-4 py-2.5 lg:px-8'
            : 'flex items-start gap-3 px-3 py-2.5'
        "
      >
        <Icon
          name="lucide:megaphone"
          class="mt-0.5 size-4 shrink-0 text-muted-foreground"
        />

        <!-- `min-w-0` and `flex-wrap`, because the sentence is the part that
             grows: a German or Portuguese translation of an English notice runs
             half as long again, and on a phone it has to wrap under itself
             rather than push the close button off the row. -->
        <p
          class="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-foreground text-pretty"
        >
          <span>{{ entry.text }}</span>

          <NuxtLink
            v-if="entry.link?.to"
            :to="localeLink(entry.link.to)"
            :target="entry.link.external ? '_blank' : undefined"
            :rel="entry.link.external ? 'noopener' : undefined"
            class="font-medium underline underline-offset-4"
          >
            {{ entry.link.label }}
          </NuxtLink>
        </p>

        <UiButton
          variant="ghost"
          size="icon"
          class="-my-1 -me-2 size-8 shrink-0 text-muted-foreground hover:text-foreground"
          :aria-label="$t('duxt.announcement.dismiss')"
          @click="close(entry.key)"
        >
          <Icon name="lucide:x" class="size-4" />
        </UiButton>
      </div>
    </div>
  </ClientOnly>
</template>
