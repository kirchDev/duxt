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
 *
 * THE VIEWER IS A LIGHTBOX, NOT A CARD. It used to be the default dialog — a
 * bordered box with a title bar — and a picture framed by chrome reads as a
 * form, not as the picture. It now takes the whole viewport over a blurred,
 * darkened page: controls float in a row of their own ABOVE the image and the
 * alt text sits BELOW it, so neither ever covers a pixel (`check:images`
 * measures exactly that). The surface is dark in both colour modes, which is
 * why its controls are white-on-translucent rather than theme tokens — a
 * lightbox that turned white in light mode would glare.
 *
 * It ZOOMS, because a screenshot fitted to a screen is still often too small to
 * read: the wheel zooms around the cursor, a pinch around the fingers, a click
 * on the image to 200% at that point and back, `+`, `-` and `0` from the
 * keyboard, and a zoomed image is dragged to pan. The toolbar says the level
 * and resets it. Clicking the empty space around the image closes, as every
 * viewer a reader already knows does. The original opens in a tab of its own —
 * the one the current theme shows.
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
    /**
     * A CSS colour behind the image — for a transparent vector or PNG whose
     * ink disappears on the site's own background. Any colour value works,
     * `var(--card)` included.
     */
    background?: string;
    /** The same under the dark theme; falls back to `background`. */
    darkBackground?: string;
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

/**
 * COLOURS, NOT CLASSES. A page cannot pass Tailwind classes to an image: the
 * layer's stylesheet is compiled from `app/` alone, never from Markdown, so a
 * `dark:bg-…` written in a page would be a class no CSS exists for — silently.
 * The values travel as custom properties instead, and the one class that reads
 * them lives here, where Tailwind sees it.
 *
 * Applied to the image in the page AND in the viewer: a transparent diagram is
 * just as unreadable on the viewer's dark surface.
 */
const backdrop = computed(() => {
  if (!props.background && !props.darkBackground) return undefined;

  return {
    class: 'bg-(--duxt-img-bg) dark:bg-(--duxt-img-bg-dark)',
    style: {
      '--duxt-img-bg': props.background ?? 'transparent',
      '--duxt-img-bg-dark': props.darkBackground ?? props.background
    }
  };
});

/** The dialog is named by the image, and by what it is only when the image is unnamed. */
const title = computed(() => props.alt || t('duxt.page.image.zoom'));

const colorMode = useColorMode();

/** The file the reader is looking at — the dark twin only under the dark theme. */
const original = computed(() =>
  props.dark && colorMode.value === 'dark' ? props.dark : props.src
);

/**
 * ZOOM IS ONE SCALE AND ONE OFFSET, applied as a transform on the picture.
 *
 * A transform rather than a larger box in a scroller, for two reasons: it zooms
 * around a POINT — the cursor, the fingers — which a scroller can only fake by
 * chasing its own scroll position, and it never changes layout, so the image
 * keeps the fitted box `check:images` measures. The offset is kept inside the
 * image's reach, so a picture can be panned to its edge but never off-screen.
 *
 * Reset on every open: a viewer that remembered the last image's zoom would
 * open the next one already cropped.
 */
/**
 * The levels `+` and `-` stop at — round numbers, because the toolbar prints
 * the level and 338% reads as a bug. The wheel and a pinch stay continuous,
 * which is what a hand expects; the next button press snaps back onto a step.
 */
const ZOOM_STEPS = [1, 1.5, 2, 3, 4, 6, 8];
const MAX_SCALE = ZOOM_STEPS.at(-1)!;
const ZOOM_CLICK = 2;

const scale = ref(1);
const offset = ref({ x: 0, y: 0 });
const dragging = ref(false);
const zoomed = computed(() => scale.value > 1);
const stage = useTemplateRef<HTMLElement>('stage');

watch(open, resetZoom);

function resetZoom(): void {
  scale.value = 1;
  offset.value = { x: 0, y: 0 };
}

/**
 * Keep the picture's edge from leaving its side of the stage.
 *
 * `offsetWidth` is the laid-out box, untouched by the transform — so this is
 * the scale-1 size whatever the current zoom. The hidden theme twin measures 0
 * and drops out of the `max`.
 */
function clamp(x: number, y: number, next: number) {
  const el = stage.value;
  if (!el) return { x, y };

  const images = [...el.querySelectorAll<HTMLElement>('[data-viewer-image]')];
  const width = Math.max(0, ...images.map((image) => image.offsetWidth));
  const height = Math.max(0, ...images.map((image) => image.offsetHeight));
  const maxX = Math.max(0, (width * next - el.clientWidth) / 2);
  const maxY = Math.max(0, (height * next - el.clientHeight) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y))
  };
}

/** A viewport point, relative to the centre of the stage the image is centred in. */
function fromClient(clientX: number, clientY: number) {
  const rect = stage.value?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };

  return {
    x: clientX - rect.x - rect.width / 2,
    y: clientY - rect.y - rect.height / 2
  };
}

/**
 * The next step above the current level, or below it — strictly, so a level
 * the wheel left between two steps moves to the nearer one in that direction
 * rather than skipping it.
 */
function stepZoom(direction: 1 | -1): void {
  const current = scale.value;
  const next =
    direction === 1
      ? ZOOM_STEPS.find((step) => step > current + 0.001)
      : ZOOM_STEPS.findLast((step) => step < current - 0.001);

  zoomTo(next ?? (direction === 1 ? MAX_SCALE : 1));
}

/** Zoom to `next`, keeping the picture's pixel under `point` where it is. */
function zoomTo(next: number, point = { x: 0, y: 0 }): void {
  const target = Math.min(MAX_SCALE, Math.max(1, next));
  const ratio = target / scale.value;

  scale.value = target;
  offset.value =
    target === 1
      ? { x: 0, y: 0 }
      : clamp(
          point.x - (point.x - offset.value.x) * ratio,
          point.y - (point.y - offset.value.y) * ratio,
          target
        );
}

function onWheel(event: WheelEvent): void {
  // Line-mode wheels report in lines, not pixels.
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1);
  zoomTo(
    scale.value * Math.exp(-delta * 0.0015),
    fromClient(event.clientX, event.clientY)
  );
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === '+' || event.key === '=') stepZoom(1);
  else if (event.key === '-') stepZoom(-1);
  else if (event.key === '0') resetZoom();
  else return;

  event.preventDefault();
}

/**
 * Drag to pan, two fingers to pinch.
 *
 * `moved` is what tells a drag from a click: a pan that ends over the empty
 * stage must not close the viewer, and one that ends over the image must not
 * zoom it. The pointer is captured only once it has MOVED — captured from
 * `pointerdown`, every click would be retargeted to the stage and a click on
 * the image could no longer be told from a click beside it.
 */
const pointers = new Map<number, { x: number; y: number }>();
let pinch: { distance: number; scale: number } | undefined;
let travel = 0;
let moved = false;

function onPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return;

  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  travel = 0;
  moved = false;

  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = {
      distance: Math.hypot(a!.x - b!.x, a!.y - b!.y),
      scale: scale.value
    };
  }
}

function onPointerMove(event: PointerEvent): void {
  const previous = pointers.get(event.pointerId);
  if (!previous) return;

  const now = { x: event.clientX, y: event.clientY };
  pointers.set(event.pointerId, now);

  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    moved = true;
    zoomTo(
      (pinch.scale * Math.hypot(a!.x - b!.x, a!.y - b!.y)) / pinch.distance,
      fromClient((a!.x + b!.x) / 2, (a!.y + b!.y) / 2)
    );
    return;
  }

  if (!zoomed.value) return;

  const dx = now.x - previous.x;
  const dy = now.y - previous.y;
  travel += Math.abs(dx) + Math.abs(dy);

  if (!moved && travel > 4) {
    moved = true;
    dragging.value = true;
    stage.value?.setPointerCapture(event.pointerId);
  }

  if (moved) {
    offset.value = clamp(offset.value.x + dx, offset.value.y + dy, scale.value);
  }
}

function onPointerUp(event: PointerEvent): void {
  pointers.delete(event.pointerId);
  if (pointers.size < 2) pinch = undefined;
  if (!pointers.size) dragging.value = false;
}

function onImageClick(event: MouseEvent): void {
  if (moved) return;

  if (zoomed.value) resetZoom();
  else zoomTo(ZOOM_CLICK, fromClient(event.clientX, event.clientY));
}

function onStageClick(): void {
  if (!moved) open.value = false;
}

const image = useImage();

/**
 * The picture's sources: the dialog's `srcset` while it fits, the ORIGINAL
 * once it is zoomed.
 *
 * A `srcset` candidate is picked for the fitted width, so at 200% it is a
 * blurred enlargement of a screen-sized file. The original is fetched only
 * when a reader zooms. It is the same `<img>` either way, on purpose: changing
 * the sources of one element keeps the current picture on screen until the
 * new file has loaded, where swapping elements would flash an empty box.
 */
function viewerSources(variant: Variant) {
  if (variant.plain || zoomed.value) return { src: variant.src };

  const sources = image.getSizes(variant.src, {
    sizes: PROSE_IMAGE_ZOOM_SIZES
  });

  return { src: sources.src, srcset: sources.srcset, sizes: sources.sizes };
}

/** One look for the viewer's round controls, which sit on the dark surface in both themes. */
const viewerButton =
  'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none';

/** The zoom group's buttons, drawn inside one shared pill rather than each in its own. */
const zoomButton =
  'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent';

const viewerImage = computed(() => [
  'm-auto h-auto max-h-full w-auto max-w-[min(100%,80rem)] rounded-lg object-contain shadow-2xl ring-1 ring-white/10 select-none',
  dragging.value
    ? 'transition-none'
    : 'transition-transform duration-150 ease-out',
  zoomed.value
    ? dragging.value
      ? 'cursor-grabbing'
      : 'cursor-grab'
    : 'cursor-zoom-in'
]);

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
          :class="[variant.theme, backdrop?.class]"
          :style="backdrop?.style"
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
          :class="[variant.theme, backdrop?.class]"
          :style="backdrop?.style"
        />
      </template>

      <span
        v-if="zoomable"
        aria-hidden="true"
        class="pointer-events-none absolute top-2 end-2 flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-sm transition-colors group-hover:text-foreground"
      >
        <Icon name="lucide:zoom-in" class="size-4" />
      </span>
    </component>

    <UiDialog v-if="zoomable" v-model:open="open">
      <!-- The whole viewport, transparent over the overlay: the blur is what
           separates the picture from the page, not a border.

           THE DARKENING AND THE BLUR BELONG TO THE OVERLAY, not to this box.
           The content scales in from 95%, so a surface painted here reached
           the viewport's edges only once that animation ended — and for 200ms
           the page's text showed unblurred along the bottom. The overlay only
           fades, so it covers the whole screen from the first frame. -->
      <UiDialogContent
        :show-close-button="false"
        :aria-describedby="undefined"
        overlay-class="bg-neutral-950/90 backdrop-blur-md"
        class="inset-0 grid h-dvh w-screen max-w-none translate-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-none border-0 bg-transparent p-0 shadow-none sm:max-w-none"
        @click.self="open = false"
        @keydown="onKeydown"
      >
        <div
          class="flex items-center justify-end gap-2 p-3 sm:p-4"
          @click.self="open = false"
        >
          <div
            class="flex items-center gap-0.5 rounded-full bg-white/10 p-0.5 ring-1 ring-white/15"
          >
            <button
              type="button"
              :aria-label="t('duxt.page.image.zoomOut')"
              :disabled="!zoomed"
              :class="[zoomButton, 'w-8']"
              @click="stepZoom(-1)"
            >
              <Icon name="lucide:minus" class="size-4" />
            </button>
            <button
              type="button"
              :aria-label="t('duxt.page.image.resetZoom')"
              :disabled="!zoomed"
              :class="[
                zoomButton,
                'min-w-14 px-2 text-xs font-medium tabular-nums'
              ]"
              @click="resetZoom"
            >
              {{ Math.round(scale * 100) }}%
            </button>
            <button
              type="button"
              :aria-label="t('duxt.page.image.zoomIn')"
              :disabled="scale >= MAX_SCALE"
              :class="[zoomButton, 'w-8']"
              @click="stepZoom(1)"
            >
              <Icon name="lucide:plus" class="size-4" />
            </button>
          </div>
          <a
            :href="original"
            target="_blank"
            rel="noopener"
            :aria-label="t('duxt.page.image.original')"
            :class="viewerButton"
          >
            <Icon name="lucide:external-link" class="size-4" />
          </a>
          <UiDialogClose
            :aria-label="t('duxt.page.image.close')"
            :class="viewerButton"
          >
            <Icon name="lucide:x" class="size-4" />
          </UiDialogClose>
        </div>

        <!-- `m-auto` centres the picture; `touch-none` hands pinches and
             drags to the handlers instead of scrolling or zooming the page
             underneath. -->
        <div
          ref="stage"
          class="flex min-h-0 touch-none overflow-hidden px-3 sm:px-8"
          @click.self="onStageClick"
          @wheel.prevent="onWheel"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <img
            v-for="variant in variants"
            :key="variant.src"
            v-bind="viewerSources(variant)"
            :alt="alt"
            data-viewer-image
            draggable="false"
            :class="[viewerImage, variant.theme, backdrop?.class]"
            :style="{
              ...backdrop?.style,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
            }"
            @click="onImageClick"
          />
        </div>

        <div class="px-4 py-3 sm:py-4" @click.self="open = false">
          <UiDialogTitle
            :class="
              alt
                ? 'mx-auto max-w-prose text-center text-sm text-balance text-white/80'
                : 'sr-only'
            "
          >
            {{ title }}
          </UiDialogTitle>
        </div>
      </UiDialogContent>
    </UiDialog>
  </span>
</template>
