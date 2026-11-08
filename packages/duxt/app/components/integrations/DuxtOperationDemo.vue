<script setup lang="ts">
import { sourcesForRoute } from '@kirchdev/duxt/sources-resolve';
const props = defineProps<{
  showcase: DuxtResolved<DuxtShowcase>;
  reversed: boolean;
  headingId: string;
}>();
const demo = computed(() => props.showcase.demo);
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
  () => `duxt-showcase-operation-${operationPath.value ?? 0}`,
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
  <div
    v-if="demo.type === 'operation'"
    class="not-typeset"
    :class="
      showcase.full ? '' : 'max-h-[38rem] overflow-y-auto max-lg:max-h-[32rem]'
    "
    :style="
      !showcase.full && demo.height ? { maxHeight: demo.height } : undefined
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

      <!-- THE `v-if` IS ON THE CONTENT, NOT ON THE SLOT. A
                 `<template v-if>` around a named slot means the slot is not
                 PASSED at all when the condition is false — and the server and
                 the client disagree about what stands in its place, which is
                 the hydration mismatch this produced:

                   rendered on server: (start of fragment)
                   expected on client: Symbol(v-cmt)

                 Passed always, with the condition inside, both render the same
                 comment node when there is nothing to show. -->
      <template #beside-samples>
        <DuxtLandingProse
          v-if="demo.samples"
          :prose="demo.samples"
          :level="3"
        />
      </template>
    </DuxtOpenApiClient>
  </div>
</template>
