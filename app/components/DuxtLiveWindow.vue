<script setup lang="ts">
/**
 * A page of this site, framed as a browser window and operable — the reader
 * scrolls it, opens its navigation and flips its theme without leaving the
 * page it stands on.
 *
 * The landing page had one of these written into it. It now needs four: the big
 * one under the hero, and one per showcase band that would rather show the real
 * thing than a screenshot of it. So the window is a component, and everything
 * that made the original one expensive to get right lives here once:
 *
 *  - it is mounted ON APPROACH, never on the server. The frame is a second copy
 *    of the application, and an iframe in the initial HTML is a second full page
 *    load competing with the first paint;
 *  - a POSTER covers the box until that copy has booted, so the band has its
 *    height from the first byte rather than jumping to a page's worth;
 *  - the address bar is polled rather than listened for. The frame is
 *    same-origin, so its location is readable — but the site inside it is a Nuxt
 *    app, and a client-side route change fires no `load` on the element.
 *
 * TABS ARE PAGES, NOT PANES. One frame, one page loaded at a time: four frames
 * behind a tab bar would be four copies of the application booting for a band
 * the reader sees one quarter of.
 */
const props = withDefaults(
  defineProps<{
    /** The pages behind the tab bar. One entry draws no tab bar at all. */
    tabs?: DuxtResolved<DuxtDemoTab>[];
    /** Window height, any CSS length. */
    height?: string;
    /** The browser chrome. `false` leaves the page in a plain bordered box. */
    chrome?: boolean;
    /** Prefetch the first tab's document while the browser is idle. */
    prefetch?: boolean;
    /**
     * A screenshot shown until the live page is up — or instead of it, where
     * `live` is false. Without one the window draws the SHAPE of a page from
     * the theme's own tokens, which needs no asset and is right in both modes
     * by construction.
     */
    poster?: string;
    /** The dark-mode file. Without one, `poster` serves both — a torch. */
    posterDark?: string;
    /** The poster's alt text. Only read where the poster is the content. */
    posterAlt?: string;
    /**
     * Load the page at all. `false` shows only the poster, which is what a site
     * picks when a second copy of the application is a cost it will not pay.
     */
    live?: boolean;
  }>(),
  { chrome: true, prefetch: false, live: true }
);

const localeLink = useDuxtLink();
const { t } = useI18n();

const active = ref(0);
const tabs = computed(() => props.tabs ?? []);
const current = computed(() => tabs.value[active.value] ?? tabs.value[0]);

/** Where the frame is pointed, in the reader's own language. */
const target = computed(() => localeLink(current.value?.to ?? '/'));

const root = useTemplateRef<HTMLElement>('root');
const frame = useTemplateRef<HTMLIFrameElement>('frame');

/** Mounted only once the band is on its way in — see the note above. */
const visible = ref(false);

/**
 * True until the framed page has loaded once. Reset on a tab change, because
 * that IS a first load — a different page, fetched from scratch.
 *
 * Only the first load of each: a route change the reader makes INSIDE the frame
 * is the app's own navigation, which draws its own progress bar, and a second
 * spinner over it would report the same thing twice.
 */
const loading = ref(true);

const location = ref<{ href: string; path: string }>();

function readFrameLocation() {
  try {
    const view = frame.value?.contentWindow;
    if (!view) return;

    const { href, pathname, search, hash } = view.location;
    // The bar shows the whole URL the way a browser's does — origin included,
    // which is only knowable in the browser. The link keeps the path, because
    // that is what the router routes on.
    location.value = { href, path: `${pathname}${search}${hash}` };
  } catch {
    // A cross-origin document: nothing to read, and nothing to report.
  }
}

function select(index: number) {
  if (index === active.value) return;
  active.value = index;
  loading.value = true;
  // The bar would otherwise keep printing the page we just navigated away
  // from, for as long as the new one takes to answer.
  location.value = undefined;
}

/**
 * The document, fetched into the cache while the browser is idle.
 *
 * The frame still mounts on approach — a prefetch is not an execution. What it
 * removes is the SLOW half: a document, its entry chunk, its payload. By the
 * time the observer says "now" there is nothing left to download.
 * `as="document"` is what makes the browser reuse it for an iframe rather than
 * fetch it a second time.
 *
 * Off by default, and set only on the window a reader is certain to reach. Four
 * prefetched applications is not a saving, it is the first paint again.
 */
useHead(() => ({
  link:
    props.prefetch && props.live
      ? [{ rel: 'prefetch', as: 'document', href: target.value }]
      : []
}));

onMounted(() => {
  if (!props.live) return;

  const element = root.value;
  if (!element) return;

  // No IntersectionObserver (an old browser, a test environment): show it
  // rather than leave an empty box on the page.
  if (!('IntersectionObserver' in window)) {
    visible.value = true;
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        visible.value = true;
        observer.disconnect();
      },
      // Far enough ahead that the frame has begun booting by the time the band
      // is on screen: it is a second copy of the application, so the gap
      // between "in view" and "usable" is a page load rather than a paint.
      { rootMargin: '600px' }
    );

    observer.observe(element);
    onBeforeUnmount(() => observer.disconnect());
  }

  const timer = setInterval(readFrameLocation, 500);
  onBeforeUnmount(() => clearInterval(timer));
});

/**
 * The origin comes from the REQUEST, which both halves can read: `window` on
 * the client, the incoming headers on the server. Every other source swaps the
 * printed string once — at the frame's first load, or at hydration — and that
 * swap is a flicker between two spellings of one page.
 */
const requestUrl = useRequestURL({
  xForwardedHost: true,
  xForwardedProto: true
});

const href = computed(
  () => location.value?.href ?? `${requestUrl.origin}${target.value}`
);

/** The frame's current page, falling back to the one it was pointed at. */
const path = computed(() => location.value?.path ?? target.value);

const title = computed(
  () => current.value?.label ?? t('duxt.defaults.landing.preview')
);
</script>

<template>
  <div
    ref="root"
    class="overflow-hidden rounded-xl border bg-background shadow-sm"
  >
    <!-- The window's own frame. The address bar is a <div>, not an input: it
         says which page is inside, and a text field a reader can type into but
         not submit is a control that lies. -->
    <div
      v-if="chrome"
      class="flex items-center gap-3 border-b bg-muted/60 px-4 py-2.5"
    >
      <div aria-hidden="true" class="flex shrink-0 items-center gap-1.5">
        <span class="size-2.5 rounded-full bg-muted-foreground/30" />
        <span class="size-2.5 rounded-full bg-muted-foreground/30" />
        <span class="size-2.5 rounded-full bg-muted-foreground/30" />
      </div>

      <!-- One fixed width, centred: a bar sized to its text grows and shrinks
           on every navigation inside the frame, which reads as the frame
           jittering rather than as a URL changing. The status icon sits where a
           browser puts its padlock — leftmost, always there, so the URL never
           shifts when it changes. -->
      <div class="flex min-w-0 flex-1 justify-center">
        <div
          class="flex w-full max-w-md items-center gap-2 rounded-md bg-background/70 px-3 py-1 font-mono text-xs text-muted-foreground"
        >
          <Icon
            :name="loading && live ? 'lucide:loader-circle' : 'lucide:globe'"
            class="size-3 shrink-0"
            :class="loading && live ? 'animate-spin' : 'opacity-60'"
            role="status"
            :aria-label="
              loading && live ? $t('duxt.defaults.landing.preview') : undefined
            "
          />
          <span class="truncate">{{ href }}</span>
        </div>
      </div>

      <!-- The way out of the frame. A page read inside a 30 rem window is a
           demonstration; at some point the reader wants the real one. -->
      <UiButton as-child size="sm" variant="ghost" class="shrink-0">
        <NuxtLink :to="path">
          <Icon name="lucide:external-link" class="size-3.5" />
          <span class="sr-only sm:not-sr-only">
            {{ $t('duxt.defaults.landing.previewOpen') }}
          </span>
        </NuxtLink>
      </UiButton>
    </div>

    <!-- The tab bar, where there is more than one page to show. Real buttons
         with `aria-selected` rather than a styled div: this is a tablist, the
         arrow keys are expected to work, and they do because the buttons are
         focusable in order. -->
    <div
      v-if="tabs.length > 1"
      role="tablist"
      :aria-label="$t('duxt.defaults.landing.demoTitle')"
      class="flex gap-1 overflow-x-auto border-b bg-muted/30 px-2 py-1.5"
    >
      <button
        v-for="(tab, index) in tabs"
        :key="tab.to"
        type="button"
        role="tab"
        :aria-selected="index === active"
        class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        :class="
          index === active
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
        "
        @click="select(index)"
      >
        <Icon v-if="tab.icon" :name="tab.icon" class="size-4" />
        {{ tab.label }}
      </button>
    </div>

    <!-- THE BOX OWNS THE HEIGHT, not whatever happens to be inside it. The
         frame is mounted late and the poster is absolutely positioned, so with
         the height on the frame the band would have none at all until the frame
         arrived, and then jump to a page's worth. -->
    <!-- `@container`, because what is inside is sized by THIS BOX and not by
         the browser window. The frame gets that for free — an iframe carries a
         viewport of its own — but the poster is drawn in this document, and
         with viewport breakpoints a half-width window on a wide screen drew the
         full desktop page squeezed into it. -->
    <div
      class="relative @container h-[44rem] max-lg:h-[36rem] max-sm:h-[28rem]"
      :style="height ? { height } : undefined"
    >
      <ClientOnly v-if="live">
        <!-- `:key` on the target, so a tab change REPLACES the element rather
             than repointing it: repointing an iframe pushes an entry onto the
             browser's own history, and the reader's back button then walks the
             tab bar instead of leaving the page.

             NO `loading="lazy"`. The observer above has already decided this
             frame should load, and the attribute puts the browser's heuristic
             in front of that decision. -->
        <iframe
          v-if="visible"
          :key="target"
          ref="frame"
          :src="target"
          :title="title"
          class="h-full w-full"
          @load="
            loading = false;
            readFrameLocation();
          "
        />
      </ClientOnly>

      <!-- Over the frame until it has loaded once, then gone. Not `v-if`-ed
           away on the same tick it stops being needed: a poster that vanishes
           the instant the frame reports `load` swaps one picture for another
           mid-paint, and a fade covers exactly that. `pointer-events-none` so a
           poster on its way out cannot eat the click that lands underneath. -->
      <Transition
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
        enter-active-class="transition-opacity"
        leave-active-class="transition-opacity duration-500"
      >
        <div
          v-if="loading || !live"
          class="absolute inset-0 overflow-hidden bg-background"
          :class="live ? 'pointer-events-none' : ''"
          :aria-hidden="live ? 'true' : undefined"
        >
          <!-- Two <img>s rather than one: a screenshot of a light theme on a
               dark page is a torch, and `posterDark` is how a site hands over
               the other file. Without one, `poster` serves both. -->
          <template v-if="poster">
            <img
              :src="poster"
              :alt="posterAlt ?? ''"
              decoding="async"
              class="h-full w-full object-cover object-top"
              :class="posterDark ? 'dark:hidden' : ''"
            />
            <img
              v-if="posterDark"
              :src="posterDark"
              alt=""
              decoding="async"
              class="hidden h-full w-full object-cover object-top dark:block"
            />
          </template>

          <!-- No screenshot: the SHAPE of a documentation page, drawn from the
               theme's own tokens. It needs no asset, it is right in both modes
               by construction, and it says "a page is coming" where a blank box
               said nothing. -->
          <DuxtPreviewSkeleton v-else />
        </div>
      </Transition>
    </div>
  </div>
</template>
