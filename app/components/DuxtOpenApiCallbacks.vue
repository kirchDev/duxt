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
    <h2 class="text-sm font-semibold tracking-wide uppercase">
      {{ $t('duxt.openapi.callbacks') }}
    </h2>

    <div v-for="callback in callbacks" :key="callback.name" class="mt-4">
      <h3 class="font-mono text-sm font-medium">{{ callback.name }}</h3>

      <div
        v-for="(operation, index) in callback.operations ?? []"
        :key="index"
        class="mt-3 rounded-lg border"
      >
        <div class="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <DuxtOpenApiMethod :method="operation.method" />
          <code class="font-mono text-sm break-all">
            {{ operation.expression }}
          </code>
        </div>

        <div class="space-y-4 px-4 py-3">
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

          <ul
            v-if="operation.responses?.length"
            class="flex flex-wrap gap-2 text-xs text-muted-foreground"
          >
            <li
              v-for="response in operation.responses"
              :key="response.status"
              class="rounded bg-muted px-1.5 py-0.5 font-mono"
            >
              {{ response.status }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
