<script setup lang="ts">
import type { DuxtBrunoRequest } from '../../../bruno-model';
import type {
  DuxtOpenApiOperation,
  DuxtOpenApiServer
} from '../../../openapi-model';

/**
 * One Bruno request, as the two columns of the reference.
 *
 * MDC: the `bruno` section type writes `::bruno-request` into every request
 * page, with the structure as props and the file's own `docs` block in the
 * slot — Markdown, because that is what a `docs` block is.
 *
 * THE SAME TWO COLUMNS `OpenApiOperation` DRAWS, and that is the answer this
 * type was filed to find: a second API section is not a second rendering path.
 * The left column is what the collection says; the right is the existing try-it
 * client, handed an operation the parser adapted at build time.
 *
 * WHAT IS NOT HERE is the honest half. A Bruno collection has no response
 * schemas, no reusable components and no field descriptions, so the page has no
 * "Responses" section and no schema tree — and does not invent one. Scripts and
 * tests are reported as PRESENT and never shown: they are code written against
 * Bruno's runtime, and a documentation site neither prints nor runs it.
 */
defineProps<{
  request: DuxtBrunoRequest;
  /** Present only where the site opted into a try-it client. */
  operation?: DuxtOpenApiOperation;
  servers?: DuxtOpenApiServer[];
}>();
</script>

<template>
  <!-- The same grid `OpenApiOperation` uses, and deliberately the same numbers:
       the two page kinds sit in one section row, and a reader moving between
       them should not feel the column move. -->
  <div
    class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_23rem] 2xl:grid-cols-[minmax(0,1fr)_30rem]"
  >
    <div class="min-w-0">
      <div class="not-typeset flex flex-wrap items-center gap-2">
        <DuxtOpenApiMethod :method="request.method" class="h-6 px-2" />

        <code class="font-mono text-sm break-all">{{ request.url }}</code>
      </div>

      <div class="mt-4">
        <slot />
      </div>

      <div class="not-typeset">
        <section v-if="request.auth" class="mt-8">
          <h2 class="duxt-label">{{ $t('duxt.bruno.auth') }}</h2>

          <p class="mt-2 text-sm text-muted-foreground">
            <code class="font-mono">{{ request.auth.mode }}</code>
          </p>
        </section>

        <section v-if="request.params?.length" class="mt-8">
          <h2 class="duxt-label">{{ $t('duxt.bruno.parameters') }}</h2>

          <div class="mt-3">
            <DuxtBrunoEntries :entries="request.params" />
          </div>
        </section>

        <section v-if="request.headers?.length" class="mt-8">
          <h2 class="duxt-label">{{ $t('duxt.bruno.headers') }}</h2>

          <div class="mt-3">
            <DuxtBrunoEntries :entries="request.headers" />
          </div>
        </section>

        <section v-if="request.body" class="mt-8">
          <h2 class="duxt-label">
            {{ $t('duxt.bruno.body') }}
            <span class="ml-1 font-mono text-xs text-muted-foreground">
              {{ request.body.type }}
            </span>
          </h2>

          <div class="mt-3">
            <DuxtCodeBlock
              v-if="request.body.text"
              :code="request.body.text"
              :language="request.body.language ?? 'text'"
            />

            <DuxtBrunoEntries v-else :entries="request.body.entries" />
          </div>

          <div v-if="request.body.variables" class="mt-3">
            <DuxtCodeBlock :code="request.body.variables" language="json" />
          </div>
        </section>

        <!-- SAID, NOT SHOWN. A reader has to know the page is not the whole
             request — a collection whose pre-request script signs a token
             behaves differently from what is printed above — and the code is
             neither published nor executed. The download is where it lives. -->
        <p
          v-if="request.script || request.tests"
          class="mt-8 flex items-start gap-2 text-sm text-muted-foreground"
        >
          <Icon
            name="lucide:file-code"
            aria-hidden="true"
            class="mt-0.5 size-4 shrink-0"
          />
          <span>{{ $t('duxt.bruno.hasCode') }}</span>
        </p>
      </div>
    </div>

    <!-- Only where the site opted in. Without a declared public base URL the
         page is static, which is the decision rather than a gap: a Bruno
         collection points at whatever its author could reach, and a send button
         aimed at somebody's staging host is a failure the page cannot explain. -->
    <div
      v-if="operation"
      class="not-typeset min-w-0 scroll-mt-[var(--duxt-header-offset)]"
    >
      <div
        class="xl:sticky xl:top-[calc(var(--duxt-header-offset)+1rem)] xl:max-h-[calc(100vh-var(--duxt-header-offset)-2.5rem)] xl:overflow-y-auto xl:pr-1"
      >
        <DuxtOpenApiClient :operation="operation" :servers="servers" />
      </div>
    </div>
  </div>
</template>
