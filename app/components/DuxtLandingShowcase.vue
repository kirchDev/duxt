<script setup lang="ts">
import { sourcesForRoute } from '../../sources-resolve';

/**
 * One feature, given a whole band: its prose on one side and the thing itself
 * on the other.
 *
 * The feature GRID says what a site can do in four words per card. This says it
 * in a paragraph and a running example, which is the difference between a list
 * of claims and a demonstration — and the reason a landing page needs both
 * rather than a longer grid.
 *
 * The sides alternate, and the alternation is decided by the CALLER's index
 * rather than counted here: a component that counted its own instances would
 * flip when a band is added above it, and a `reverse` written per band would be
 * a layout decision in every entry of a config that should only carry content.
 */
const props = defineProps<{
  showcase: DuxtResolved<DuxtShowcase>;
  /** Position in the list. Even bands put the demo on the right. */
  index: number;
}>();

const localeLink = useDuxtLink();

/** A band's own `reverse` wins; otherwise the position decides. */
const reversed = computed(
  () => props.showcase.reverse ?? props.index % 2 === 1
);

const demo = computed(() => props.showcase.demo);

/**
 * Whether the CLIENT lays the band out rather than this component.
 *
 * A split client is two rows with prose beside each, and only it knows where
 * those rows are — so it takes the words through its slots and this component
 * draws none of its own. Anything else keeps the ordinary two columns.
 */
const splitClient = computed(
  () =>
    demo.value.type === 'operation' &&
    (demo.value.layout ?? (props.showcase.full ? 'split' : 'panel')) === 'split'
);

/**
 * The heading each band contributes to the document outline.
 *
 * An id per band rather than one shared one: `aria-labelledby` on the section
 * needs a target that is THIS band's title, and a landing page with five bands
 * pointing at the same node is five sections claiming one name.
 */
const headingId = computed(() => `duxt-showcase-${props.index}`);

/** The files of a code demo. One draws a plain block, several draw a group. */
const files = computed(() =>
  demo.value.type === 'code' ? demo.value.files : []
);

/**
 * The operation behind an `operation` demo — the try-it client on its own.
 *
 * Read out of the page Content already built for that endpoint, so nothing here
 * parses OpenAPI a second time and a band and its page can never disagree. The
 * collection is resolved from the TARGET's path rather than from the route this
 * component happens to stand on, which is the landing page and belongs to no
 * source.
 */
const duxt = useDuxtConfig();
const { locale, fallbackLocale } = useI18n();

const operationPath = computed(() =>
  demo.value.type === 'operation' ? demo.value.to : undefined
);

const { data: operationPage } = await useAsyncData(
  () => `duxt-showcase-operation-${operationPath.value ?? props.index}`,
  () => {
    const path = operationPath.value;
    if (!path) return Promise.resolve(null);

    const chain = sourcesForRoute(
      path,
      locale.value,
      duxt.resolvedSources ?? [],
      fallbackLocale.value as string | string[] | undefined
    );

    const collection = (chain[0]?.collection ?? 'docs') as DuxtCollectionArg;

    return queryCollection(collection).path(path).first();
  },
  { watch: [operationPath, locale] }
);

/**
 * Its props, in the shape `OpenApiOperation` hands the client.
 *
 * Undefined where the page carries no operation — a mistyped path, a section
 * that is not an API reference — and the band then draws no demo rather than
 * throwing on the landing page.
 */
const operation = computed(() =>
  openApiOperationProps(
    (operationPage.value as { body?: unknown } | null)?.body
  )
);
</script>

<template>
  <section
    class="mx-auto max-w-[90rem] px-4 py-12 sm:py-16 lg:px-8"
    :aria-labelledby="headingId"
  >
    <!-- TWO COLUMNS, OR ONE. A demo that is a PICTURE of something — a framed
         page, a screenshot, a block of config — reads fine beside its
         paragraph. A demo that IS the thing needs the width the thing was built
         for, and then the prose goes above it rather than beside it. -->
    <div
      :class="
        splitClient
          ? ''
          : showcase.full
            ? 'flex flex-col gap-8'
            : 'grid items-center gap-8 lg:grid-cols-2 lg:gap-16'
      "
    >
      <!-- THE PROSE. `lg:order-2` rather than a reordered DOM: the reading
           order is title, text, list, link in every band, and a source order
           that alternates would hand a screen reader a demo before the sentence
           that says what it is.

           A SPLIT CLIENT DRAWS ITS OWN. It is two rows, each with prose beside
           it, and both come from this same component through its slots — see
           the demo below. -->
      <DuxtLandingProse
        v-if="!splitClient"
        :prose="showcase"
        :heading-id="headingId"
        :class="[
          reversed && !showcase.full ? 'lg:order-2' : '',
          showcase.full ? 'max-w-3xl' : ''
        ]"
      />

      <!-- THE DEMO. `min-w-0` because a highlighted line of config is wider
           than its column and a grid track sized to its content would push the
           prose off the page rather than scroll the code. -->
      <div
        class="min-w-0"
        :class="reversed && !showcase.full ? 'lg:order-1' : ''"
      >
        <DuxtLiveWindow
          v-if="demo.type === 'frame'"
          :tabs="[
            { label: showcase.title, to: demo.to, skeleton: demo.skeleton }
          ]"
          :height="demo.height"
          :chrome="demo.chrome ?? true"
        />

        <!-- THE CLIENT, ON ITS OWN. Not the page it lives on: the panel sits
             beside the endpoint only above 80rem and under the whole
             description everywhere narrower, so a band-sized frame of that page
             showed prose and hid the control the band is named for. This is the
             control, with nothing around it — and less to download than the
             second copy of the application a frame would have booted. -->
        <!-- AND IT SCROLLS ITSELF, the way the operation page bounds the same
             panel at `xl`. A full client is server, authentication, parameters,
             a body editor, the send button and the samples under it — running
             to twice the height of every other band, with its own paragraph
             sitting in the middle of a column of nothing.

             `max-h`, not `h`: a GET with two parameters is a short panel, and
             padding it out to a POST's height is a box mostly empty. No border
             and no padding here either — the client brings its own, and a
             second one around it was a box drawn around a box.

             NONE OF THAT IN A `full` BAND. There the client has the width it
             was built for and splits itself into two cards, so there is no
             column of nothing to rescue and nothing to cap. -->
        <div
          v-else-if="demo.type === 'operation'"
          class="not-typeset"
          :class="
            showcase.full
              ? ''
              : 'max-h-[38rem] overflow-y-auto max-lg:max-h-[32rem]'
          "
          :style="
            !showcase.full && demo.height
              ? { maxHeight: demo.height }
              : undefined
          "
        >
          <!-- `v-bind` on a typed component: the props come out of a page's
               body, so they are a record here and the component's own contract
               is what checks them at the other end. -->
          <DuxtOpenApiClient
            v-if="operation"
            :key="demo.to"
            v-bind="operation as any"
            :layout="demo.layout ?? (showcase.full ? 'split' : 'panel')"
            :reverse="reversed"
          >
            <!-- The band's own words, handed to the row they belong beside.
                 The `h2` the section is labelled by goes with the form; the
                 samples row gets an `h3`, because it is a part of this section
                 rather than a section of its own. -->
            <template #beside-form>
              <DuxtLandingProse :prose="showcase" :heading-id="headingId" />
            </template>

            <template v-if="demo.samples" #beside-samples>
              <DuxtLandingProse :prose="demo.samples" :level="3" />
            </template>
          </DuxtOpenApiClient>
        </div>

        <!-- ONE FILE: the block, with its own header naming it.

             SEVERAL: `CodeGroup` — the same component `::code-group` draws on a
             docs page, handed blocks built from config instead of from
             Markdown. It reads the label off each child's `filename` and
             switches that child's own header off, so a reader meets one control
             in both places and this page grows no tab bar of its own. -->
        <CodeGroup
          v-else-if="demo.type === 'code' && files.length > 1"
          class="my-0!"
        >
          <DuxtCodeBlock
            v-for="(file, position) in files"
            :key="file.name ?? position"
            :code="file.code"
            :language="file.language"
            :filename="file.name"
          />
        </CodeGroup>

        <DuxtCodeBlock
          v-else-if="demo.type === 'code' && files[0]"
          :code="files[0].code"
          :language="files[0].language"
          :filename="files[0].name"
          class="my-0!"
        />

        <!-- Two <img>s rather than one: a screenshot of a light interface on a
             dark page is a torch, and `srcDark` is how a site hands over the
             other file. Without one, `src` serves both. -->
        <div
          v-else-if="demo.type === 'image'"
          class="overflow-hidden rounded-xl border bg-background shadow-sm"
        >
          <img
            :src="demo.src"
            :alt="demo.alt ?? ''"
            loading="lazy"
            decoding="async"
            class="w-full"
            :class="demo.srcDark ? 'dark:hidden' : ''"
          />
          <img
            v-if="demo.srcDark"
            :src="demo.srcDark"
            alt=""
            loading="lazy"
            decoding="async"
            class="hidden w-full dark:block"
          />
        </div>
      </div>
    </div>
  </section>
</template>
