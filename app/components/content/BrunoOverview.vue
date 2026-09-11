<script setup lang="ts">
import type { DuxtBrunoAuth, DuxtBrunoEntry } from '../../../bruno-model';

/**
 * The collection's front page: what is in it, and how to get it.
 *
 * MDC: `::bruno-overview` on the section's index page, with `collection.bru`'s
 * own `docs` block in the slot.
 *
 * THE DOWNLOAD IS THE POINT, and it is why this page is not simply a table of
 * contents. A reference tells you what the requests are; a Bruno collection is
 * a thing you OPEN, and a reader who wants the requests wants the files. The
 * archive is built from the exact version and locale of the page they are on —
 * which is what "Fetch in Bruno" below it cannot offer, since it clones
 * whatever the repository's HEAD is today, and the page says so rather than
 * offering the two as if they were the same thing.
 *
 * The Bruno button is a PLAIN LINK. Bruno publishes a `button.js` that draws
 * one; loading it would put a third-party script on every page of a
 * documentation site to render an anchor this site can render itself.
 */
const props = defineProps<{
  name?: string;
  version?: string;
  auth?: DuxtBrunoAuth;
  headers?: DuxtBrunoEntry[];
  /** How many environment files the collection has — counted, never read. */
  environments?: number;
  /** Absent for a remote collection: nothing outside can build the archive. */
  download?: string;
  /** Absent unless the site declared a public git URL. */
  fetch?: string;
  groups?: {
    name: string;
    description?: string;
    requests?: number;
    to: string;
  }[];
  requests?: { name: string; method: string; url: string; to: string }[];
}>();

const localeLink = useDuxtLink();

/**
 * Every request in the collection, its folders' included.
 *
 * Counted here rather than written into the props, because the figure has to
 * agree with the two lists below it on this very page — and a number the parser
 * sent separately is a number that can disagree with them.
 */
const total = computed(
  () =>
    (props.requests?.length ?? 0) +
    (props.groups ?? []).reduce((all, group) => all + (group.requests ?? 0), 0)
);
</script>

<template>
  <div>
    <slot />

    <div class="not-typeset">
      <!-- ACQUISITION FIRST. Everything below is the table of contents, and a
           reader who came for the collection itself should not have to scroll
           past it. -->
      <section v-if="download || fetch" class="mt-8">
        <h2 class="duxt-label">{{ $t('duxt.bruno.getIt') }}</h2>

        <div class="mt-3 flex flex-wrap items-center gap-3">
          <UiButton v-if="download" as-child variant="default">
            <a :href="download" download>
              <Icon name="lucide:download" aria-hidden="true" class="size-4" />
              {{ $t('duxt.bruno.download') }}
            </a>
          </UiButton>

          <!-- `simple-icons`, and the repository's icon rule says exactly why:
               this is a third party AS ITSELF — the button hands the collection
               to Bruno — where the section's own navbar entry, which names a
               part of the documentation, is `lucide`. -->
          <UiButton v-if="fetch" as-child variant="outline">
            <a :href="fetch" rel="noopener noreferrer" target="_blank">
              <Icon
                name="simple-icons:bruno"
                aria-hidden="true"
                class="size-4"
              />
              {{ $t('duxt.bruno.fetch') }}
            </a>
          </UiButton>
        </div>

        <p v-if="download" class="mt-2 text-sm text-muted-foreground">
          {{ $t('duxt.bruno.downloadHint') }}
        </p>

        <p v-if="fetch" class="mt-1 text-sm text-muted-foreground">
          {{ $t('duxt.bruno.fetchHint') }}
        </p>
      </section>

      <dl
        v-if="version || groups?.length || environments"
        class="mt-8 grid grid-cols-2 gap-x-6 gap-y-7 border-b pb-5 sm:grid-cols-4"
      >
        <div v-if="version" class="flex flex-col gap-1">
          <dd
            class="font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
          >
            {{ version }}
          </dd>
          <dt
            class="flex items-center gap-1.5 text-xs font-medium text-primary"
          >
            <Icon name="lucide:tag" class="size-3.5" />
            {{ $t('duxt.bruno.format') }}
          </dt>
        </div>

        <div class="flex flex-col gap-1">
          <dd
            class="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
          >
            {{ total }}
          </dd>
          <dt
            class="flex items-center gap-1.5 text-xs font-medium text-primary"
          >
            <Icon name="lucide:arrow-left-right" class="size-3.5" />
            {{ $t('duxt.bruno.requests') }}
          </dt>
        </div>

        <div v-if="groups?.length" class="flex flex-col gap-1">
          <dd
            class="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
          >
            {{ groups.length }}
          </dd>
          <dt
            class="flex items-center gap-1.5 text-xs font-medium text-primary"
          >
            <Icon name="lucide:folder-tree" class="size-3.5" />
            {{ $t('duxt.bruno.folders') }}
          </dt>
        </div>

        <div v-if="environments" class="flex flex-col gap-1">
          <dd
            class="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
          >
            {{ environments }}
          </dd>
          <dt
            class="flex items-center gap-1.5 text-xs font-medium text-primary"
          >
            <Icon name="lucide:lock" class="size-3.5" />
            {{ $t('duxt.bruno.environments') }}
          </dt>
        </div>
      </dl>

      <section v-if="groups?.length" class="mt-8">
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
                class="mt-1 size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100 transition-transform ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
              />
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section v-if="requests?.length" class="mt-8">
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

              <span class="font-medium sm:me-auto">{{ entry.name }}</span>

              <!-- The auto margin is on the NAME above, not here: this is a
                   `<code>`, which the stylesheet pins to left-to-right, and a
                   `ms-auto` resolved against that would push the URL back to
                   the start of a right-to-left row. -->
              <code
                class="w-full font-mono text-xs break-all text-muted-foreground sm:w-auto"
              >
                {{ entry.url }}
              </code>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section v-if="auth || headers?.length" class="mt-8">
        <h2 class="duxt-label">{{ $t('duxt.bruno.shared') }}</h2>

        <p v-if="auth" class="mt-2 text-sm text-muted-foreground">
          {{ $t('duxt.bruno.auth') }}:
          <code class="font-mono">{{ auth.mode }}</code>
        </p>

        <div v-if="headers?.length" class="mt-3">
          <DuxtBrunoEntries :entries="headers" />
        </div>
      </section>

      <!-- STATED, ALWAYS. A reader has to know that what they are looking at is
           less than the collection: the environments hold the hosts and the
           keys, and the scripts and tests are code. None of it is on this site,
           and saying so is what stops the page reading as the whole truth. -->
      <p class="mt-8 flex items-start gap-2 text-sm text-muted-foreground">
        <Icon
          name="lucide:shield"
          aria-hidden="true"
          class="mt-0.5 size-4 shrink-0"
        />
        <span>{{ $t('duxt.bruno.notPublished') }}</span>
      </p>
    </div>
  </div>
</template>
