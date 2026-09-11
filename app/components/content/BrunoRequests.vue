<script setup lang="ts">
/**
 * The requests in one folder, as the list a reader scans.
 *
 * MDC: `::bruno-requests` on a folder's index page. The method is a coloured
 * chip and the URL is the line beside it, because "find this request" is the
 * search a reader actually performs — a list of names alone makes them open
 * every one to find the `DELETE`.
 *
 * FOLDERS FIRST, THEN REQUESTS, which is Bruno's own nesting: a folder holds
 * both, and OpenAPI's flat tags have no counterpart for it. Rendering the
 * sub-folders as a second list rather than flattening them is what keeps the
 * page the same shape as the collection on disk.
 */
defineProps<{
  requests?: { name: string; method: string; url: string; to: string }[];
  groups?: {
    name: string;
    description?: string;
    requests?: number;
    to: string;
  }[];
}>();

const localeLink = useDuxtLink();
</script>

<template>
  <div>
    <!-- Outside `not-typeset`: the folder's own `docs` block is Markdown and
         wants the typeset preset; the lists below emphatically do not. -->
    <slot />

    <section v-if="groups?.length" class="not-typeset mt-6">
      <h2 class="duxt-label">{{ $t('duxt.bruno.folders') }}</h2>

      <ul class="mt-3 -mx-3">
        <li
          v-for="group in groups"
          :key="group.to"
          class="border-t border-border/60 first:border-t-0"
        >
          <NuxtLink
            :to="localeLink(group.to) ?? group.to"
            class="group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/40"
          >
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-baseline gap-x-3">
                <span class="font-medium">{{ group.name }}</span>
                <span class="text-xs text-muted-foreground tabular-nums">
                  {{ group.requests }}
                </span>
              </span>

              <span
                v-if="group.description"
                class="mt-1 line-clamp-2 block text-sm text-muted-foreground"
              >
                {{ group.description }}
              </span>
            </span>

            <Icon
              name="lucide:arrow-right"
              aria-hidden="true"
              class="mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section v-if="requests?.length" class="not-typeset mt-6">
      <h2 class="duxt-label">{{ $t('duxt.bruno.requests') }}</h2>

      <ul class="mt-3 -mx-3">
        <li
          v-for="entry in requests"
          :key="entry.to"
          class="border-t border-border/60 first:border-t-0"
        >
          <NuxtLink
            :to="localeLink(entry.to) ?? entry.to"
            class="flex flex-wrap items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/40"
          >
            <DuxtOpenApiMethod :method="entry.method" class="w-16" />

            <span class="font-medium">{{ entry.name }}</span>

            <code
              class="w-full font-mono text-xs break-all text-muted-foreground sm:ml-auto sm:w-auto sm:text-right"
            >
              {{ entry.url }}
            </code>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
