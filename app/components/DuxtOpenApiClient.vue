<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';
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
 * NO BOX FOR A COOKIE. `Cookie` is a forbidden header name for `fetch`, so a
 * browser drops it with no error, no rejection and nothing in the console. A
 * page therefore cannot satisfy an `apiKey` scheme declared `in: cookie`, nor a
 * cookie parameter — and drawing a box for one would collect a live credential
 * to throw it away, while the `curl` sample beneath showed the header present.
 * So the client says so, the way it already does for `mutualTLS`, and the
 * request it sends and the sample it prints are the same request again.
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
  /**
   * `panel` — one card, which is what the 23rem column beside an endpoint has
   * room for. `split` — the form and the samples as two, for a place with the
   * whole width and no column to be narrow in. See the template.
   */
  layout?: 'panel' | 'split';
  /**
   * Which side the FORM takes in the first of the two split rows; the samples
   * row then takes the other one.
   *
   * The page decides it, not this component: the rows are part of a run of
   * bands that alternate down the whole landing page, and a component counting
   * only its own two would sooner or later repeat the side of the band above
   * it.
   */
  reverse?: boolean;
}>();

const split = computed(() => props.layout === 'split');

const id = useId();
const { t } = useI18n();
const notify = useDuxtToast();
const analytics = useDuxtAnalytics();

const parameters = computed(() => props.operation.parameters ?? []);
const bodies = computed(() => props.operation.requestBody?.content ?? []);

/* ---------------------------------------------------------------- servers */

const servers = computed(() => props.servers ?? []);
const serverIndex = ref(0);
const server = computed(() => servers.value[serverIndex.value]);

/**
 * The chosen server, as the STRING reka's Select carries.
 *
 * A list's value is a string in every listbox implementation there is, and the
 * index it stands for is what everything downstream reads — so the conversion
 * lives here, once, rather than in a `.number` modifier the component does not
 * have.
 */
const serverValue = computed({
  get: () => String(serverIndex.value),
  set: (value: string) => {
    serverIndex.value = Number(value);
  }
});

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
    (props.operation.parameters ?? [])
      // No box is drawn for a cookie, so no state is kept for one: the form and
      // what is sent say the same thing about every parameter.
      .filter((parameter) => parameter.in !== 'cookie')
      .map((parameter) => {
        const derived = openApiExampleValue(
          parameter.schema,
          'request',
          0,
          duxt.openapi?.exampleDepth
        );
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

/**
 * Is this body a shape a form can say?
 *
 * The answer follows the CHOSEN media type, not the operation: a document may
 * describe the same endpoint as flat JSON and as multipart, and only one of
 * those is a form. See `openApiBodyForm` for what disqualifies a schema.
 */
const bodyForm = computed(() => openApiBodyForm(media.value?.schema));

/** JSON only: a form over `text/csv` would be a form over one string. */
const formable = computed(
  () => bodyForm.value.expressible && /json/i.test(media.value?.type ?? '')
);

const bodyFields = computed(() =>
  bodyForm.value.expressible ? bodyForm.value.fields : []
);

/**
 * What the editor knows about this body — wider than the form's fields.
 *
 * A body the form gives up on still has keys worth offering and worth
 * checking: see `openApiBodyKeys` for why the two questions are not the same
 * one asked twice.
 */
const bodyKeys = computed(() => openApiBodyKeys(media.value?.schema));

/**
 * Which view the reader is in — remembered, for the reason the sample is.
 *
 * The choice between a form and raw JSON is a way of working rather than a
 * property of one endpoint: somebody who edits the body as JSON means it on
 * the next one too. Falls back to the form the moment it cannot serve.
 */
const duxt = useDuxtConfig();

const storedMode = useDuxtChoice('request-body-view');

const bodyMode = computed({
  get: (): 'form' | 'json' => (storedMode.value === 'json' ? 'json' : 'form'),
  set: (value: 'form' | 'json') => {
    storedMode.value = value;
  }
});

/**
 * The two views, with their labels written out rather than built from the
 * mode: `tests/i18n-ownership.test.ts` reads the sources for the keys a locale
 * file ships, and a key assembled at runtime is a key nothing points at.
 */
const bodyViews = [
  { value: 'form' as const, label: 'duxt.openapi.client.form' },
  { value: 'json' as const, label: 'duxt.openapi.client.json' }
];

const mode = computed(() => (formable.value ? bodyMode.value : 'json'));

/**
 * The form's boxes, derived from the TEXT rather than kept beside it.
 *
 * One value, two views: whatever was last typed in the editor is what the form
 * opens on, and writing a box back edits that same text. Two states would drift
 * the first time a reader switched tabs mid-edit — and the text is the one that
 * has to win, because it is what is sent.
 */
const bodyValues = computed({
  get: () => openApiBodyValues(bodyFields.value, body.value),
  set: (values: Record<string, string>) => {
    body.value = openApiBodyJson(bodyFields.value, values);
  }
});

function setBodyValue(name: string, value: string) {
  bodyValues.value = { ...bodyValues.value, [name]: value };
}

/** What the body is not, while it is not JSON. Empty is not an error. */
const bodyError = computed(() => {
  const text = body.value.trim();
  if (!text) return undefined;

  try {
    JSON.parse(text);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
});

/** Two spaces, the way every other JSON on these pages is written. */
function formatBody() {
  try {
    body.value = openApiJson(JSON.parse(body.value));
  } catch {
    // Nothing to format yet; the error under the box already says so.
  }
}

/** The chosen media type, as a string — see `serverValue`. */
const bodyValue = computed({
  get: () => String(bodyIndex.value),
  set: (value: string) => {
    bodyIndex.value = Number(value);
  }
});

const body = ref(
  bodies.value.length
    ? openApiJson(
        bodies.value[0]!.examples?.[0]?.value ??
          openApiExampleValue(
            bodies.value[0]!.schema,
            'request',
            0,
            duxt.openapi?.exampleDepth
          )
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

/**
 * A field pre-filled from the document's own `x-duxt-example`.
 *
 * For a demo endpoint that answers to any token, or to one known one: without
 * it a reader has to invent a value before the button does anything, which is a
 * step between "I see a client" and "I saw it work".
 *
 * ONLY WHAT THE DOCUMENT PUBLISHES. Nothing is read from storage and nothing is
 * kept — see the note at the top of this file — so this is a value that was
 * already public, or it is not there at all.
 */
watchEffect(() => {
  for (const scheme of schemes.value) {
    if (scheme.example && credentials.value[scheme.key] === undefined) {
      credentials.value[scheme.key] = scheme.example;
    }
  }
});
const usernames = ref<Record<string, string>>({});

const isBasic = (scheme: DuxtOpenApiSecurityScheme) =>
  scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'basic';

/** A scheme no browser can satisfy, said out loud rather than drawn as a box. */
const isClientCertificate = (scheme: DuxtOpenApiSecurityScheme) =>
  scheme.type === 'mutualTLS';

/** The other one: a page cannot set a cookie, so it is said rather than drawn. */
const isCookieKey = (scheme: DuxtOpenApiSecurityScheme) =>
  scheme.type === 'apiKey' && scheme.in === 'cookie';

/* ---------------------------------------------------------------- request */

/** What the credentials add to the request, per the scheme that asked for them. */
function authFor(): { headers: Record<string, string>; query: string[] } {
  const headers: Record<string, string> = {};
  const query: string[] = [];

  for (const scheme of schemes.value) {
    const value = credentials.value[scheme.key]?.trim();
    if (!value) continue;

    if (scheme.type === 'apiKey' && scheme.name) {
      // `in: cookie` is absent on purpose: it draws no box, so it holds no
      // value, and a `Cookie` header would be dropped by the browser anyway.
      if (scheme.in === 'header') headers[scheme.name] = value;
      else if (scheme.in === 'query') {
        query.push(
          `${encodeURIComponent(scheme.name)}=${encodeURIComponent(value)}`
        );
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

/**
 * The samples this site offers, each already written for the current request.
 *
 * `generate` runs here rather than at build time because the request is being
 * edited: a path parameter or a body character changes and every sample has to
 * say the new thing. `label` and `group` arrive already resolved — a consumer's
 * own entry may carry an i18n key, and `useDuxtConfig` collapses all three text
 * forms before a component ever sees them.
 */
/**
 * The samples this site offers, each already written for the current request.
 *
 * `generate` runs here rather than at build time because the request is being
 * edited: a path parameter or a body character changes and every sample has to
 * say the new thing. `label` and `group` arrive already resolved — a consumer's
 * own entry may carry an i18n key, and `useDuxtConfig` collapses all three text
 * forms before a component ever sees them.
 *
 * A SPEC SAMPLE REPLACES THE GENERATED ONES FOR ITS LANGUAGE. `x-codeSamples` is
 * written by the person who owns the API, who knows its idioms better than a
 * generator does — so where a document carries a `php` sample, PHP's tab shows
 * that instead of Guzzle and Laravel. The price is that it is STATIC: it cannot
 * follow the reader's edits, which is why it is labelled rather than quietly
 * mixed in.
 *
 * It keeps the shipped group's name where the language matches one, so a `php`
 * sample joins a tab reading PHP rather than opening a second one spelled
 * differently.
 */
const samples = computed(() => {
  const shipped = resolveRequestSamples(duxt.requestSamples).map((entry) => ({
    id: entry.id,
    language: entry.language,
    label: asText(entry.label) ?? entry.id,
    group: asText(entry.group) ?? entry.id,
    icon: entry.icon,
    code: entry.generate(request.value),
    fromSpec: false
  }));

  const written = props.operation.codeSamples ?? [];
  if (!written.length) return shipped;

  const replaced = new Set(written.map((entry) => entry.lang));

  return [
    ...shipped.filter((entry) => !replaced.has(entry.language)),
    ...written.map((entry, index) => ({
      id: `spec:${entry.lang}:${index}`,
      language: entry.lang,
      label: entry.label ?? entry.lang,
      group:
        shipped.find((candidate) => candidate.language === entry.lang)?.group ??
        entry.lang,
      // A spec sample carries no icon of its own; where it joins a shipped
      // group that group keeps its mark, and where it opens one of its own the
      // language answers for it.
      icon: shipped.find((candidate) => candidate.language === entry.lang)
        ?.icon,
      code: entry.source,
      fromSpec: true
    }))
  ];
});

/**
 * REMEMBERED ACROSS PAGES, like the package manager: a reader who works in
 * `curl` works in `curl` on the next endpoint too, and asking again on every
 * page of a forty-endpoint reference is asking forty times. The cookie travels
 * with the request, so the server already renders the right tab.
 *
 * The ID is what is stored, not an index: the list is configurable and open, so
 * a position means nothing across two sites, or across one that adds an entry.
 */
const stored = useDuxtChoice('request-sample');

const sample = computed({
  get: () =>
    samples.value.find((entry) => entry.id === stored.value)?.id ??
    samples.value[0]!.id,
  set: (value: string) => {
    stored.value = value;
  }
});

const shown = computed(() =>
  samples.value.find((entry) => entry.id === sample.value)!
);

/**
 * TWO LEVELS, because the registry is open and a flat strip is not.
 *
 * The language is the strip and the client is a select inside it, so PHP with
 * Guzzle, Laravel and the curl extension costs one tab rather than three — and a
 * consumer adding three Ruby generators still costs one. Choosing a language
 * moves to its first client; the cookie holds the client, so the language it
 * belongs to needs no second cookie.
 */
const groups = computed(() => [
  ...new Set(samples.value.map((entry) => entry.group))
]);

const group = computed({
  get: () => shown.value.group,
  set: (value: string) => {
    const first = samples.value.find((entry) => entry.group === value);
    if (first) sample.value = first.id;
  }
});

/**
 * The mark for a language tab.
 *
 * A sample's own `icon` where it names one, and `fileIcon(language)` otherwise —
 * which is the fallback and not the rule, because the language is the GRAMMAR: a
 * `$fetch` sample asks for `typescript`, so the JavaScript tab used to wear a
 * TypeScript logo, and `curl` a generic shell file.
 */
function groupIcon(group: string): string {
  const named = samples.value.find(
    (entry) => entry.group === group && entry.icon
  );
  if (named?.icon) return named.icon;

  return fileIcon(
    samples.value.find((entry) => entry.group === group)?.language
  );
}

const clients = computed(() =>
  samples.value.filter((entry) => entry.group === group.value)
);

/**
 * The sample, coloured the way every other block on the page is.
 *
 * A STABLE KEY with `shown` watched, rather than the code in the key: the
 * sample is rewritten on every keystroke, and keying on it would leave one
 * cache entry per character typed. This way the server highlights what it
 * renders and the client replaces it as the request changes.
 */
const { data: sampleHtml } = await useAsyncData(
  `duxt-openapi-sample-${id}`,
  () => {
    const lang = duxtCodeLang(shown.value.language);

    return lang
      ? highlightCode(shown.value.code, lang)
      : // `null`, not `undefined`: Nuxt reads a handler that resolves to
        // nothing as one that failed to return, warns, and repeats the request
        // on the client. Here nothing to highlight is a real answer.
        Promise.resolve(null);
  },
  { watch: [shown] }
);

const copiedSample = ref(false);

async function copySample() {
  try {
    await navigator.clipboard.writeText(shown.value.code);
    copiedSample.value = true;
    // WHICH sample, never the sample. The code is the reader's own request
    // written out — server, parameters, token and all — so only the two pieces
    // of declared configuration travel.
    analytics.track({
      name: 'copy',
      kind: 'request-sample',
      sample: shown.value.id,
      language: shown.value.language
    });
    notify.success(t('duxt.code.copiedToast'));
    setTimeout(() => (copiedSample.value = false), 2000);
  } catch {
    notify.error(t('duxt.page.copyFailed'));
  }
}

/* ------------------------------------------------------------------- send */

interface Result {
  status: number;
  statusText: string;
  duration: number;
  headers: [string, string][];
  body: string;
}

/** How long the send button shows its spinner, however fast the answer is. */
const MINIMUM_WAIT = 300;

const sending = ref(false);
const result = ref<Result>();
const failure = ref<string>();

/**
 * The request that just settled, described entirely by the DOCUMENT.
 *
 * Everything here is declared in the OpenAPI file — the operation's id, its
 * method, its path template — and nothing is the request that was actually
 * made. Not the server the reader picked, not the URL it produced, not a
 * header, not the token in it, not the body, not the response. That is the same
 * promise the docblock at the top of this file makes about where credentials
 * go, kept from the other side: a component that holds a token in its own state
 * and then posts it to a site's analytics has not kept it anywhere.
 *
 * The duration is the request's own, taken before the spinner's floor is
 * applied — `MINIMUM_WAIT` is a thing about the button, not about the API.
 */
function report(
  outcome: 'response' | 'failed',
  duration: number,
  statusClass?: DuxtAnalyticsStatusClass
) {
  analytics.track({
    name: 'api-request',
    operation: props.operation.operationId,
    method: props.operation.method,
    path: props.operation.path,
    outcome,
    statusClass,
    duration
  });
}

async function send() {
  sending.value = true;
  // THE PREVIOUS ANSWER STAYS UNTIL THIS ONE ARRIVES. Clearing it here emptied
  // the panel the moment the button was pressed, so the page collapsed by the
  // height of a response and grew back a moment later — under the cursor that
  // had just clicked. It is dimmed and marked busy instead, and replaced when
  // there is something to replace it with.

  const started = performance.now();

  try {
    const response = await fetch(request.value.url, {
      method: request.value.method,
      headers: request.value.headers,
      body: request.value.body
    });

    const text = await response.text();
    const duration = Math.round(performance.now() - started);

    failure.value = undefined;
    result.value = {
      status: response.status,
      statusText: response.statusText,
      duration,
      headers: [...response.headers.entries()],
      body: pretty(text)
    };

    report('response', duration, duxtStatusClass(response.status));
  } catch (error) {
    // `fetch` rejects with a bare TypeError for a CORS refusal, a DNS failure
    // and an offline browser alike — the browser deliberately tells the page
    // nothing more — so the message says what the possibilities are rather than
    // pretending to know which one happened.
    result.value = undefined;
    failure.value =
      error instanceof Error && error.name !== 'TypeError'
        ? error.message
        : t('duxt.openapi.client.blocked');

    // No status and no class: nothing came back to have one. The message is not
    // reported either — for a CORS refusal it is this component's own guess.
    report('failed', Math.round(performance.now() - started));
  } finally {
    // A FLOOR UNDER THE WAIT. The demo endpoint answers in a few milliseconds,
    // so the spinner appeared and vanished inside one frame — which reads as
    // the button having flickered rather than as a request having been made.
    // Held long enough to be seen, and the button stays disabled for it, so the
    // same request cannot be fired twice while the first is in flight.
    const elapsed = performance.now() - started;
    if (elapsed < MINIMUM_WAIT) {
      await new Promise((resolve) =>
        setTimeout(resolve, MINIMUM_WAIT - elapsed)
      );
    }

    sending.value = false;
  }
}

/**
 * The sample card follows its content's height instead of switching to it — the
 * same behaviour `CodeGroup` has, out of the same composable. Not in `panel`
 * layout: there the card sits in a column that scrolls as a whole and should
 * size to its content at once.
 */
const sampleShell = useTemplateRef<HTMLElement>('sampleShell');
const sampleBody = useTemplateRef<HTMLElement>('sampleBody');

useDuxtAnimatedHeight(sampleShell, sampleBody, () => split.value);

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
  <!-- ONE CARD, OR TWO SECTIONS. `panel` is the shape an operation page wants:
       a single box in a 23rem column beside the endpoint.

       `split` is for a band on the landing page, which has the whole width and
       no column to be narrow in. The form and the samples become two rows, each
       with its own prose beside it and the sides alternating the way the bands
       around them do — so what was one very tall column reads as two ordinary
       sections.

       THE SPLIT IS INSIDE THIS COMPONENT rather than two components on the
       page, and that is the whole reason it is built this way: the samples are
       written from the server, the token, the parameters and the body as they
       stand RIGHT NOW. Two components would be two states, and the second
       section would show a request that is nearly, but not exactly, the one the
       button sends. The prose arrives through slots, so staying one component
       costs the page nothing in what it can say. -->
  <!-- THE ROWS SIT AS FAR APART AS TWO BANDS DO. A band is `py-12 sm:py-16`,
       so two of them stand 24 / 32 apart — half of that between these two read
       as one band with a gap in it rather than as the two sections they are. -->
  <div :class="split ? 'space-y-24 sm:space-y-32' : 'rounded-lg border'">
    <div
      :class="
        split ? 'grid items-center gap-8 lg:grid-cols-2 lg:gap-16' : 'contents'
      "
    >
      <div v-if="split" :class="reverse ? 'lg:order-2' : 'lg:order-1'">
        <slot name="beside-form" />
      </div>

      <!-- `self-start`, for the reason the samples box below gives: a card
           centred in its row grows in both directions when an answer arrives,
           and the form the reader is looking at moves up under their cursor. -->
      <div
        :class="
          split
            ? [
                'self-start rounded-lg border',
                reverse ? 'lg:order-1' : 'lg:order-2'
              ]
            : 'contents'
        "
      >
        <div class="border-b px-4 py-3">
          <h2 class="text-sm font-semibold">
            {{ $t('duxt.openapi.client.title') }}
          </h2>
        </div>

        <!-- NOT A LOGIN, and password managers have to be told so. A `<form>`
             holding a `type="password"` field is exactly the shape Bitwarden,
             1Password, LastPass and Dashlane look for, so they offered to fill
             the token box with a site password and to save whatever was typed
             there as a new credential.

             Each vendor reads its own attribute — there is no standard one, and
             `autocomplete="off"` alone has not been respected for years. They
             are set on the form AND on each credential box, because the ones
             that scan for a form and the ones that scan for a field are
             different products. -->
        <form
          class="space-y-4 px-4 py-3"
          autocomplete="off"
          data-form-type="other"
          data-bwignore
          data-1p-ignore
          data-lpignore="true"
          @submit.prevent="send"
        >
          <!-- server -->
          <div v-if="servers.length">
            <label
              :for="`${id}-server`"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ $t('duxt.openapi.client.server') }}
            </label>

            <UiSelect v-model="serverValue">
              <!-- The chosen value written out, not left to `SelectValue`. That
               one reads the text off the item the reader picked, and the items
               exist only once reka has mounted them — so the server rendered an
               empty box and the URL appeared a beat after hydration. This is
               the same string, and it is in the first byte. -->
              <UiSelectTrigger
                :id="`${id}-server`"
                class="w-full font-mono text-sm"
              >
                <span class="truncate">{{ server?.url }}</span>
              </UiSelectTrigger>

              <UiSelectContent>
                <UiSelectItem
                  v-for="(entry, index) in servers"
                  :key="entry.url"
                  :value="String(index)"
                  class="font-mono text-sm"
                >
                  {{ entry.url }}
                </UiSelectItem>
              </UiSelectContent>
            </UiSelect>

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
              <UiInput
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

              <p
                v-else-if="isCookieKey(scheme)"
                class="text-sm text-muted-foreground"
              >
                {{ $t('duxt.openapi.client.cookie') }}
              </p>

              <template v-else>
                <label
                  v-if="isBasic(scheme)"
                  :for="`${id}-user-${scheme.key}`"
                  class="mb-1 block font-mono text-xs text-muted-foreground"
                >
                  {{ $t('duxt.openapi.client.username') }}
                </label>
                <UiInput
                  v-if="isBasic(scheme)"
                  :id="`${id}-user-${scheme.key}`"
                  v-model="usernames[scheme.key]"
                  class="mb-2 text-sm"
                  autocomplete="off"
                  data-form-type="other"
                  data-bwignore
                  data-1p-ignore
                  data-lpignore="true"
                />

                <label
                  :for="`${id}-auth-${scheme.key}`"
                  class="mb-1 block font-mono text-xs text-muted-foreground"
                >
                  {{ scheme.key }}
                </label>
                <UiInput
                  :id="`${id}-auth-${scheme.key}`"
                  v-model="credentials[scheme.key]"
                  type="password"
                  class="text-sm"
                  autocomplete="off"
                  spellcheck="false"
                  data-form-type="other"
                  data-bwignore
                  data-1p-ignore
                  data-lpignore="true"
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
              <template v-if="parameter.in === 'cookie'">
                <p class="mb-1 font-mono text-xs text-muted-foreground">
                  {{ parameter.name }}
                </p>
                <p class="text-sm text-muted-foreground">
                  {{ $t('duxt.openapi.client.cookie') }}
                </p>
              </template>

              <template v-else>
                <label
                  :for="`${id}-p-${openApiParameterKey(parameter)}`"
                  class="mb-1 block font-mono text-xs text-muted-foreground"
                >
                  {{ parameter.name }}
                  <span v-if="parameter.required" class="text-destructive"
                    >*</span
                  >
                </label>
                <!-- The box the DOCUMENT asks for: a list where it names the
                 whole set of values, a number with the range it gave, a text
                 box only where it said nothing. See `openApiField`. -->
                <UiSelect
                  v-if="openApiField(parameter.schema).control === 'select'"
                  v-model="values[openApiParameterKey(parameter)]"
                >
                  <UiSelectTrigger
                    :id="`${id}-p-${openApiParameterKey(parameter)}`"
                    class="w-full font-mono text-sm"
                  >
                    <span class="truncate">
                      {{ values[openApiParameterKey(parameter)] }}
                    </span>
                  </UiSelectTrigger>

                  <UiSelectContent>
                    <UiSelectItem
                      v-for="option in openApiField(parameter.schema).options"
                      :key="option"
                      :value="option"
                      class="font-mono text-sm"
                    >
                      {{ option }}
                    </UiSelectItem>
                  </UiSelectContent>
                </UiSelect>

                <UiInput
                  v-else
                  :id="`${id}-p-${openApiParameterKey(parameter)}`"
                  v-model="values[openApiParameterKey(parameter)]"
                  v-bind="openApiField(parameter.schema).attrs"
                  class="font-mono text-sm"
                  autocomplete="off"
                />
              </template>
            </div>
          </fieldset>

          <!-- body -->
          <div v-if="bodies.length">
            <div class="mb-1 flex items-center gap-2">
              <label
                :for="`${id}-body`"
                class="block text-xs font-medium text-muted-foreground"
              >
                {{ $t('duxt.openapi.requestBody') }}
              </label>

              <!-- Beside the label, not beside the toggle. It belongs to the JSON
               view, so it comes and goes with it — and on the LEFT that costs
               nothing: the toggle is pinned to the right edge by `ml-auto`, so
               the control the reader just clicked cannot move out from under
               the pointer, which is what happened when the two shared the right
               end of this row. -->
              <UiButton
                v-if="mode === 'json'"
                type="button"
                variant="ghost"
                size="sm"
                class="h-6 px-2 text-xs"
                @click="formatBody"
              >
                {{ $t('duxt.openapi.client.format') }}
              </UiButton>

              <!-- The toggle only where there is something to toggle TO: a body
               the schema cannot describe as a form has one view, and a strip
               offering a tab that falls straight back is a control that lies
               about what it does. -->
              <div
                v-if="formable"
                class="ml-auto flex items-center gap-0.5 rounded-md border p-0.5"
              >
                <button
                  v-for="view in ['form', 'json'] as const"
                  :key="view"
                  type="button"
                  :aria-pressed="mode === view"
                  class="cursor-pointer rounded px-2 py-0.5 text-xs font-medium transition-colors"
                  :class="
                    mode === view
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  "
                  @click="bodyMode = view"
                >
                  {{ $t(`duxt.openapi.client.${view}`) }}
                </button>
              </div>
            </div>

            <UiSelect v-if="bodies.length > 1" v-model="bodyValue">
              <UiSelectTrigger
                :aria-label="$t('duxt.openapi.client.mediaType')"
                class="mb-2 w-full font-mono text-sm"
              >
                <span class="truncate">{{ media?.type }}</span>
              </UiSelectTrigger>

              <UiSelectContent>
                <UiSelectItem
                  v-for="(entry, index) in bodies"
                  :key="entry.type"
                  :value="String(index)"
                  class="font-mono text-sm"
                >
                  {{ entry.type }}
                </UiSelectItem>
              </UiSelectContent>
            </UiSelect>

            <!-- One box per property, exactly as the parameters above are drawn —
             same helper, same rules, so an `integer` is a number box here for
             the same reason it is one there. -->
            <div v-if="mode === 'form'" class="space-y-2">
              <div v-for="entry in bodyFields" :key="entry.name">
                <label
                  :for="`${id}-b-${entry.name}`"
                  class="mb-1 block font-mono text-xs text-muted-foreground"
                >
                  {{ entry.name }}
                  <span v-if="entry.required" class="text-destructive">*</span>
                </label>

                <UiSelect
                  v-if="entry.field.control === 'select'"
                  :model-value="bodyValues[entry.name]"
                  @update:model-value="
                    (value) => setBodyValue(entry.name, String(value ?? ''))
                  "
                >
                  <UiSelectTrigger
                    :id="`${id}-b-${entry.name}`"
                    class="w-full font-mono text-sm"
                  >
                    <span class="truncate">{{ bodyValues[entry.name] }}</span>
                  </UiSelectTrigger>

                  <UiSelectContent>
                    <UiSelectItem
                      v-for="option in entry.field.options"
                      :key="option"
                      :value="option"
                      class="font-mono text-sm"
                    >
                      {{ option }}
                    </UiSelectItem>
                  </UiSelectContent>
                </UiSelect>

                <UiInput
                  v-else
                  :id="`${id}-b-${entry.name}`"
                  :model-value="bodyValues[entry.name]"
                  v-bind="entry.field.attrs"
                  class="font-mono text-sm"
                  autocomplete="off"
                  @update:model-value="
                    (value) => setBodyValue(entry.name, String(value ?? ''))
                  "
                />
              </div>
            </div>

            <template v-else>
              <DuxtJsonEditor
                :id="`${id}-body`"
                v-model="body"
                :keys="bodyKeys"
                :aria-label="$t('duxt.openapi.requestBody')"
              />

              <!-- Said while it is still fixable, rather than after a 400. The
               request is not blocked: a document is sometimes wrong about what
               its own endpoint accepts, and this client exists to find out. -->
              <p v-if="bodyError" class="mt-1 text-xs text-destructive">
                {{ $t('duxt.openapi.client.invalidJson') }}
              </p>
              <p
                v-else-if="!formable"
                class="mt-1 text-xs text-muted-foreground"
              >
                {{ $t('duxt.openapi.client.noForm') }}
              </p>
            </template>
          </div>

          <UiButton type="submit" :disabled="sending" class="w-full">
            <Icon
              :name="sending ? 'lucide:loader-circle' : 'lucide:send'"
              class="size-4"
              :class="{ 'animate-spin': sending }"
            />
            {{ $t('duxt.openapi.client.send') }}
          </UiButton>

          <p class="text-xs text-muted-foreground">
            {{ $t('duxt.openapi.client.direct') }}
          </p>
        </form>

        <!-- WHAT CAME BACK. Always in the DOM, collapsed to nothing until
             there is something to show.

             NOT a `<Transition>` around a `v-if`, which is what this was. That
             makes a node appear and disappear, and server and client then
             disagree about what stands in its place — a fragment against a
             comment, which is the hydration mismatch it produced. Nothing is
             added or removed here: the row goes from `0fr` to `1fr` and the
             border comes with it.

             `grid-rows` is still the way to animate to a height nobody can know
             in advance; the inner `overflow-hidden` is what lets the row be
             shorter than its content on the way. -->
        <div
          class="grid motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out"
          :class="
            failure || result
              ? 'grid-rows-[1fr] border-t opacity-100'
              : 'grid-rows-[0fr] opacity-0'
          "
          :aria-busy="sending || undefined"
        >
          <div class="overflow-hidden">
            <div class="px-4 py-3">
              <p v-if="failure" class="text-sm text-destructive">
                {{ failure }}
              </p>

              <template v-else-if="result">
                <div class="flex flex-wrap items-center gap-2 text-sm">
                  <span class="font-mono font-semibold">
                    {{ result.status }}
                  </span>
                  <span class="text-muted-foreground">
                    {{ result.statusText }}
                  </span>
                  <span class="ml-auto font-mono text-xs text-muted-foreground">
                    {{ result.duration }}&nbsp;ms
                  </span>
                </div>

                <DuxtCodeBlock
                  v-if="result.body"
                  :code="result.body"
                  language="json"
                />

                <details v-if="result.headers.length" class="mt-2">
                  <summary class="cursor-pointer text-xs text-muted-foreground">
                    {{ $t('duxt.openapi.headers') }}
                  </summary>
                  <dl
                    class="mt-2 space-y-1 font-mono text-xs text-muted-foreground"
                  >
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
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- the same request, as something to paste elsewhere -->
    <!-- ONE CARD, tabs and code together, exactly as `::preview` and the
         package-manager block are built: the strip used to float above a card
         of its own, so the page carried two boxes for one thing and the copy
         button sat inside the lower one, away from the choice it belongs to. -->
    <!-- NO RESERVED HEIGHT, and both halves centred.

         Reserving room for the longest sample left half the row empty whenever
         a reader picked `curl`, which is the sample most of them pick. The row
         sizes to its card again — and the card's height is ANIMATED rather than
         switched, so the sections below slide rather than jump. See
         `measureSample` for why that needs JavaScript. -->
    <div
      :class="
        split ? 'grid items-center gap-8 lg:grid-cols-2 lg:gap-16' : 'contents'
      "
    >
      <div v-if="split" :class="reverse ? 'lg:order-1' : 'lg:order-2'">
        <slot name="beside-samples" />
      </div>

      <!-- A HEADING OVER THE CARD, not a card around the card. The samples are
           already a bordered box with its own tab strip; wrapping that in a
           second bordered box to carry a title drew a box inside a box for one
           thing. The title stands above it instead, the way a label does.

           `self-start`, so the box grows DOWNWARDS. Centred in its row it grew
           in both directions at once, and its tab strip — the control the
           reader just clicked — moved up under their cursor. -->
      <div
        :class="
          split
            ? ['min-w-0 self-start', reverse ? 'lg:order-2' : 'lg:order-1']
            : 'border-t px-4 py-3'
        "
      >
        <h2 v-if="split" class="mb-2 text-sm font-semibold">
          {{ $t('duxt.openapi.client.samples') }}
        </h2>

        <!-- THE BOX FOLLOWS ITS CONTENT, but takes 300ms to get there.

             A `curl` of four lines and a Go client of twenty are two heights,
             and switching between them moved everything below the row in a
             single frame. Animated, the page slides instead.

             `overflow-hidden` is what lets the shell be shorter than what is
             inside it while its height is still on the way. -->
        <div
          ref="sampleShell"
          :class="
            split
              ? 'overflow-hidden motion-safe:transition-[height] motion-safe:duration-300 motion-safe:ease-out'
              : ''
          "
        >
          <div ref="sampleBody">
            <TabsRoot
              v-model="group"
              class="overflow-hidden rounded-lg border bg-card"
            >
              <!-- The copy button is a SIBLING of the strip, not a child of it: a
             `tablist` may hold tabs and nothing else, and axe reports the
             button inside one as `aria-required-children`. The header row is
             the flex container instead, so it still sits where every other
             card on the site puts it. -->
              <div
                class="flex min-h-11 items-center gap-1 border-b bg-muted/40 px-2 py-1.5"
              >
                <TabsList
                  class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
                  :aria-label="$t('duxt.openapi.client.samples') as string"
                >
                  <TabsTrigger
                    v-for="entry in groups"
                    :key="entry"
                    :value="entry"
                    class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    <Icon :name="groupIcon(entry)" class="size-3.5" />
                    {{ entry }}
                  </TabsTrigger>
                </TabsList>

                <UiButton
                  variant="ghost"
                  size="icon"
                  class="ml-auto size-7 hover:bg-accent hover:text-foreground"
                  :aria-label="
                    copiedSample ? $t('duxt.code.copied') : $t('duxt.code.copy')
                  "
                  @click="copySample"
                >
                  <Icon
                    :name="copiedSample ? 'lucide:check' : 'lucide:copy'"
                    class="size-3.5"
                  />
                </UiButton>
              </div>

              <!-- THE CLIENTS OF THE ACTIVE LANGUAGE, in a row of their own.
             Beside the tabs they were a control the reader had to open to learn
             that PHP has three of them; on their own line the choice is the
             thing they see. Dropped entirely where the language has one client,
             because a picker with a single option cannot be used.

             `role="group"` with `aria-pressed`, NOT a radiogroup: a radiogroup
             promises arrow-key navigation between its options, and there is no
             `ui/radio-group` here to implement it. A group of pressed buttons
             promises only what it does — every one reachable by Tab, every one
             saying whether it is on. -->
              <div
                v-if="clients.length > 1 && clients.length < 6"
                role="group"
                :aria-label="$t('duxt.openapi.client.sampleClient') as string"
                class="flex items-center gap-1 overflow-x-auto border-b bg-muted/20 px-2 py-1.5"
              >
                <button
                  v-for="entry in clients"
                  :key="entry.id"
                  type="button"
                  :aria-pressed="entry.id === sample"
                  class="cursor-pointer whitespace-nowrap rounded-md px-2 py-0.5 font-mono text-xs transition-colors"
                  :class="
                    entry.id === sample
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  "
                  @click="sample = entry.id"
                >
                  {{ entry.label }}
                </button>
              </div>

              <!-- Six is where a row stops being a row. A language with that many
             clients is a site that configured them, and a select carries any
             number on any width — the trade the chips above cannot make. -->
              <div
                v-else-if="clients.length >= 6"
                class="flex items-center border-b bg-muted/20 px-2 py-1.5"
              >
                <UiSelect v-model="sample">
                  <UiSelectTrigger
                    class="h-7 w-auto gap-1.5 border-0 bg-transparent px-2 font-mono text-xs shadow-none hover:bg-accent"
                    :aria-label="
                      $t('duxt.openapi.client.sampleClient') as string
                    "
                  >
                    {{ shown.label }}
                  </UiSelectTrigger>

                  <UiSelectContent>
                    <UiSelectItem
                      v-for="entry in clients"
                      :key="entry.id"
                      :value="entry.id"
                      class="font-mono text-xs"
                    >
                      {{ entry.label }}
                    </UiSelectItem>
                  </UiSelectContent>
                </UiSelect>
              </div>

              <!-- Said plainly, because the difference is invisible otherwise: a
             reader who edits the body and switches to this tab would see a
             sample that does not contain the edit, and conclude the editor is
             broken rather than that this sample is fixed. -->
              <p
                v-if="shown.fromSpec"
                class="border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground"
              >
                {{ $t('duxt.openapi.client.fromSpec') }}
              </p>

              <!-- THE CARD KEEPS ITS OWN HEIGHT. The row around it reserves the
                 space — see the `min-h` on the grid below — so a `curl` of four
                 lines and a Go client of twenty both leave the section under
                 this one exactly where it was. What changes is the card, and it
                 grows and shrinks about its own middle because the row centres
                 it.

                 The floor stays for the panel layout, where there is no row to
                 reserve anything: on an operation page the card is in a column
                 that scrolls as a whole. -->
              <TabsContent :value="group">
                <!-- eslint-disable-next-line vue/no-v-html -- Shiki's own output over
               a string this component built; nothing a reader typed reaches it
               unescaped. -->
                <div
                  v-if="sampleHtml"
                  class="duxt-code-body duxt-code-body-sm"
                  :class="split ? '' : 'min-h-56'"
                  v-html="sampleHtml"
                />
                <pre
                  v-else
                  class="overflow-x-auto p-4 text-xs"
                  :class="split ? '' : 'min-h-56'"
                ><code>{{ shown.code }}</code></pre>
              </TabsContent>
            </TabsRoot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
