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
defineProps<{
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
</script>

<template>
  <div>
    <div v-if="version" class="not-typeset mb-4">
      <Badge variant="secondary" class="font-mono">{{ version }}</Badge>
    </div>

    <p v-if="summary" class="not-typeset mb-4 text-lg text-muted-foreground">
      {{ summary }}
    </p>

    <!-- The document's own description, as the Markdown it is written in. -->
    <slot />

    <div class="not-typeset">
      <section v-if="servers?.length" class="mt-8">
        <h2 class="text-sm font-semibold tracking-wide uppercase">
          {{ $t('duxt.openapi.servers') }}
        </h2>

        <ul class="mt-3 divide-y rounded-lg border">
          <li v-for="server in servers" :key="server.url" class="px-4 py-3">
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
        <h2 class="text-sm font-semibold tracking-wide uppercase">
          {{ $t('duxt.openapi.authentication') }}
        </h2>

        <ul class="mt-3 divide-y rounded-lg border">
          <li
            v-for="scheme in securitySchemes"
            :key="scheme.key"
            class="px-4 py-3"
          >
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

      <section v-if="groups?.length" class="mt-8">
        <h2 class="text-sm font-semibold tracking-wide uppercase">
          {{ $t('duxt.openapi.endpoints') }}
        </h2>

        <ul class="mt-3 grid gap-3 sm:grid-cols-2">
          <li v-for="group in groups" :key="group.to">
            <NuxtLink
              :to="localeLink(group.to) ?? group.to"
              class="block h-full rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div class="flex flex-wrap items-baseline gap-2">
                <span class="font-medium">{{ group.name }}</span>
                <span class="font-mono text-xs text-muted-foreground">
                  {{ group.operations }}
                </span>
              </div>
              <p
                v-if="group.description"
                class="mt-1 line-clamp-2 text-sm text-muted-foreground"
              >
                {{ group.description }}
              </p>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <dl
        v-if="contact ?? license ?? termsOfService ?? externalDocs"
        class="mt-8 space-y-2 text-sm"
      >
        <div v-if="contact" class="flex flex-wrap gap-2">
          <dt class="text-muted-foreground">
            {{ $t('duxt.openapi.contact') }}
          </dt>
          <dd>
            <a
              v-if="contact.url ?? contact.email"
              :href="contact.url ?? `mailto:${contact.email}`"
              rel="noopener noreferrer"
              class="text-primary underline underline-offset-4"
            >
              {{ contact.name ?? contact.url ?? contact.email }}
            </a>
            <template v-else>{{ contact.name }}</template>
          </dd>
        </div>

        <div v-if="license" class="flex flex-wrap gap-2">
          <dt class="text-muted-foreground">
            {{ $t('duxt.openapi.license') }}
          </dt>
          <dd>
            <a
              v-if="license.url"
              :href="license.url"
              rel="noopener noreferrer"
              class="text-primary underline underline-offset-4"
            >
              {{ license.name ?? license.identifier }}
            </a>
            <template v-else>{{ license.name ?? license.identifier }}</template>
          </dd>
        </div>

        <div v-if="termsOfService" class="flex flex-wrap gap-2">
          <dt class="text-muted-foreground">{{ $t('duxt.openapi.terms') }}</dt>
          <dd>
            <a
              :href="termsOfService"
              rel="noopener noreferrer"
              class="text-primary break-all underline underline-offset-4"
            >
              {{ termsOfService }}
            </a>
          </dd>
        </div>

        <div v-if="externalDocs" class="flex flex-wrap gap-2">
          <dt class="text-muted-foreground">
            {{ $t('duxt.openapi.moreInfo') }}
          </dt>
          <dd>
            <a
              :href="externalDocs.url"
              rel="noopener noreferrer"
              class="text-primary break-all underline underline-offset-4"
            >
              {{ externalDocs.description ?? externalDocs.url }}
            </a>
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>
