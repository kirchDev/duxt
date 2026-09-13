<script setup lang="ts">
import type {
  DuxtOpenApiOperation,
  DuxtOpenApiSecurity,
  DuxtOpenApiSecurityScheme,
  DuxtOpenApiServer
} from '../../../openapi-model';

/**
 * One operation, as the two right-hand columns of the reference.
 *
 * MDC: the `openapi` section type writes `::open-api-operation` into every
 * operation page, with the structure as props and the operation's own
 * description in the slot. The description is Markdown because the
 * specification says it is CommonMark — rendering it as plain text is the
 * commonest thing a reference gets wrong, and it costs the author every link
 * and every code span they wrote.
 *
 * THE COLUMNS. The `reference` layout gives the operation list on the left and
 * the full width; this splits what is left into the description in the middle
 * and the client on the right, which is the arrangement the issue settled on.
 * It is one grid rather than two page regions on purpose: the right column is a
 * property of the OPERATION — its servers, its parameters, its security — so it
 * has to be rendered by whatever renders the operation, and a layout cannot
 * reach it.
 *
 * The structural blocks carry `not-typeset`; the slot does not. A page's prose
 * wants the typeset preset and a parameter table does not, and they are
 * siblings here so each gets what it needs.
 */
const props = defineProps<{
  operation: DuxtOpenApiOperation;
  servers?: DuxtOpenApiServer[];
  security?: DuxtOpenApiSecurity;
  securitySchemes?: DuxtOpenApiSecurityScheme[];
}>();

/**
 * A fragment that lands on the client rather than at the top of the page.
 *
 * The panel sits beside the endpoint at `xl` and BELOW the whole description
 * everywhere narrower — so on a phone, and in any frame narrower than 80rem, a
 * link to the operation shows the prose and hides the one control the page is
 * about. `#…-try-it` is how a reader, a release note or the landing page's own
 * window points at it.
 *
 * Keyed by the operation rather than a bare `try-it`, because
 * `OpenApiOperations` renders a run of these on one page and a duplicated id is
 * an anchor that resolves to whichever came first.
 */
const clientAnchor = computed(() =>
  `${props.operation.operationId ?? `${props.operation.method}-${props.operation.path}`}-try-it`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
);
</script>

<template>
  <!-- Wider on a wide screen: a `curl` line with a couple of headers wraps at
       23rem however much room the window has, and the column that shows it is
       why `reference` hands its page the whole column rather than capping it at
       a reading measure the way `docs` and `changelog` do.
       
       30rem AT `2xl`, not the 34 it was. That number was chosen while the shell
       ran to 100rem, where it left the description the larger half; inside
       90rem the same 34 split the row down the middle, and the description —
       which is what the page is FOR — became the narrower side of a client. -->
  <div
    class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_23rem] 2xl:grid-cols-[minmax(0,1fr)_30rem]"
  >
    <div class="min-w-0">
      <div class="not-typeset flex flex-wrap items-center gap-2">
        <DuxtOpenApiMethod :method="operation.method" class="h-6 px-2" />

        <code class="font-mono text-sm break-all">{{ operation.path }}</code>

        <!-- A webhook is the same object pointing the other way, and a reader
             who does not know that will try to call it. -->
        <UiBadge v-if="operation.kind === 'webhook'" variant="secondary">
          {{ $t('duxt.openapi.webhook') }}
        </UiBadge>

        <UiBadge v-if="operation.deprecated" variant="destructive">
          {{ $t('duxt.openapi.deprecated') }}
        </UiBadge>
      </div>

      <p
        v-if="operation.operationId"
        class="not-typeset mt-2 font-mono text-xs text-muted-foreground"
      >
        {{ operation.operationId }}
      </p>

      <div class="mt-4">
        <slot />
      </div>

      <div class="not-typeset">
        <DuxtOpenApiSecurity :security="security" />

        <DuxtOpenApiParameters :parameters="operation.parameters" />

        <section v-if="operation.requestBody?.content?.length" class="mt-8">
          <h2 class="duxt-label">
            {{ $t('duxt.openapi.requestBody') }}
            <span
              v-if="operation.requestBody.required"
              class="ms-1 text-xs font-medium text-destructive"
            >
              {{ $t('duxt.openapi.required') }}
            </span>
          </h2>

          <p
            v-if="operation.requestBody.description"
            class="mt-2 text-sm text-muted-foreground"
          >
            {{ operation.requestBody.description }}
          </p>

          <div class="mt-3 border-t border-border/60 pt-3">
            <DuxtOpenApiMedia
              :content="operation.requestBody.content"
              direction="request"
            />
          </div>
        </section>

        <DuxtOpenApiResponses :responses="operation.responses" />

        <DuxtOpenApiCallbacks :callbacks="operation.callbacks" />

        <p v-if="operation.externalDocs" class="mt-8 text-sm">
          <a
            :href="operation.externalDocs.url"
            rel="noopener noreferrer"
            target="_blank"
            class="text-primary underline underline-offset-4"
          >
            {{
              operation.externalDocs.description ?? $t('duxt.openapi.moreInfo')
            }}
          </a>
        </p>
      </div>
    </div>

    <!-- Sticky only where there is a column to be sticky in: below `xl` the
         client sits after the description, which is the order a phone reads.

         AND IT SCROLLS ITSELF, the way the sidebar and the table of contents
         already do — same expression, `100vh` less the header above it. Sticky
         alone pinned a panel taller than the viewport, so the request samples
         under the send button were cut off and only came into view once the
         reader had scrolled the whole page to its end: the panel is beside the
         endpoint precisely so it does not have to be chased there.

         Bounded and scrollable only at `xl`, because below it the client is in
         normal flow and a second scrollbar inside the page would be one nobody
         asked for.

         AND IT KEEPS A REM OFF THE HEADER. Pinned at exactly `--duxt-header-offset`
         the card's top border sat against the navbar's bottom border, so the
         two read as one thick line and the panel looked attached to the header
         rather than floating under it. The `max-h` gives the same rem back at
         the bottom, so the panel still ends clear of the viewport edge. -->
    <div
      :id="clientAnchor"
      class="not-typeset min-w-0 scroll-mt-[var(--duxt-header-offset)]"
    >
      <div
        class="xl:sticky xl:top-[calc(var(--duxt-header-offset)+1rem)] xl:max-h-[calc(100vh-var(--duxt-header-offset)-2.5rem)] xl:overflow-y-auto xl:pe-1"
      >
        <DuxtOpenApiClient
          :operation="operation"
          :servers="servers"
          :security="security"
          :security-schemes="securitySchemes"
        />
      </div>
    </div>
  </div>
</template>
