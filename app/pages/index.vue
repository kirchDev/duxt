<script setup lang="ts">
/**
 * The landing page: its own route, full width, no sidebar. A consumer that
 * wants a different one drops an `index.vue` of its own — Nuxt's layer
 * override, no configuration.
 *
 * Three bands, each of which draws nothing when its config is absent: the hero,
 * a picture of the site, and the features. A site that sets only a headline gets
 * a headline and a button, not six empty cards.
 *
 * No closing call to action: the hero's buttons ARE the call, and repeating them
 * under six feature cards asks a reader who just arrived to decide twice.
 */
const duxt = useDuxtConfig();
const localeLink = useDuxtLink();
const { t } = useI18n();
const notify = useDuxtToast();

/**
 * Where a hero button goes when the config did not say.
 *
 * The layer's own "read the docs" action names no path — it cannot know what a
 * consumer called its first page — so it resolves to the first section, the
 * same fallback `DuxtHeader` uses for the navbar's docs entry.
 */
const firstSection = computed(() => duxt.sections?.[0]?.to ?? '/');
const actionTarget = (action: DuxtResolved<DuxtAction>) =>
  action.to ?? firstSection.value;

/**
 * The install command, highlighted on the server for the same reason the
 * package-manager block does it there: Shiki is the single biggest thing that
 * could end up in the client bundle, and a line of shell does not need it
 * twice.
 */
const command = computed(() => duxt.landing?.command);
const { data: highlightedCommand } = await useAsyncData(
  () => `landing-command-${command.value ?? ''}`,
  () =>
    command.value ? highlightCode(command.value, 'bash') : Promise.resolve(''),
  { watch: [command] }
);

const copied = ref(false);
async function copyCommand() {
  if (!command.value) return;

  try {
    await navigator.clipboard.writeText(command.value);
    copied.value = true;
    // The icon alone is a 3.5 rem change under the reader's own cursor, which
    // is exactly where they are not looking after a click. The toast is the
    // confirmation; the icon is what stays for the two seconds after it.
    notify.success(t('duxt.code.copiedToast'));
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    notify.error(t('duxt.page.copyFailed'));
  }
}

/**
 * The badge, in either of its two shapes. A string is the label and nothing
 * else; an object may carry an icon, a colour and a link. Resolving it here
 * keeps the template from asking which one it got three times over.
 */
const badge = computed(() => {
  const value = duxt.landing?.badge as
    | string
    | DuxtResolved<DuxtBadge>
    | undefined;

  if (!value) return undefined;

  const resolved = typeof value === 'string' ? { label: value } : value;

  // `{version}` in the label reads the site's own `version`. A release badge
  // wants the number, and a number typed out here is a second copy of what
  // `version` already holds — wrong from the next release onwards.
  return {
    ...resolved,
    label: String(resolved.label ?? '').replace(
      '{version}',
      String(duxt.version ?? '')
    )
  };
});

/**
 * `<component :is>` needs the COMPONENT, not its name: handed the string
 * `'NuxtLink'` Vue renders an unknown `<NuxtLink>` element, which the browser
 * shows and nobody can click.
 */
const linkComponent = resolveComponent('NuxtLink');

const preview = computed(() => duxt.landing?.preview);

/**
 * What the window shows. A page of this same site, embedded and operable —
 * `to` never points outward, because a landing page that frames somebody else's
 * site is an advert, and one that frames its own root would nest itself.
 */
const previewTo = computed(() => {
  const to = preview.value?.to ?? firstSection.value;
  return localeLink(to === '/' ? firstSection.value : to);
});

const previewTitle = computed(
  () => preview.value?.alt ?? t('duxt.defaults.landing.preview')
);

/**
 * The frame is mounted only once the reader has scrolled it into view. It is a
 * second copy of the application: loading it with the landing page would double
 * the work of the first paint for a band most readers never reach.
 */
const previewRoot = ref<HTMLElement>();
const previewVisible = ref(false);

/**
 * What the address bar shows, and where "Open" goes: the page the reader has
 * navigated to INSIDE the frame, not the one it started on.
 *
 * Polled rather than listened for. The frame is same-origin, so its location is
 * readable — but the site inside it is a Nuxt app, and a client-side route
 * change fires no `load` on the iframe element. The alternative is a plugin
 * that posts a message out on every navigation, which is a piece of layer that
 * exists for one band of one page. Half a second is below the threshold at
 * which an address bar looks stuck, and the timer stops with the component.
 */
const previewFrame = ref<HTMLIFrameElement>();

/**
 * True until the framed page has loaded once. Only the FIRST load: a route
 * change inside the frame is the app's own navigation, which draws its own
 * progress bar — a second spinner in the frame would report it twice.
 */
const previewLoading = ref(true);
const previewCurrent = ref<{ href: string; path: string }>();

function readFrameLocation() {
  try {
    const frame = previewFrame.value?.contentWindow;
    if (!frame) return;

    const { href, pathname, search, hash } = frame.location;
    // The bar shows the whole URL, the way a browser's does — origin included,
    // which is only knowable in the browser. The link keeps the path, because
    // that is what the router routes on.
    previewCurrent.value = { href, path: `${pathname}${search}${hash}` };
  } catch {
    // A cross-origin document: nothing to read, and nothing to report — the
    // bar keeps showing the page the frame was pointed at.
  }
}

onMounted(() => {
  if (!preview.value || preview.value.src) return;

  const root = previewRoot.value;
  if (!root) return;

  // No IntersectionObserver (an old browser, a test environment): show it
  // rather than leave an empty box on the page.
  if (!('IntersectionObserver' in window)) {
    previewVisible.value = true;
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      previewVisible.value = true;
      observer.disconnect();
    },
    // Far enough ahead that the frame has begun booting by the time the band
    // is on screen: it is a second copy of the application, so the gap between
    // "in view" and "usable" is a page load rather than a paint.
    { rootMargin: '600px' }
  );

  observer.observe(root);
  onBeforeUnmount(() => observer.disconnect());

  const timer = setInterval(readFrameLocation, 500);
  onBeforeUnmount(() => clearInterval(timer));
});

/** The frame's current page, falling back to the one it was pointed at. */
const previewLocation = computed(
  () => previewCurrent.value?.path ?? previewTo.value
);

/**
 * The same, as the address bar prints it.
 *
 * The origin comes from the REQUEST, which both halves can read: `window` on
 * the client, the incoming headers on the server. That matters because every
 * other source swaps the string once — the bare path swapped to a full URL at
 * the frame's first load, and reading `window.location` on mount swapped it at
 * hydration. Both are the flicker between two spellings of one page this
 * fallback exists to avoid, and only a value the server can print too removes
 * it. `i18n.baseUrl` would be the configured answer, but a site that has not
 * set it would be back to the bare path.
 */
const requestUrl = useRequestURL({
  xForwardedHost: true,
  xForwardedProto: true
});

const previewHref = computed(
  () => previewCurrent.value?.href ?? `${requestUrl.origin}${previewTo.value}`
);

useSeoMeta({
  title: duxt.title,
  description: duxt.landing?.description,
  // The landing page is the site, not an article under it.
  ogType: 'website'
});

/**
 * The one page most likely to be shared, and the one that had no card.
 *
 * Every documentation page renders an OG image and this did not, so a link to
 * the site's front door came back as a bare URL while a link to any page under
 * it came back with a picture. Same template, same arguments — the version is
 * the site's own rather than a page's, because a landing page belongs to no
 * version.
 */
defineOgImage('Duxt', {
  title: duxt.landing?.headline ?? duxt.title,
  description: duxt.landing?.description,
  site: duxt.title,
  version: duxt.version ?? ''
});
</script>

<template>
  <div>
    <!-- HERO. The grid behind it is a background, not content: `aria-hidden`
         and pointer-events off, so it neither reads aloud nor eats a click. -->
    <!-- No rule under the hero: the bands are separated by the space between
         them, and a line across the page in the middle of one continuous
         thought only cuts the hero off from the window it introduces. -->
    <section class="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
      />

      <div
        class="mx-auto max-w-5xl px-4 pt-24 pb-16 text-center sm:pt-32 sm:pb-20"
      >
        <!-- `as-child` around a link when the badge points somewhere: a pill a
             reader can click has to BE the anchor, not sit inside one, or the
             hover and focus rings belong to two different boxes. -->
        <UiBadge
          v-if="badge"
          :variant="badge.variant ?? 'secondary'"
          class="mb-6"
          :as-child="Boolean(badge.to)"
        >
          <NuxtLink
            v-if="badge.to"
            :to="localeLink(badge.to)"
            :target="badge.external ? '_blank' : undefined"
            :rel="badge.external ? 'noopener' : undefined"
          >
            <Icon v-if="badge.icon" :name="badge.icon" class="size-3" />
            {{ badge.label }}
          </NuxtLink>

          <template v-else>
            <Icon v-if="badge.icon" :name="badge.icon" class="size-3" />
            {{ badge.label }}
          </template>
        </UiBadge>

        <h1
          class="text-4xl font-semibold tracking-tight text-balance sm:text-6xl"
        >
          {{ duxt.landing?.headline ?? duxt.title }}
        </h1>

        <p
          v-if="duxt.landing?.description"
          class="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty"
        >
          {{ duxt.landing.description }}
        </p>

        <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
          <UiButton
            v-for="(action, index) in duxt.landing?.actions ?? []"
            :key="index"
            as-child
            size="lg"
            :variant="action.variant ?? 'default'"
          >
            <NuxtLink
              :to="localeLink(actionTarget(action))"
              :target="action.external ? '_blank' : undefined"
              :rel="action.external ? 'noopener' : undefined"
            >
              <Icon v-if="action.icon" :name="action.icon" class="size-4" />
              {{ action.label }}
            </NuxtLink>
          </UiButton>
        </div>

        <!-- The command, if there is one. A <button> around the whole line
             rather than an icon beside it: the line is not selectable text in
             any useful sense on a phone, and the target should be what the
             reader is looking at. -->
        <div v-if="command" class="mt-8 flex justify-center">
          <button
            type="button"
            class="group flex max-w-full cursor-pointer items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 font-mono text-sm transition-colors hover:bg-muted"
            :aria-label="
              copied ? $t('duxt.code.copied') : $t('duxt.code.copyCommand')
            "
            @click="copyCommand"
          >
            <span aria-hidden="true" class="text-muted-foreground select-none"
              >$</span
            >
            <span
              v-if="highlightedCommand"
              class="min-w-0 overflow-x-auto text-left [&_pre]:bg-transparent!"
              v-html="highlightedCommand"
            />
            <span v-else class="min-w-0 overflow-x-auto text-left">{{
              command
            }}</span>
            <Icon
              :name="copied ? 'lucide:check' : 'lucide:copy'"
              class="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            />
          </button>
        </div>
      </div>
    </section>

    <!-- PREVIEW. Not a picture of the documentation — the documentation, in a
         frame, operable: the reader scrolls it, opens its sidebar and flips its
         theme without leaving this page. A screenshot is what `src` falls back
         to for a site that would rather not load itself twice. -->
    <!-- No background and no rule of its own: the window is the thing being
         shown, and a band around it only draws a second box around a box. -->
    <section v-if="preview" ref="previewRoot">
      <div class="mx-auto max-w-[90rem] px-4 py-12 sm:py-16 lg:px-8">
        <div class="overflow-hidden rounded-xl border bg-background shadow-sm">
          <!-- The window's own frame. The address bar is a <div>, not an
               input: it says which page is inside, and a text field a reader
               can type into but not submit is a control that lies. -->
          <div class="flex items-center gap-3 border-b bg-muted/60 px-4 py-2.5">
            <div aria-hidden="true" class="flex shrink-0 items-center gap-1.5">
              <span class="size-2.5 rounded-full bg-muted-foreground/30" />
              <span class="size-2.5 rounded-full bg-muted-foreground/30" />
              <span class="size-2.5 rounded-full bg-muted-foreground/30" />
            </div>

            <!-- One fixed width, centred: a bar sized to its text grows and
                 shrinks on every navigation inside the frame, which reads as
                 the frame jittering rather than as a URL changing. The status
                 icon sits where a browser puts its padlock — leftmost, always
                 there, so the URL never shifts when it changes. -->
            <div class="flex min-w-0 flex-1 justify-center">
              <div
                class="flex w-full max-w-md items-center gap-2 rounded-md bg-background/70 px-3 py-1 font-mono text-xs text-muted-foreground"
              >
                <Icon
                  :name="
                    previewLoading ? 'lucide:loader-circle' : 'lucide:globe'
                  "
                  class="size-3 shrink-0"
                  :class="previewLoading ? 'animate-spin' : 'opacity-60'"
                  role="status"
                  :aria-label="
                    previewLoading
                      ? $t('duxt.defaults.landing.preview')
                      : undefined
                  "
                />
                <span class="truncate">{{ previewHref }}</span>
              </div>
            </div>

            <!-- The way out of the frame. A page read inside a 30 rem window is
                 a demonstration; at some point the reader wants the real one. -->
            <UiButton as-child size="sm" variant="ghost" class="shrink-0">
              <NuxtLink :to="previewLocation">
                <Icon name="lucide:external-link" class="size-3.5" />
                <span class="sr-only sm:not-sr-only">
                  {{ $t('duxt.defaults.landing.previewOpen') }}
                </span>
              </NuxtLink>
            </UiButton>
          </div>

          <!-- Two <img>s rather than one: a screenshot of a light theme on a
               dark page is a torch, and `srcDark` is how a site hands over the
               other file. Without one, `src` serves both. -->
          <template v-if="preview.src">
            <img
              :src="preview.src"
              :alt="preview.alt ?? ''"
              loading="lazy"
              decoding="async"
              class="w-full"
              :class="preview.srcDark ? 'dark:hidden' : ''"
            />
            <img
              v-if="preview.srcDark"
              :src="preview.srcDark"
              alt=""
              loading="lazy"
              decoding="async"
              class="hidden w-full dark:block"
            />
          </template>

          <!-- The live one. Rendered only after the band scrolls into view, and
               never on the server: an iframe in the initial HTML is a second
               full page load competing with this one. The box keeps its height
               either way, so nothing below it jumps when the frame arrives.

               NO `loading="lazy"`. The observer above has already decided this
               frame should load, and the attribute then puts the browser's own
               heuristic in front of that decision — a second gate on something
               that is only mounted at all because it is about to be needed. -->
          <ClientOnly v-else>
            <iframe
              v-if="previewVisible"
              ref="previewFrame"
              :src="previewTo"
              @load="
                previewLoading = false;
                readFrameLocation();
              "
              :title="previewTitle"
              class="h-[44rem] w-full max-lg:h-[36rem] max-sm:h-[28rem]"
              :style="{ height: preview.height }"
            />
            <div
              v-else
              class="h-[44rem] max-lg:h-[36rem] max-sm:h-[28rem]"
              :style="{ height: preview.height }"
            />

            <template #fallback>
              <div
                class="h-[44rem] max-lg:h-[36rem] max-sm:h-[28rem]"
                :style="{ height: preview.height }"
              />
            </template>
          </ClientOnly>
        </div>
      </div>
    </section>

    <section
      v-if="duxt.landing?.features?.length"
      class="mx-auto max-w-[90rem] px-4 py-12 sm:py-16 lg:px-8"
      aria-labelledby="duxt-features"
    >
      <!-- The cards are h3s, and the hero above them is the h1: without a
           heading here the document skips a level, which is what a screen
           reader's heading list reads as a missing section. Visually hidden
           because the cards say what they are. -->
      <h2 id="duxt-features" class="sr-only">
        {{ $t('duxt.defaults.landing.featuresTitle') }}
      </h2>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- A card with a `to` is a LINK, not a card containing one: a reader
             aims at the card, and a hit area that is only the title is a hit
             area that gets missed. `component :is` keeps the one without a
             destination an ordinary div rather than an anchor to nowhere. -->
        <component
          :is="feature.to ? linkComponent : 'div'"
          v-for="feature in duxt.landing.features"
          :key="feature.title"
          :to="feature.to ? localeLink(feature.to) : undefined"
          :target="feature.external ? '_blank' : undefined"
          :rel="feature.external ? 'noopener' : undefined"
          class="group"
        >
          <UiCard
            class="h-full transition-colors"
            :class="
              feature.to
                ? 'group-hover:border-foreground/20 group-hover:bg-muted/30'
                : ''
            "
          >
            <UiCardHeader>
              <span
                v-if="feature.icon"
                class="mb-1 flex size-9 items-center justify-center rounded-lg border bg-muted/50"
              >
                <Icon :name="feature.icon" class="size-4.5 text-primary" />
              </span>

              <UiCardTitle class="flex items-center gap-1.5 text-base">
                {{ feature.title }}
                <Icon
                  v-if="feature.to"
                  :name="
                    feature.external
                      ? 'lucide:arrow-up-right'
                      : 'lucide:arrow-right'
                  "
                  class="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </UiCardTitle>

              <UiCardDescription class="text-pretty">
                {{ feature.description }}
              </UiCardDescription>
            </UiCardHeader>
          </UiCard>
        </component>
      </div>
    </section>
  </div>
</template>
