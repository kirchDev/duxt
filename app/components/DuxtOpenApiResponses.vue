<script setup lang="ts">
import type { DuxtOpenApiResponse } from '../../openapi-model';

/**
 * The responses an operation can send, in the order the parser put them.
 *
 * Every status expanded rather than one selected at a time. A reference is read
 * to find out what the error shapes are, and a tab strip that hides four of
 * five responses answers that question only for whoever already knew which tab
 * to open.
 */
defineProps<{ responses?: DuxtOpenApiResponse[] }>();

const tones: Record<string, string> = {
  info: 'bg-muted text-muted-foreground ring-border',
  success: 'bg-success/10 text-success ring-success/30',
  redirect: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/30',
  client:
    'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30',
  server: 'bg-destructive/10 text-destructive ring-destructive/30',
  default: 'bg-muted text-muted-foreground ring-border'
};
</script>

<template>
  <section v-if="responses?.length" class="mt-8">
    <h2 class="text-sm font-semibold tracking-wide uppercase">
      {{ $t('duxt.openapi.responses') }}
    </h2>

    <div class="mt-4 space-y-4">
      <div
        v-for="response in responses"
        :key="response.status"
        class="rounded-lg border"
      >
        <div class="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <span
            class="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-xs font-semibold ring-1 ring-inset"
            :class="tones[openApiStatusKind(response.status)]"
          >
            {{ response.status }}
          </span>

          <span v-if="response.description" class="text-sm">
            {{ response.description }}
          </span>
        </div>

        <div class="space-y-4 px-4 py-3">
          <div v-if="response.headers?.length">
            <h3 class="mb-2 text-xs font-medium text-muted-foreground">
              {{ $t('duxt.openapi.headers') }}
            </h3>
            <ul class="space-y-3">
              <li v-for="header in response.headers" :key="header.name">
                <DuxtOpenApiSchema
                  :schema="header.schema"
                  :name="header.name"
                  :required="header.required"
                />
                <p
                  v-if="header.description"
                  class="mt-1 text-sm text-muted-foreground"
                >
                  {{ header.description }}
                </p>
              </li>
            </ul>
          </div>

          <DuxtOpenApiMedia
            v-if="response.content?.length"
            :content="response.content"
          />

          <p
            v-else-if="!response.headers?.length"
            class="text-sm text-muted-foreground"
          >
            {{ $t('duxt.openapi.noBody') }}
          </p>

          <!-- Links are the one part of the specification that says what a
               reader can do NEXT with what came back, and the part every
               renderer drops first. -->
          <div v-if="response.links?.length">
            <h3 class="mb-2 text-xs font-medium text-muted-foreground">
              {{ $t('duxt.openapi.links') }}
            </h3>
            <ul class="space-y-2">
              <li v-for="link in response.links" :key="link.name">
                <div class="flex flex-wrap items-baseline gap-2">
                  <code class="font-mono text-sm">{{ link.name }}</code>
                  <span
                    v-if="link.operationId ?? link.operationRef"
                    class="font-mono text-xs text-muted-foreground"
                  >
                    {{ link.operationId ?? link.operationRef }}
                  </span>
                </div>
                <p
                  v-if="link.description"
                  class="text-sm text-muted-foreground"
                >
                  {{ link.description }}
                </p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
