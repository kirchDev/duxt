<script setup lang="ts">
import type { DuxtOpenApiSecurity } from '../../openapi-model';

/**
 * What a request has to prove before the endpoint answers it.
 *
 * The two levels of `security` mean different things and are drawn as such: the
 * outer list is ALTERNATIVES — any one of them suffices — and every scheme
 * inside one entry is required together. Flattening them into a single list is
 * the mistake that tells a reader to send an API key AND an OAuth token when
 * either would have done.
 *
 * An EMPTY outer list is a statement, not an absence: the operation opted out
 * of the document's own requirement, and saying "no authentication" out loud is
 * the answer a reader came for.
 */
const props = defineProps<{ security?: DuxtOpenApiSecurity }>();

const alternatives = computed(() => props.security ?? []);
const open = computed(() => props.security?.length === 0);
</script>

<template>
  <section v-if="security" class="mt-8">
    <h2 class="text-sm font-semibold tracking-wide uppercase">
      {{ $t('duxt.openapi.security') }}
    </h2>

    <p v-if="open" class="mt-2 text-sm text-muted-foreground">
      {{ $t('duxt.openapi.noAuth') }}
    </p>

    <ul v-else class="mt-4 space-y-3">
      <li
        v-for="(alternative, index) in alternatives"
        :key="index"
        class="rounded-lg border px-4 py-3"
      >
        <p
          v-if="alternatives.length > 1"
          class="mb-2 text-xs text-muted-foreground"
        >
          {{ $t('duxt.openapi.anyOfThese') }}
        </p>

        <ul class="space-y-3">
          <li v-for="requirement in alternative" :key="requirement.key">
            <div class="flex flex-wrap items-baseline gap-2">
              <code class="font-mono text-sm font-medium">
                {{ requirement.key }}
              </code>
              <span class="text-xs text-muted-foreground">
                {{ requirement.scheme?.type }}
                <template v-if="requirement.scheme?.scheme">
                  · {{ requirement.scheme.scheme }}
                </template>
                <template v-if="requirement.scheme?.name">
                  · {{ requirement.scheme.name }}
                </template>
                <template v-if="requirement.scheme?.in">
                  · {{ $t(`duxt.openapi.in.${requirement.scheme.in}`) }}
                </template>
              </span>
            </div>

            <p
              v-if="requirement.scheme?.description"
              class="mt-1 text-sm text-muted-foreground"
            >
              {{ requirement.scheme.description }}
            </p>

            <div
              v-if="requirement.scopes?.length"
              class="mt-1.5 flex flex-wrap gap-1.5"
            >
              <span
                v-for="scope in requirement.scopes"
                :key="scope"
                class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem]"
              >
                {{ scope }}
              </span>
            </div>

            <!-- The flows carry the URLs a reader has to visit to get a token
                 at all, which is the whole of what an OAuth section is for. -->
            <dl
              v-if="requirement.scheme?.flows?.length"
              class="mt-2 space-y-1 text-xs text-muted-foreground"
            >
              <div
                v-for="flow in requirement.scheme.flows"
                :key="flow.name"
                class="flex flex-wrap gap-x-2"
              >
                <dt class="font-medium">{{ flow.name }}</dt>
                <dd v-if="flow.authorizationUrl" class="font-mono break-all">
                  {{ flow.authorizationUrl }}
                </dd>
                <dd v-if="flow.tokenUrl" class="font-mono break-all">
                  {{ flow.tokenUrl }}
                </dd>
              </div>
            </dl>
          </li>
        </ul>
      </li>
    </ul>
  </section>
</template>
