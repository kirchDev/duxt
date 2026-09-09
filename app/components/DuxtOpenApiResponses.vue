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
</script>

<template>
  <section v-if="responses?.length" class="mt-8">
    <h2 class="duxt-label">
      {{ $t('duxt.openapi.responses') }}
    </h2>

    <!-- A hairline between responses rather than a card around each: what
         separates two of them is that one ends and the next begins, which is
         what a rule says. The card said "one object" a third time on a page
         that had already said it about the security and the parameters. -->
    <div class="mt-3 divide-y divide-border/60 border-t border-border/60">
      <div v-for="response in responses" :key="response.status" class="py-4">
        <div class="flex flex-wrap items-center gap-3">
          <UiBadge
            :class="[
              'h-5 px-1.5 font-mono text-[0.6875rem] leading-none font-semibold tabular-nums',
              openApiStatusTone(response.status)
            ]"
          >
            {{ response.status }}
          </UiBadge>

          <span v-if="response.description" class="text-sm">
            {{ response.description }}
          </span>
        </div>

        <div class="mt-3 space-y-4">
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
                  direction="response"
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
            direction="response"
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
