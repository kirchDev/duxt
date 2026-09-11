<script setup lang="ts">
/**
 * An image in a page: theme-aware, responsive, and zoomable.
 *
 * TWO VARIANTS. A screenshot of a dark editor on a white page — or the reverse
 * — is the most common ugly thing in documentation, and CSS cannot fix it
 * because the pixels are wrong, not the frame. So a page may name a second
 * file:
 *
 *     ![The sidebar](/shots/sidebar.png){dark="/shots/sidebar-dark.png"}
 *
 * Named explicitly rather than guessed by convention. Deriving `-dark.png` from
 * the light path would 404 on every image that has no dark twin, and a broken
 * image is worse than a mismatched one. Both are rendered and CSS picks: a
 * `<picture>` with `prefers-color-scheme` would ignore the site's own toggle,
 * which is a class on `<html>` and not a media query.
 *
 * TWO REQUESTS, NOT ONE FILE. The page and the dialog ask for different widths
 * — `prose-image.ts` holds both policies and the reasoning. Until they existed
 * `NuxtImg` emitted a bare `src` with no `srcset`, so a 2400px screenshot was
 * downloaded whole onto a phone to be drawn into a 48rem column, and the dialog
 * showing it at full resolution was an accident of there being only one file.
 * A page overrides the in-page policy with `sizes`; the dialog keeps its own,
 * because a policy describing the prose column cannot describe a dialog.
 *
 * ZOOM, AND SOMETHING THAT SAYS SO. A screenshot scaled to a 48rem column is
 * often unreadable, and the browser's own zoom is not the answer when the image
 * is 2400px wide. Clicking opens it larger; Escape and a click outside close
 * it, both from the Dialog primitive rather than hand-rolled.
 *
 * The only affordance used to be `cursor-zoom-in`, which does not exist on a
 * touch device and is invisible in a screenshot of the page. The indicator is
 * therefore PERSISTENT rather than shown on hover: hover is the half of the
 * problem that already worked. It is decorative — `aria-hidden`, inside the one
 * button, never a second control — because a screen reader is told what the
 * button does by its label, and two focus stops for one image is worse than
 * none.
 *
 * ITS SURFACE IS OPAQUE, AND THAT IS THE WHOLE REASON. The chip used to be
 * `bg-background/75`, which let arbitrary image pixels through behind the
 * glyph — and a contrast ratio against an unknown photograph is not a ratio at
 * all. Opaque, the pair is `--muted-foreground` on `--background`, which
 * `tests/contrast.test.ts` already measures; the border is what separates the
 * chip itself from whatever it sits on. `check:a11y` cannot judge either
 * (jsdom has no computed colour), so the guarantee has to come from the
 * palette rather than from the rendered page.
 *
 * `zoom="false"` has to leave an image looking inert: no indicator, no ring,
 * no cursor, and no dialog to tab into.
 */
const props = withDefaults(
  defineProps<{
    src?: string;
    alt?: string;
    width?: string | number;
    height?: string | number;
    /** A second file for dark mode. */
    dark?: string;
    /** `false` turns the zoom off for a decorative image. */
    zoom?: boolean | string;
    /**
     * The in-page policy, in `@nuxt/image`'s own `sizes` syntax — `sm:50vw
     * md:400px`. For the image that is NOT as wide as the prose column: a logo,
     * a badge, a diagram set in a margin.
     */
    sizes?: string;
  }>(),
  {
    /**
     * ZOOM IS ON UNLESS A PAGE TURNS IT OFF, AND SAYING SO IS NOT OPTIONAL.
     *
     * Vue casts an ABSENT prop whose declared type includes `Boolean` to
     * `false` rather than to `undefined`. `zoom?: boolean | string` compiles to
     * `type: [Boolean, String]`, so every image that did not write `zoom="true"`
     * arrived here with `zoom === false` — and the zoom, the indicator, the
     * focus ring and the dialog were all switched off on every image in the
     * site. It survived from the day the component was written because nothing
     * in the repository rendered one: every `![…]` in the reference sits inside
     * a code block. `www/demo/docs/3.images.md` and `check:images` are the two
     * halves of making sure it cannot again.
     *
     * A default is what suppresses the cast — `isAbsent && !hasDefault` is the
     * condition on it — so this line is load-bearing, not documentation.
     */
    zoom: true
  }
);

const { t } = useI18n();

const open = ref(false);

const zoomable = computed(
  () => Boolean(props.src) && props.zoom !== false && props.zoom !== 'false'
);

const pageSizes = computed(() => proseImageSizes(props.sizes));

/**
 * The light file and its dark twin, each carrying whether a provider may touch
 * it.
 *
 * A list rather than four near-identical blocks in the template, and it is the
 * same list in the page and in the dialog — the two differ only in their sizing
 * policy and their classes, which is the point.
 */
type Variant = { src: string; theme: string; plain: boolean };

const variants = computed<Variant[]>(() => {
  const list: Variant[] = [];

  if (props.src) {
    list.push({
      src: props.src,
      // Hidden under the dark theme only when there is something to swap to.
      theme: props.dark ? 'block dark:hidden' : '',
      plain: proseImagePassThrough(props.src)
    });
  }

  if (props.dark) {
    list.push({
      src: props.dark,
      theme: 'hidden dark:block',
      plain: proseImagePassThrough(props.dark)
    });
  }

  return list;
});

/**
 * What a screen reader hears on the button.
 *
 * Two keys rather than one with an empty interpolation: a decorative image
 * carries no alt text, and "Enlarge image: " read aloud is worse than
 * "Enlarge image".
 */
const label = computed(() =>
  props.alt
    ? t('duxt.page.image.zoomNamed', { alt: props.alt })
    : t('duxt.page.image.zoom')
);

/** The dialog is named by the image, and by what it is only when the image is unnamed. */
const title = computed(() => props.alt || t('duxt.page.image.zoom'));

/** The dialog's policy, bound so the template reads a name rather than a constant. */
const zoomSizes = PROSE_IMAGE_ZOOM_SIZES;

/**
 * THE DIALOG'S FILES HAVE TO EXIST BEFORE ANYONE OPENS IT.
 *
 * A static build learns which image variants to generate from the ones it
 * rendered: `NuxtImg` appends every URL it emits to an `x-nitro-prerender`
 * header, and Nitro's crawler prerenders what that header names. The dialog is
 * not rendered until it opens, so on a generated site its variants were never
 * requested, never written, and the first click found a 404.
 *
 * Asking for the sizes here registers them without rendering anything —
 * `getSizes` runs each URL through the provider, and the provider is what
 * appends the header. The browser downloads none of it: no markup carries these
 * URLs until the dialog mounts.
 *
 * `prose-image.ts` decides WHICH images are on the list — an image with no
 * dialog to open must not have a set of dialog-sized files written for it.
 *
 * Prerender only. On a server that transforms on demand there is nothing to
 * generate ahead of time, and on the client this would be a wasted pass over
 * every image on the page.
 */
if (import.meta.server && import.meta.prerender) {
  const image = useImage();

  for (const src of proseImageZoomPrerenderSources(
    zoomable.value,
    variants.value.map((variant) => variant.src)
  )) {
    image.getSizes(src, { sizes: PROSE_IMAGE_ZOOM_SIZES });
  }
}
</script>

<template>
  <span class="my-6 block">
    <component
      :is="zoomable ? 'button' : 'span'"
      :type="zoomable ? 'button' : undefined"
      class="relative block w-fit max-w-full"
      :class="
        zoomable
          ? 'group ring-offset-background cursor-zoom-in rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none'
          : undefined
      "
      :aria-label="zoomable ? label : undefined"
      @click="zoomable && (open = true)"
    >
      <template v-for="variant in variants" :key="variant.src">
        <!-- A vector has no pixels to resample and an animation does not
             survive one: both are served exactly as committed. -->
        <img
          v-if="variant.plain"
          :src="variant.src"
          :alt="alt"
          :width="width"
          :height="height"
          loading="lazy"
          class="h-auto max-w-full rounded-lg border"
          :class="variant.theme"
        />
        <NuxtImg
          v-else
          :src="variant.src"
          :alt="alt"
          :width="width"
          :height="height"
          :sizes="pageSizes"
          loading="lazy"
          class="h-auto max-w-full rounded-lg border"
          :class="variant.theme"
        />
      </template>

      <span
        v-if="zoomable"
        aria-hidden="true"
        class="pointer-events-none absolute top-2 right-2 flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-sm transition-colors group-hover:text-foreground"
      >
        <Icon name="lucide:zoom-in" class="size-4" />
      </span>
    </component>

    <UiDialog v-if="zoomable" v-model:open="open">
      <UiDialogContent class="max-w-[min(96vw,80rem)] p-2">
        <UiDialogTitle class="sr-only">{{ title }}</UiDialogTitle>
        <template v-for="variant in variants" :key="variant.src">
          <img
            v-if="variant.plain"
            :src="variant.src"
            :alt="alt"
            class="max-h-[85vh] w-full rounded-md object-contain"
            :class="variant.theme"
          />
          <NuxtImg
            v-else
            :src="variant.src"
            :alt="alt"
            :sizes="zoomSizes"
            class="max-h-[85vh] w-full rounded-md object-contain"
            :class="variant.theme"
          />
        </template>
      </UiDialogContent>
    </UiDialog>
  </span>
</template>
