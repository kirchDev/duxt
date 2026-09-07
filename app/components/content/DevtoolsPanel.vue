<script setup lang="ts">
/**
 * `::devtools-panel{tab="pages"}` — one panel of the devtools tab, embedded.
 *
 * The alternative was a screenshot, and a screenshot of a table is out of date
 * the day a column is added; the panel's real route is no alternative at all,
 * because `modules/devtools.ts` registers nothing outside a dev server, so a
 * published page would frame a 404. What is embedded here is the panel's OWN
 * renderer, run over a fixture site at build time and written to
 * `www/public/devtools/<tab>.html` by `pnpm previews`.
 *
 * An iframe rather than inline markup, and deliberately: the panel ships its
 * own stylesheet, written against a documentation site's tokens it knows
 * nothing about. Inlining it would mean two cascades in one document, each
 * quietly restyling the other.
 *
 * Two messages cross the frame. The theme goes in, because the reader's choice
 * is a class on this page and a media query is all the frame would otherwise
 * see; the height comes back, because only the framed document knows how tall
 * its table turned out. Both are best-effort — with the script blocked, the
 * frame keeps its default height and follows the system theme.
 */
const props = withDefaults(
  defineProps<{
    /** The panel's slug, as the tab row spells it. */
    tab?: string;
    /** Starting height in pixels, before the frame reports its own. */
    height?: number | string;
    /** Upper bound, so a long table scrolls inside the frame. */
    max?: number | string;
  }>(),
  { tab: 'sources', height: 360, max: 620 }
);

const frame = useTemplateRef<HTMLIFrameElement>('frame');
const colorMode = useColorMode();
const { t } = useI18n();

const number = (value: number | string, fallback: number) => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ceiling = computed(() => number(props.max, 620));
const height = ref(number(props.height, 360));

const dark = computed(() => colorMode.value === 'dark');

/**
 * The theme is in the URL as well as in a message: the query settles the very
 * first paint, the message every change after it. Without the query the frame
 * renders light and flips a moment later, which is exactly the flash the
 * theme-aware image support elsewhere in this layer exists to avoid.
 */
const src = computed(
  () =>
    `/devtools/${props.tab || 'sources'}.html?theme=${dark.value ? 'dark' : 'light'}`
);

function tell() {
  frame.value?.contentWindow?.postMessage(
    { duxtTheme: dark.value ? 'dark' : 'light' },
    '*'
  );
}

watch(dark, tell);

function onMessage(event: MessageEvent) {
  // Only this frame's own message, and only a number: the listener is on the
  // window, which every other frame and script on the page can post to.
  if (event.source !== frame.value?.contentWindow) return;

  const reported = (event.data as { duxtHeight?: unknown } | null)?.duxtHeight;
  if (typeof reported !== 'number') return;

  height.value = Math.min(Math.max(Math.round(reported), 200), ceiling.value);
}

onMounted(() => window.addEventListener('message', onMessage));
onBeforeUnmount(() => window.removeEventListener('message', onMessage));
</script>

<template>
  <div class="border-border my-6 overflow-hidden rounded-lg border">
    <iframe
      ref="frame"
      :src="src"
      :title="t('duxt.devtools.preview', { tab })"
      :style="{ height: `${height}px` }"
      class="block w-full"
      loading="lazy"
      sandbox="allow-scripts allow-same-origin"
      @load="tell"
    />
  </div>
</template>
