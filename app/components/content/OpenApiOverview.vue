<script setup lang="ts">
import type {
  DuxtOpenApiExternalDocs,
  DuxtOpenApiSecurity,
  DuxtOpenApiSecurityScheme,
  DuxtOpenApiServer
} from '../../../openapi-model';

/**
 * The reference's front page: what the API is, where it lives, how to get in.
 *
 * MDC: `::open-api-overview` on the section's index page, with the document's
 * own `info.description` in the slot. It is the page a reader lands on from the
 * navbar entry, and the three questions it answers — base URL, authentication,
 * which groups of endpoints exist — are the three a reference is opened for
 * before any single endpoint is.
 */
const props = defineProps<{
  version?: string;
  summary?: string;
  servers?: DuxtOpenApiServer[];
  securitySchemes?: DuxtOpenApiSecurityScheme[];
  security?: DuxtOpenApiSecurity;
  contact?: { name?: string; url?: string; email?: string };
  license?: { name?: string; identifier?: string; url?: string };
  termsOfService?: string;
  externalDocs?: DuxtOpenApiExternalDocs;
  groups?: {
    name: string;
    description?: string;
    webhooks?: boolean;
    operations?: number;
    to: string;
  }[];
}>();

const localeLink = useDuxtLink();

/** Every operation the document describes, counted over its groups. */
const operations = computed(() =>
  (props.groups ?? []).reduce((all, group) => all + (group.operations ?? 0), 0)
);
</script>

<template>
  <div>
    <p v-if="summary" class="not-typeset mb-4 text-lg text-muted-foreground">
      {{ summary }}
    </p>

    <!-- The document's own description, as the Markdown it is written in. -->
    <slot />

    <!-- WHAT THE DOCUMENT IS, in figures — the same row the release history
         opens with, and the reason the version is no longer a badge floating
         over the page: a version is a fact about the document, and a fact
         belongs where the other facts are. On its own above the title it read
         as a label for the page, which it never was. -->
    <dl
      v-if="version || groups?.length"
      class="not-typeset mt-8 grid grid-cols-2 gap-x-6 gap-y-7 border-b pb-5 sm:grid-cols-4"
    >
      <div v-if="version" class="flex flex-col gap-1">
        <dd
          class="font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
        >
          {{ version }}
        </dd>
        <dt class="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Icon name="lucide:tag" class="size-3.5" />
          {{ $t('duxt.openapi.version') }}
        </dt>
      </div>

      <div v-if="groups?.length" class="flex flex-col gap-1">
        <dd
          class="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
        >
          {{ operations }}
        </dd>
        <dt class="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Icon name="lucide:arrow-left-right" class="size-3.5" />
          {{ $t('duxt.openapi.operations') }}
        </dt>
      </div>

      <div v-if="groups?.length" class="flex flex-col gap-1">
        <dd
          class="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
        >
          {{ groups.length }}
        </dd>
        <dt class="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Icon name="lucide:folder-tree" class="size-3.5" />
          {{ $t('duxt.openapi.groups') }}
        </dt>
      </div>

      <div v-if="servers?.length" class="flex flex-col gap-1">
        <dd
          class="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
        >
          {{ servers.length }}
        </dd>
        <dt class="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Icon name="lucide:server" class="size-3.5" />
          {{ $t('duxt.openapi.serverCount') }}
        </dt>
      </div>
    </dl>

    <div class="not-typeset">
      <!-- THE GROUPS FIRST, and that is the whole of this reordering: they
           are what a reader opened the reference for, and they stood third —
           under the base URL and the authentication, which are details you
           come back to once you know which endpoint you want. -->
      <section v-if="groups?.length" class="mt-8">
        <h2 class="duxt-label">
          {{ $t('duxt.openapi.endpoints') }}
        </h2>

        <!-- The groups as rows, with the arrow every other list of links on
             this site steps forward under the pointer. A grid of cards claimed
             they are alternatives to choose between; they are a table of
             contents. -->
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
                    {{ group.operations }}
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

      <section v-if="servers?.length" class="mt-8">
        <h2 class="duxt-label">
          {{ $t('duxt.openapi.servers') }}
        </h2>

        <!-- Rows a hairline apart rather than a bordered card: the card said
             "one object" about a list of several, and three of them down a page
             put a frame around every fact the page states. -->
        <ul class="mt-3 divide-y divide-border/60 border-t border-border/60">
          <li v-for="server in servers" :key="server.url" class="py-3">
            <code class="font-mono text-sm break-all">{{ server.url }}</code>

            <p
              v-if="server.description"
              class="mt-1 text-sm text-muted-foreground"
            >
              {{ server.description }}
            </p>

            <!-- A `{variable}` in the URL is not decoration: without its
                 default and its allowed values the base URL is unusable. -->
            <dl
              v-if="server.variables?.length"
              class="mt-2 space-y-1 text-xs text-muted-foreground"
            >
              <div
                v-for="variable in server.variables"
                :key="variable.name"
                class="flex flex-wrap gap-x-2"
              >
                <dt class="font-mono">{{ variable.name }}</dt>
                <dd class="font-mono">{{ variable.default }}</dd>
                <dd v-if="variable.enum?.length" class="font-mono">
                  {{ variable.enum.join(' · ') }}
                </dd>
              </div>
            </dl>
          </li>
        </ul>
      </section>

      <section v-if="securitySchemes?.length" class="mt-8">
        <h2 class="duxt-label">
          {{ $t('duxt.openapi.authentication') }}
        </h2>

        <ul class="mt-3 divide-y divide-border/60 border-t border-border/60">
          <li v-for="scheme in securitySchemes" :key="scheme.key" class="py-3">
            <div class="flex flex-wrap items-baseline gap-2">
              <code class="font-mono text-sm font-medium">{{
                scheme.key
              }}</code>
              <span class="text-xs text-muted-foreground">
                {{ scheme.type }}
                <template v-if="scheme.scheme">· {{ scheme.scheme }}</template>
                <template v-if="scheme.name">· {{ scheme.name }}</template>
                <template v-if="scheme.in">
                  · {{ $t(`duxt.openapi.in.${scheme.in}`) }}
                </template>
              </span>
            </div>

            <p
              v-if="scheme.description"
              class="mt-1 text-sm text-muted-foreground"
            >
              {{ scheme.description }}
            </p>
          </li>
        </ul>
      </section>

      <!-- ONE ROW, not four labelled lines. Contact, licence and terms are
           what a reader looks up once and never reads: as a definition list
           they took four lines and the visual weight of a section, under an
           actual section that answers what the API does. -->
      <p
        v-if="contact ?? license ?? termsOfService ?? externalDocs"
        class="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-5 text-xs text-muted-foreground"
      >
        <a
          v-if="contact"
          :href="contact.url ?? `mailto:${contact.email}`"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <Icon name="lucide:mail" class="size-3.5" />
          <!-- The words the label used to print, kept for whoever cannot see
               the icon that replaced them: an envelope beside "Support" says
               "contact" only to a reader who can see the envelope. -->
          <span class="sr-only">{{ $t('duxt.openapi.contact') }}:</span>
          {{ contact.name ?? contact.url ?? contact.email }}
        </a>

        <a
          v-if="license"
          :href="license.url"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <Icon name="lucide:scale" class="size-3.5" />
          <span class="sr-only">{{ $t('duxt.openapi.license') }}:</span>
          {{ license.name ?? license.identifier }}
        </a>

        <a
          v-if="termsOfService"
          :href="termsOfService"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <Icon name="lucide:file-text" class="size-3.5" />
          {{ $t('duxt.openapi.terms') }}
        </a>

        <!-- The one item here whose text the DOCUMENT wrote. `description` is
             prose in OpenAPI's own words, so it may be a label ("Guide") or a
             whole sentence — and a sentence in a row of two-word chips reads as
             a paragraph that lost its paragraph. It is clamped rather than
             shortened: the full text stays in the link, which is what a screen
             reader announces and what the title shows on hover. -->
        <a
          v-if="externalDocs"
          :href="externalDocs.url"
          :title="externalDocs.description"
          rel="noopener noreferrer"
          target="_blank"
          class="inline-flex min-w-0 items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <Icon name="lucide:book-open" class="size-3.5 shrink-0" />
          <span class="max-w-64 truncate">
            {{ externalDocs.description ?? $t('duxt.openapi.moreInfo') }}
          </span>
          <Icon
            name="lucide:arrow-up-right"
            class="size-3 shrink-0 opacity-60"
          />
        </a>
      </p>
    </div>
  </div>
</template>
