<script setup lang="ts">
import type { DuxtOpenApiCallback } from '../../openapi-model';

/**
 * The requests the API sends BACK, and where it sends them.
 *
 * A callback inverts the direction: the reader becomes the server. So it gets a
 * section of its own rather than being folded in beside the responses, and the
 * runtime expression — `{$request.body#/callbackUrl}` — is shown verbatim,
 * because it is the literal string the document uses to say which field of the
 * original request holds the URL.
 *
 * No try-it client here, and that is not an omission: nothing in a browser can
 * receive one.
 */
defineProps<{ callbacks?: DuxtOpenApiCallback[] }>();
</script>

<template>
  <section v-if="callbacks?.length" class="mt-8">
    <h2 class="duxt-label">
      {{ $t('duxt.openapi.callbacks') }}
    </h2>

    <div v-for="callback in callbacks" :key="callback.name" class="mt-4">
      <h3 class="font-mono text-sm font-medium">{{ callback.name }}</h3>

      <div
        v-for="(operation, index) in callback.operations ?? []"
        :key="index"
        class="mt-3 border-t border-border/60"
      >
        <div class="flex flex-wrap items-center gap-2 pt-3">
          <DuxtOpenApiMethod :method="operation.method" />
          <code class="font-mono text-sm break-all">
            {{ operation.expression }}
          </code>
        </div>

        <div class="mt-3 space-y-4">
          <p v-if="operation.summary" class="text-sm">
            {{ operation.summary }}
          </p>
          <p v-if="operation.description" class="text-sm text-muted-foreground">
            {{ operation.description }}
          </p>

          <!-- A callback is a request the SERVER sends, so its body travels
               the same way any request body does. Its responses are drawn as
               status chips here, with no schema to give a direction to. -->
          <DuxtOpenApiMedia
            v-if="operation.requestBody?.content?.length"
            :content="operation.requestBody.content"
            direction="request"
          />

          <!-- NAMED, because the direction is inverted and a bare status chip
               under a request body reads as one of the operation's own answers.
               It is the opposite: what the API expects the READER's endpoint to
               reply with. The document's own description of it is drawn beside
               the status, which is the whole of what it says. -->
          <div v-if="operation.responses?.length">
            <p class="text-xs font-medium text-foreground/80">
              {{ $t('duxt.openapi.expects') }}
            </p>

            <ul class="mt-2 space-y-1.5">
              <li
                v-for="response in operation.responses"
                :key="response.status"
                class="flex flex-wrap items-center gap-3"
              >
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
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
