<script setup lang="ts">
import type {
  DuxtOpenApiOperation,
  DuxtOpenApiSecurity,
  DuxtOpenApiSecurityScheme,
  DuxtOpenApiServer
} from '../../openapi-model';

/**
 * The try-it client: the one part of a reference that is not a document.
 *
 * WHERE THE CREDENTIALS GO, because that is the question this component exists
 * to answer honestly. Everything a reader types here lives in this component's
 * own reactive state and nowhere else. It is never written to `localStorage`,
 * `sessionStorage`, a cookie or the URL; it is never sent to the site serving
 * these pages; and it does not survive a reload or a navigation to another
 * operation. The only place a token goes is the request the reader pressed send
 * on, to the server the reader chose. That is a deliberate trade: a client that
 * remembered the token would be pleasanter to use and would put a live
 * credential in browser storage on a page that is, by design, published on the
 * open web.
 *
 * NO PROXY, EVER. The request is made by the reader's own browser with `fetch`,
 * straight at the API. So a server that does not send CORS headers cannot be
 * called from here, and the failure is reported as what it is rather than
 * routed around: a proxy on the documentation site would be an open relay that
 * forwards a reader's credentials to a host of their choosing, and every
 * documentation site running it would be one.
 *
 * Rendered on the server as well as the client — the form is a pure function of
 * the operation, so there is nothing to mismatch, and a control the a11y gate
 * cannot see is a control nothing checks the labels of.
 */
const props = defineProps<{
  operation: DuxtOpenApiOperation;
  servers?: DuxtOpenApiServer[];
  security?: DuxtOpenApiSecurity;
  securitySchemes?: DuxtOpenApiSecurityScheme[];
}>();

const id = useId();
const { t } = useI18n();

const parameters = computed(() => props.operation.parameters ?? []);
const bodies = computed(() => props.operation.requestBody?.content ?? []);

/* ---------------------------------------------------------------- servers */

const servers = computed(() => props.servers ?? []);
const serverIndex = ref(0);
const server = computed(() => servers.value[serverIndex.value]);

/** One box per `{variable}` the chosen server's URL still carries. */
const variables = ref<Record<string, string>>({});

const base = computed(() => openApiServerUrl(server.value, variables.value));

/* ------------------------------------------------------------- parameters */

/**
 * The boxes, prefilled from the document.
 *
 * A reader who presses send on an untouched form should get a request that at
 * least reaches the endpoint, so a parameter starts at whatever the document
 * called an example — its own, its default, or the first member of its enum.
 */
const values = ref<Record<string, string>>(
  Object.fromEntries(
    (props.operation.parameters ?? []).map((parameter) => {
      const derived = openApiExampleValue(parameter.schema);
      const example = parameter.examples?.[0]?.value ?? derived;

      return [
        openApiParameterKey(parameter),
        example === null || example === undefined
          ? ''
          : typeof example === 'string'
            ? example
            : openApiJson(example)
      ];
    })
  )
);

/* ------------------------------------------------------------------- body */

const bodyIndex = ref(0);
const media = computed(() => bodies.value[bodyIndex.value]);

const body = ref(
  bodies.value.length
    ? openApiJson(
        bodies.value[0]!.examples?.[0]?.value ??
          openApiExampleValue(bodies.value[0]!.schema)
      )
    : ''
);

/* ------------------------------------------------------------------- auth */

/**
 * The schemes this operation actually accepts.
 *
 * Every alternative is offered rather than only the first: which one a reader
 * holds a credential for is not something the page can know, and a client that
 * only ever asks for the first is a client half the readers cannot use.
 */
const schemes = computed(() => {
  const wanted = new Set(
    (props.security ?? []).flatMap((alternative) =>
      alternative.map((requirement) => requirement.key)
    )
  );

  return (props.securitySchemes ?? []).filter((scheme) =>
    wanted.has(scheme.key)
  );
});

/** In memory, for the life of this component, and deliberately nowhere else. */
const credentials = ref<Record<string, string>>({});
const usernames = ref<Record<string, string>>({});

const isBasic = (scheme: DuxtOpenApiSecurityScheme) =>
  scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'basic';

/** A scheme no browser can satisfy, said out loud rather than drawn as a box. */
const isClientCertificate = (scheme: DuxtOpenApiSecurityScheme) =>
  scheme.type === 'mutualTLS';

/* ---------------------------------------------------------------- request */

/** What the credentials add to the request, per the scheme that asked for them. */
function authFor(): { headers: Record<string, string>; query: string[] } {
  const headers: Record<string, string> = {};
  const query: string[] = [];

  for (const scheme of schemes.value) {
    const value = credentials.value[scheme.key]?.trim();
    if (!value) continue;

    if (scheme.type === 'apiKey' && scheme.name) {
      if (scheme.in === 'header') headers[scheme.name] = value;
      else if (scheme.in === 'query') {
        query.push(
          `${encodeURIComponent(scheme.name)}=${encodeURIComponent(value)}`
        );
      } else if (scheme.in === 'cookie') {
        headers.Cookie = [
          headers.Cookie,
          `${scheme.name}=${encodeURIComponent(value)}`
        ]
          .filter(Boolean)
          .join('; ');
      }

      continue;
    }

    if (isBasic(scheme)) {
      const user = usernames.value[scheme.key] ?? '';
      // `btoa` is browser-only; on the server this function is never called.
      headers.Authorization = `Basic ${globalThis.btoa?.(`${user}:${value}`) ?? ''}`;
      continue;
    }

    if (scheme.type === 'http') {
      const word = scheme.scheme
        ? scheme.scheme[0]!.toUpperCase() + scheme.scheme.slice(1)
        : 'Bearer';
      headers.Authorization = `${word} ${value}`;
      continue;
    }

    // oauth2 and openIdConnect both end in a bearer token; this client asks for
    // the token rather than running a flow, which would need a redirect URI
    // registered against a documentation site.
    headers.Authorization = `Bearer ${value}`;
  }

  return { headers, query };
}

const request = computed(() => {
  const auth = authFor();

  const built = openApiRequest(
    props.operation,
    base.value,
    values.value,
    {
      ...(media.value ? { 'Content-Type': media.value.type } : {}),
      ...auth.headers
    },
    bodies.value.length && body.value.trim() ? body.value : undefined
  );

  if (!auth.query.length) return built;

  return {
    ...built,
    url: `${built.url}${built.url.includes('?') ? '&' : '?'}${auth.query.join('&')}`
  };
});

const samples = computed(() => [
  { name: 'curl', language: 'bash', code: openApiCurl(request.value) },
  { name: 'fetch', language: 'ts', code: openApiFetch(request.value) }
]);

const sample = ref(0);

/* ------------------------------------------------------------------- send */

interface Result {
  status: number;
  statusText: string;
  duration: number;
  headers: [string, string][];
  body: string;
}

const sending = ref(false);
const result = ref<Result>();
const failure = ref<string>();

async function send() {
  sending.value = true;
  result.value = undefined;
  failure.value = undefined;

  const started = performance.now();

  try {
    const response = await fetch(request.value.url, {
      method: request.value.method,
      headers: request.value.headers,
      body: request.value.body
    });

    const text = await response.text();

    result.value = {
      status: response.status,
      statusText: response.statusText,
      duration: Math.round(performance.now() - started),
      headers: [...response.headers.entries()],
      body: pretty(text)
    };
  } catch (error) {
    // `fetch` rejects with a bare TypeError for a CORS refusal, a DNS failure
    // and an offline browser alike — the browser deliberately tells the page
    // nothing more — so the message says what the possibilities are rather than
    // pretending to know which one happened.
    failure.value =
      error instanceof Error && error.name !== 'TypeError'
        ? error.message
        : t('duxt.openapi.client.blocked');
  } finally {
    sending.value = false;
  }
}

/** A JSON body, indented; anything else exactly as it arrived. */
function pretty(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
</script>

<template>
  <div class="rounded-lg border">
    <div class="border-b px-4 py-3">
      <h2 class="text-sm font-semibold">
        {{ $t('duxt.openapi.client.title') }}
      </h2>
    </div>

    <form class="space-y-4 px-4 py-3" @submit.prevent="send">
      <!-- server -->
      <div v-if="servers.length">
        <label
          :for="`${id}-server`"
          class="mb-1 block text-xs font-medium text-muted-foreground"
        >
          {{ $t('duxt.openapi.client.server') }}
        </label>

        <select
          :id="`${id}-server`"
          v-model.number="serverIndex"
          class="h-9 w-full rounded-md border border-input bg-transparent px-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option
            v-for="(entry, index) in servers"
            :key="entry.url"
            :value="index"
          >
            {{ entry.url }}
          </option>
        </select>

        <div
          v-for="variable in server?.variables ?? []"
          :key="variable.name"
          class="mt-2"
        >
          <label
            :for="`${id}-var-${variable.name}`"
            class="mb-1 block font-mono text-xs text-muted-foreground"
          >
            {{ variable.name }}
          </label>
          <Input
            :id="`${id}-var-${variable.name}`"
            v-model="variables[variable.name]"
            class="font-mono text-sm"
            :placeholder="variable.default"
            autocomplete="off"
          />
        </div>
      </div>

      <!-- authentication -->
      <fieldset v-if="schemes.length" class="space-y-2">
        <legend class="mb-1 text-xs font-medium text-muted-foreground">
          {{ $t('duxt.openapi.client.auth') }}
        </legend>

        <div v-for="scheme in schemes" :key="scheme.key">
          <p
            v-if="isClientCertificate(scheme)"
            class="text-sm text-muted-foreground"
          >
            {{ $t('duxt.openapi.client.certificate') }}
          </p>

          <template v-else>
            <label
              v-if="isBasic(scheme)"
              :for="`${id}-user-${scheme.key}`"
              class="mb-1 block font-mono text-xs text-muted-foreground"
            >
              {{ $t('duxt.openapi.client.username') }}
            </label>
            <Input
              v-if="isBasic(scheme)"
              :id="`${id}-user-${scheme.key}`"
              v-model="usernames[scheme.key]"
              class="mb-2 text-sm"
              autocomplete="off"
            />

            <label
              :for="`${id}-auth-${scheme.key}`"
              class="mb-1 block font-mono text-xs text-muted-foreground"
            >
              {{ scheme.key }}
            </label>
            <Input
              :id="`${id}-auth-${scheme.key}`"
              v-model="credentials[scheme.key]"
              type="password"
              class="text-sm"
              autocomplete="off"
              spellcheck="false"
            />
          </template>
        </div>

        <p class="text-xs text-muted-foreground">
          {{ $t('duxt.openapi.client.credentials') }}
        </p>
      </fieldset>

      <!-- parameters -->
      <fieldset v-if="parameters.length" class="space-y-2">
        <legend class="mb-1 text-xs font-medium text-muted-foreground">
          {{ $t('duxt.openapi.parameters') }}
        </legend>

        <div
          v-for="parameter in parameters"
          :key="openApiParameterKey(parameter)"
        >
          <label
            :for="`${id}-p-${openApiParameterKey(parameter)}`"
            class="mb-1 block font-mono text-xs text-muted-foreground"
          >
            {{ parameter.name }}
            <span v-if="parameter.required" class="text-destructive">*</span>
          </label>
          <Input
            :id="`${id}-p-${openApiParameterKey(parameter)}`"
            v-model="values[openApiParameterKey(parameter)]"
            class="font-mono text-sm"
            autocomplete="off"
          />
        </div>
      </fieldset>

      <!-- body -->
      <div v-if="bodies.length">
        <label
          :for="`${id}-body`"
          class="mb-1 block text-xs font-medium text-muted-foreground"
        >
          {{ $t('duxt.openapi.requestBody') }}
        </label>

        <select
          v-if="bodies.length > 1"
          v-model.number="bodyIndex"
          :aria-label="$t('duxt.openapi.client.mediaType')"
          class="mb-2 h-9 w-full rounded-md border border-input bg-transparent px-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option
            v-for="(entry, index) in bodies"
            :key="entry.type"
            :value="index"
          >
            {{ entry.type }}
          </option>
        </select>

        <textarea
          :id="`${id}-body`"
          v-model="body"
          rows="8"
          spellcheck="false"
          class="w-full rounded-md border border-input bg-transparent p-3 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <Button type="submit" :disabled="sending" class="w-full">
        <Icon
          :name="sending ? 'lucide:loader-circle' : 'lucide:send'"
          class="size-4"
          :class="{ 'animate-spin': sending }"
        />
        {{ $t('duxt.openapi.client.send') }}
      </Button>

      <p class="text-xs text-muted-foreground">
        {{ $t('duxt.openapi.client.direct') }}
      </p>
    </form>

    <!-- what came back -->
    <div v-if="failure" class="border-t px-4 py-3">
      <p class="text-sm text-destructive">{{ failure }}</p>
    </div>

    <div v-else-if="result" class="border-t px-4 py-3">
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="font-mono font-semibold">{{ result.status }}</span>
        <span class="text-muted-foreground">{{ result.statusText }}</span>
        <span class="ml-auto font-mono text-xs text-muted-foreground">
          {{ result.duration }}&nbsp;ms
        </span>
      </div>

      <DuxtCodeBlock v-if="result.body" :code="result.body" language="json" />

      <details v-if="result.headers.length" class="mt-2">
        <summary class="cursor-pointer text-xs text-muted-foreground">
          {{ $t('duxt.openapi.headers') }}
        </summary>
        <dl class="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
          <div
            v-for="[name, value] in result.headers"
            :key="name"
            class="flex gap-2"
          >
            <dt class="shrink-0">{{ name }}</dt>
            <dd class="break-all">{{ value }}</dd>
          </div>
        </dl>
      </details>
    </div>

    <!-- the same request, as something to paste elsewhere -->
    <div class="border-t px-4 py-3">
      <div class="mb-2 flex flex-wrap gap-1.5">
        <button
          v-for="(entry, index) in samples"
          :key="entry.name"
          type="button"
          class="rounded-md px-2 py-1 font-mono text-xs transition-colors"
          :class="
            index === sample
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          "
          :aria-pressed="index === sample"
          @click="sample = index"
        >
          {{ entry.name }}
        </button>
      </div>

      <DuxtCodeBlock
        :code="samples[sample]!.code"
        :language="samples[sample]!.language"
      />
    </div>
  </div>
</template>
