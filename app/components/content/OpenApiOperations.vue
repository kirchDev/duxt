<script setup lang="ts">
import type { DuxtOpenApiExternalDocs } from '../../../openapi-model';

/**
 * The endpoints under one tag, as the list a reader scans.
 *
 * MDC: `::open-api-operations` on a tag's index page. The method is a coloured
 * chip and the path is the link text, because "find this endpoint" is the
 * search a reader actually performs — a list of summaries alone makes them read
 * every line to find `DELETE /pets/{id}`.
 */
defineProps<{
  operations?: {
    method: string;
    path: string;
    kind?: string;
    summary?: string;
    deprecated?: boolean;
    to: string;
  }[];
  externalDocs?: DuxtOpenApiExternalDocs;
}>();

const localeLink = useDuxtLink();
</script>

<template>
  <div>
    <!-- Outside `not-typeset`: the tag's own description is Markdown and wants
         the typeset preset; the list below emphatically does not. -->
    <slot />

    <ul v-if="operations?.length" class="not-typeset mt-6 -mx-3">
      <li
        v-for="entry in operations"
        :key="`${entry.method}-${entry.to}`"
        class="border-t border-border/60 first:border-t-0"
      >
        <NuxtLink
          :to="localeLink(entry.to) ?? entry.to"
          class="flex flex-wrap items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/40"
        >
          <DuxtOpenApiMethod :method="entry.method" class="w-16" />

          <code class="font-mono text-sm break-all">{{ entry.path }}</code>

          <span
            v-if="entry.summary"
            class="w-full text-sm text-muted-foreground sm:ms-auto sm:w-auto sm:text-end"
          >
            {{ entry.summary }}
          </span>

          <UiBadge v-if="entry.deprecated" variant="destructive">
            {{ $t('duxt.openapi.deprecated') }}
          </UiBadge>
        </NuxtLink>
      </li>
    </ul>

    <p v-if="externalDocs" class="not-typeset mt-6 text-sm">
      <a
        :href="externalDocs.url"
        rel="noopener noreferrer"
        target="_blank"
        class="text-primary underline underline-offset-4"
      >
        {{ externalDocs.description ?? $t('duxt.openapi.moreInfo') }}
      </a>
    </p>
  </div>
</template>
