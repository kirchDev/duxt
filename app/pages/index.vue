<script setup lang="ts">
/**
 * The landing page: its own route, full width, no sidebar. A consumer that
 * wants a different one drops an `index.vue` of its own — Nuxt's layer
 * override, no configuration.
 *
 * SIX BANDS, each of which draws nothing when its config is absent: the hero,
 * its numbers, the window, a band per feature, the grid, the closing list. A
 * site that sets only a headline gets a headline and a button, not five empty
 * sections.
 *
 * The middle of that is what the page is for. A grid of cards states four claims
 * in four words each; the bands between the window and the grid take one feature
 * at a time and put the feature ITSELF beside the sentence — a live page of the
 * API reference, the config that produced it. A reader who never leaves this
 * page has still seen the thing work.
 *
 * No closing call to action: the hero's buttons ARE the call, and repeating them
 * at the bottom asks a reader who just arrived to decide twice.
 */
const duxt = useDuxtConfig();
const localeLink = useDuxtLink();
const { t } = useI18n();
const notify = useDuxtToast();

/**
 * Where a hero button goes when the config did not say — the same fallback
 * `index.vue` and `DuxtHeader` use, because the layer cannot know what a
 * consumer called its first page.
 */
const firstSection = computed(() => duxt.sections?.[0]?.to ?? '/');
const actionTarget = (action: DuxtResolved<DuxtAction>) =>
  action.to ?? firstSection.value;

const landing = computed(() => duxt.landing);

/**
 * The install command, highlighted on the SERVER for the reason the
 * package-manager block does it there: Shiki is the single biggest thing that
 * could end up in the client bundle, and a line of shell does not need it
 * twice.
 */
const command = computed(() => landing.value?.command);
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
 * else; an object may carry an icon, a colour and a link.
 */
const badge = computed(() => {
  const value = landing.value?.badge as
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

/**
 * The tabs of the big window.
 *
 * `demo` is the tabbed form and wins where it is set; `preview` is the same
 * idea with one page, and is what a site that has already configured
 * `index.vue` still has. Neither: the first section, framed — the window is the
 * one band worth drawing on a claim as thin as "there is a site behind this".
 */
const demoTabs = computed<DuxtResolved<DuxtDemoTab>[]>(() => {
  const tabs = landing.value?.demo?.tabs;
  if (tabs?.length) return tabs;

  const preview = landing.value?.preview;
  // A preview pointed at the root would frame this very page, which nests the
  // landing page inside itself.
  const to =
    preview?.to && preview.to !== '/' ? preview.to : firstSection.value;

  return [{ label: t('duxt.defaults.landing.preview'), to }];
});

const demoHeight = computed(
  () => landing.value?.demo?.height ?? landing.value?.preview?.height
);

/**
 * The screenshot half of `preview`, which only the single-page form has.
 *
 * A poster is a picture of ONE page, so a tab bar cannot carry one: it would be
 * right for the first tab and a lie for the other three. A site that configured
 * `demo` has said it wants the live thing anyway.
 */
const poster = computed(() =>
  landing.value?.demo?.tabs?.length ? undefined : landing.value?.preview
);

/**
 * The bands, each carrying the ROW it starts at rather than its own position.
 *
 * The sides alternate down the page, and a band decides its side from the
 * number it is handed. A split try-it client draws two rows inside one band, so
 * a count of bands puts every band after it back on the side the row above just
 * used — the alternation stops halfway down the page, which is exactly what it
 * did. Counting rows carries it across.
 */
const bands = computed(() => {
  let row = 0;

  return (landing.value?.showcase ?? []).map((showcase) => {
    const at = row;
    row += duxtShowcaseRows(showcase);

    return { showcase, index: at };
  });
});

useSeoMeta({
  title: duxt.title,
  description: landing.value?.description,
  // The landing page is the site, not an article under it.
  ogType: 'website'
});

defineOgImage('Duxt', {
  title: landing.value?.headline ?? duxt.title,
  description: landing.value?.description,
  site: duxt.title,
  version: duxt.version ?? ''
});
</script>

<template>
  <div>
    <!-- HERO. Three layers behind the words, all of them `aria-hidden` and
         none of them able to take a click: the grid, two colour washes and a
         fade into the page below. They are a background, not content.
         
         The washes are `blur-3xl` circles rather than an image: they are
         right in both themes because they are the theme's own primary colour
         at 20% over the theme's own background, and they cost no request. -->
    <section class="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 -z-10"
      >
        <div
          class="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
        />
        <div
          class="absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          class="absolute top-20 -right-32 size-[28rem] rounded-full bg-primary/10 blur-3xl"
        />
        <!-- The bottom edge. Without it the grid stops on a hard line across
             the page, which reads as a section border nobody drew. -->
        <div
          class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background"
        />
      </div>

      <div
        class="mx-auto max-w-5xl px-4 pt-24 pb-12 text-center sm:pt-32 sm:pb-16"
      >
        <!-- `as-child` around a link when the badge points somewhere: a pill
             a reader can click has to BE the anchor, not sit inside one, or
             the hover and focus rings belong to two different boxes. -->
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
          class="text-4xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl"
        >
          {{ landing?.headline ?? duxt.title }}
        </h1>

        <p
          v-if="landing?.description"
          class="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty sm:text-xl"
        >
          {{ landing.description }}
        </p>

        <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
          <UiButton
            v-for="(action, index) in landing?.actions ?? []"
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

        <!-- THE NUMBERS. A <dl>, because that is what a value and the words
             naming it are — and it is what puts "7" and "locales" in one entry
             for a screen reader rather than two adjacent strings.

             WRAPPED, not gridded. A grid needs its column count written down,
             and the count is the SITE's: three true numbers beat four with a
             filler in the fourth, and the next site along may have two or five.
             A row that wraps and centres is right for all of them;
             `sm:grid-cols-4` was right for exactly one and left a hole
             otherwise. -->
        <dl
          v-if="landing?.stats?.length"
          class="mx-auto mt-14 flex max-w-3xl flex-wrap items-start justify-center gap-x-14 gap-y-8"
        >
          <div
            v-for="stat in landing.stats"
            :key="stat.value"
            class="min-w-28 text-center"
          >
            <dt class="sr-only">{{ stat.label }}</dt>
            <dd>
              <span
                class="block text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                {{ stat.value }}
              </span>
              <span
                aria-hidden="true"
                class="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"
              >
                <Icon v-if="stat.icon" :name="stat.icon" class="size-3.5" />
                {{ stat.label }}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- THE LIVE DEMO. Not a picture of the documentation — the
         documentation, in a frame, operable, with a tab bar over it: the
         reader flips between the guide, the API reference and the changelog
         without leaving this page. -->
    <section
      class="mx-auto max-w-[90rem] px-4 pb-12 sm:pb-16 lg:px-8"
      aria-labelledby="duxt-demo"
    >
      <h2 id="duxt-demo" class="sr-only">
        {{ $t('duxt.defaults.landing.demoTitle') }}
      </h2>

      <DuxtLiveWindow
        :tabs="demoTabs"
        :height="demoHeight"
        :poster="poster?.src"
        :poster-dark="poster?.srcDark"
        :poster-alt="poster?.alt"
        :live="poster?.live ?? true"
        prefetch
      />
    </section>

    <!-- THE BANDS. Separated by their own spacing rather than by a rule: a
         line across the page between two halves of one argument cuts the
         argument up. -->
    <DuxtLandingShowcase
      v-for="band in bands"
      :key="band.showcase.title"
      :showcase="band.showcase"
      :index="band.index"
    />

    <section
      v-if="landing?.features?.length"
      class="mx-auto max-w-[90rem] px-4 py-12 sm:py-16 lg:px-8"
      aria-labelledby="duxt-features"
    >
      <!-- The cards are h3s and the hero above them is the h1: without a
           heading here the document skips a level, which is what a screen
           reader's heading list reads as a missing section. -->
      <h2 id="duxt-features" class="sr-only">
        {{ $t('duxt.defaults.landing.featuresTitle') }}
      </h2>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- A card with a `to` is a LINK, not a card containing one: a reader
             aims at the card, and a hit area that is only the title is a hit
             area that gets missed. -->
        <component
          :is="feature.to ? linkComponent : 'div'"
          v-for="feature in landing.features"
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

    <!-- THE REST. One line each, no cards and no links: these are real and
         worth naming, and a card apiece would say they matter as much as the
         four above.
         
         A <ul>, and the entries are paragraphs rather than headings: this is a
         list of things, not a part of the document with sections under it — and
         where the site names no heading for it, an outline entry per item would
         be six sections a reader cannot navigate to. -->
    <!-- `duxt-flush-footer`: the tint runs into the footer instead of stopping
         four rems above it — see the rule in `duxt.css`. -->
    <section
      v-if="landing?.highlights?.length"
      class="duxt-flush-footer border-t bg-muted/20"
      :aria-labelledby="landing.highlightsTitle ? 'duxt-highlights' : undefined"
    >
      <div class="mx-auto max-w-[90rem] px-4 py-12 sm:py-16 lg:px-8">
        <h2
          v-if="landing.highlightsTitle"
          id="duxt-highlights"
          class="text-center text-2xl font-semibold tracking-tight"
        >
          {{ landing.highlightsTitle }}
        </h2>

        <ul
          class="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3"
          :class="landing.highlightsTitle ? 'mt-10' : ''"
        >
          <li
            v-for="item in landing.highlights"
            :key="item.title"
            class="flex items-start gap-3"
          >
            <Icon
              :name="item.icon ?? 'lucide:check'"
              class="mt-0.5 size-4.5 shrink-0 text-primary"
            />
            <div>
              <p class="text-sm font-medium">{{ item.title }}</p>
              <p
                v-if="item.description"
                class="mt-1 text-sm text-muted-foreground text-pretty"
              >
                {{ item.description }}
              </p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
