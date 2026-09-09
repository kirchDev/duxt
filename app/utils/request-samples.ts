/**
 * The request the reader has built, written out in the languages they work in.
 *
 * ONE SAMPLE IS A GENERATOR, not a string, because the request changes on every
 * keystroke: the reader edits a path parameter or a body and every open sample
 * has to follow. That is also why these run in the browser and why
 * `code-highlight.ts` needs a grammar per language they use.
 *
 * WHAT A SAMPLE SHOWS IS THE REQUEST, and nothing after it. The response is
 * already on screen, in the panel below the editor — a sample that fetched it a
 * second time would be showing the reader something they can see, at the cost of
 * `defer resp.Body.Close()` and an error branch in every language that has one.
 * The exception is Go, where `err` is not decoration: without the checks it is
 * not Go, and a snippet that does not compile is worse than a long one.
 *
 * THE REGISTRY IS OPEN. A consumer adds its own entry to `duxt.requestSamples`
 * — the API it documents may be consumed in a language nobody here thought of —
 * which is why `DuxtRequestSample` is declared in `app/types/duxt.d.ts` beside
 * the config key rather than exported from here, and why `language` is a plain
 * Shiki id: `modules/config.ts` reads the list at build time and loads exactly
 * the grammars it names.
 */

/** The body as data, where it is JSON. Undefined for anything else. */
function asJson(body?: string): unknown {
  if (!body?.trim()) return undefined;

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return undefined;
  }
}

const pad = (depth: number) => '  '.repeat(depth);

/**
 * Whether a list is short enough to stay on one line.
 *
 * `tags: ['good']` over three lines is the clearest tell that a snippet was
 * generated rather than written, and a body of scalars is mostly short lists. So
 * an array of primitives that fits stays inline; anything holding a structure
 * breaks, because that is what a person would do too.
 */
function inlineList(items: unknown[], rendered: string[]): string | undefined {
  const primitive = items.every(
    (item) => item === null || typeof item !== 'object'
  );
  if (!primitive) return undefined;

  const line = rendered.join(', ');
  return line.length <= 60 ? line : undefined;
}

/** A JavaScript key that needs no quotes. */
const bareKey = /^[A-Za-z_$][\w$]*$/;

/** A value as a JavaScript literal, indented for the depth it sits at. */
function js(value: unknown, depth = 1): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll("'", "\\'")}'`;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (!value.length) return '[]';

    const rendered = value.map((item) => js(item, depth + 1));
    const inline = inlineList(value, rendered);
    if (inline) return `[${inline}]`;

    const items = rendered
      .map((item) => `${pad(depth + 1)}${item}`)
      .join(',\n');

    return `[\n${items}\n${pad(depth)}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return '{}';

  const written = entries
    .map(([key, item]) => {
      const name = bareKey.test(key) ? key : `'${key}'`;
      return `${pad(depth + 1)}${name}: ${js(item, depth + 1)}`;
    })
    .join(',\n');

  return `{\n${written}\n${pad(depth)}}`;
}

/** A value as a Python literal. Python indents with four spaces. */
function py(value: unknown, depth = 1): string {
  const step = (n: number) => '    '.repeat(n);

  if (value === null) return 'None';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return `"${value.replaceAll('"', '\\"')}"`;

  if (Array.isArray(value)) {
    if (!value.length) return '[]';

    const rendered = value.map((item) => py(item, depth + 1));
    const inline = inlineList(value, rendered);
    if (inline) return `[${inline}]`;

    const items = rendered
      .map((item) => `${step(depth + 1)}${item}`)
      .join(',\n');

    return `[\n${items},\n${step(depth)}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return '{}';

  const written = entries
    .map(
      ([key, item]) =>
        `${step(depth + 1)}"${key.replaceAll('"', '\\"')}": ${py(item, depth + 1)}`
    )
    .join(',\n');

  return `{\n${written},\n${step(depth)}}`;
}

/** A value as a PHP literal. PHP arrays are the one shape for both kinds. */
function php(value: unknown, depth = 1): string {
  const step = (n: number) => '    '.repeat(n);

  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return `'${value.replaceAll("'", "\\'")}'`;

  if (Array.isArray(value)) {
    if (!value.length) return '[]';

    const rendered = value.map((item) => php(item, depth + 1));
    const inline = inlineList(value, rendered);
    if (inline) return `[${inline}]`;

    const items = rendered
      .map((item) => `${step(depth + 1)}${item}`)
      .join(',\n');

    return `[\n${items},\n${step(depth)}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return '[]';

  const written = entries
    .map(
      ([key, item]) =>
        `${step(depth + 1)}'${key.replaceAll("'", "\\'")}' => ${php(item, depth + 1)}`
    )
    .join(',\n');

  return `[\n${written},\n${step(depth)}]`;
}

/** One argument, safe inside a POSIX shell's single quotes. */
function shell(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

const hasHeaders = (request: DuxtOpenApiRequest) =>
  Object.keys(request.headers).length > 0;

/**
 * The request as a `curl` line.
 *
 * Single-quoted with the shell's own escape for an embedded quote, because every
 * part of this — a URL, a header, a JSON body — comes from a document this layer
 * did not write.
 *
 * `-X` ONLY WHERE CURL WOULD NOT GUESS. A bare `curl` is already a GET, and `-d`
 * already makes it a POST, so writing the method out in those two cases is the
 * mark of a generated command rather than one somebody would type.
 */
export function openApiCurl(request: DuxtOpenApiRequest): string {
  const implied =
    request.method === 'GET' || (request.method === 'POST' && !!request.body);

  const lines = [
    implied
      ? `curl ${shell(request.url)}`
      : `curl -X ${request.method} ${shell(request.url)}`
  ];

  for (const [name, value] of Object.entries(request.headers)) {
    lines.push(`  -H ${shell(`${name}: ${value}`)}`);
  }

  if (request.body) lines.push(`  -d ${shell(request.body)}`);

  return lines.join(' \\\n');
}

/**
 * Options shared by the three JavaScript clients that take a `RequestInit`-ish
 * object — `method` omitted for GET, which every one of them defaults to.
 */
function jsOptions(
  request: DuxtOpenApiRequest,
  body: 'stringify' | 'object'
): string[] {
  const options: string[] = [];

  if (request.method !== 'GET') {
    options.push(`  method: '${request.method}'`);
  }

  if (hasHeaders(request)) {
    options.push(`  headers: ${js(request.headers)}`);
  }

  if (request.body) {
    const data = asJson(request.body);

    if (data === undefined) {
      options.push(`  body: ${js(request.body)}`);
    } else if (body === 'object') {
      options.push(`  body: ${js(data)}`);
    } else {
      options.push(`  body: JSON.stringify(${js(data)})`);
    }
  }

  return options;
}

function jsCall(
  call: string,
  request: DuxtOpenApiRequest,
  body: 'stringify' | 'object'
): string {
  const options = jsOptions(request, body);
  if (!options.length) return `${call}('${request.url}');`;

  return `${call}('${request.url}', {\n${options.join(',\n')}\n});`;
}

/** The request as a `fetch` call. A JSON body is written as the data it is. */
export function openApiFetch(request: DuxtOpenApiRequest): string {
  return `await ${jsCall('fetch', request, 'stringify')}`;
}

/** ofetch, which serialises an object body and sets the header itself. */
export function openApiOfetch(request: DuxtOpenApiRequest): string {
  return `await ${jsCall('$fetch', request, 'object')}`;
}

/**
 * `useFetch`, which is a component's data dependency rather than a call.
 *
 * Shown beside `$fetch` rather than instead of it: the two are not spellings of
 * one thing. `$fetch` is what a reader pastes into an event handler; `useFetch`
 * is what they paste into a component that needs the data to render, and it
 * carries the destructuring that makes that the point.
 */
export function openApiUseFetch(request: DuxtOpenApiRequest): string {
  return `const { data } = await ${jsCall('useFetch', request, 'object')}`;
}

/** axios through its uniform form, so the shape does not change per method. */
export function openApiAxios(request: DuxtOpenApiRequest): string {
  const options = [
    `  method: '${request.method.toLowerCase()}'`,
    `  url: '${request.url}'`
  ];

  if (hasHeaders(request)) options.push(`  headers: ${js(request.headers)}`);

  if (request.body) {
    const data = asJson(request.body);
    options.push(`  data: ${data === undefined ? js(request.body) : js(data)}`);
  }

  return `await axios({\n${options.join(',\n')}\n});`;
}

/** The verb as `requests` and `httpx` spell it, or their generic form. */
const pyVerbs = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']);

function pyCall(module: string, request: DuxtOpenApiRequest): string {
  const known = pyVerbs.has(request.method);
  const call = known
    ? `${module}.${request.method.toLowerCase()}(`
    : `${module}.request(`;

  const args = known
    ? [`    "${request.url}"`]
    : [`    "${request.method}"`, `    "${request.url}"`];

  if (hasHeaders(request)) args.push(`    headers=${py(request.headers)}`);

  if (request.body) {
    const data = asJson(request.body);
    args.push(
      data === undefined
        ? `    data=${py(request.body)}`
        : `    json=${py(data)}`
    );
  }

  return `import ${module}\n\n${call}\n${args.join(',\n')},\n)`;
}

/** requests, which is what a Python reader reaches for first. */
export function openApiRequests(request: DuxtOpenApiRequest): string {
  return pyCall('requests', request);
}

/** httpx, for a reader who wants the same shape with async available. */
export function openApiHttpx(request: DuxtOpenApiRequest): string {
  return pyCall('httpx', request);
}

/** The standard library, for a snippet that must not add a dependency. */
export function openApiUrllib(request: DuxtOpenApiRequest): string {
  const imports = request.body
    ? 'import json\nimport urllib.request'
    : 'import urllib.request';

  const args = [`    "${request.url}"`, `    method="${request.method}"`];

  if (hasHeaders(request)) args.push(`    headers=${py(request.headers)}`);

  if (request.body) {
    const data = asJson(request.body);
    args.push(
      data === undefined
        ? `    data=${py(request.body)}.encode()`
        : `    data=json.dumps(${py(data)}).encode()`
    );
  }

  return [
    imports,
    '',
    'request = urllib.request.Request(',
    args.join(',\n') + ',',
    ')',
    '',
    'urllib.request.urlopen(request)'
  ].join('\n');
}

/**
 * Go's standard library.
 *
 * The one sample that keeps its error branches. `err` is not ceremony in Go —
 * `http.NewRequest` and `Do` both return one, and a snippet that ignores them
 * does not compile, which is a worse thing to hand a reader than four extra
 * lines.
 */
export function openApiGo(request: DuxtOpenApiRequest): string {
  const lines: string[] = [];

  if (request.body) {
    lines.push(
      `body := strings.NewReader(\`${request.body.replaceAll('`', '` + "`" + `')}\`)`,
      ''
    );
  }

  lines.push(
    `req, err := http.NewRequest("${request.method}", "${request.url}", ${request.body ? 'body' : 'nil'})`,
    'if err != nil {',
    '\treturn err',
    '}'
  );

  if (hasHeaders(request)) {
    lines.push('');
    for (const [name, value] of Object.entries(request.headers)) {
      lines.push(`req.Header.Set("${name}", "${value}")`);
    }
  }

  lines.push('', 'resp, err := http.DefaultClient.Do(req)');

  return lines.join('\n');
}

/** Guzzle, the client a PHP project almost always already has. */
export function openApiGuzzle(request: DuxtOpenApiRequest): string {
  const options: string[] = [];

  if (hasHeaders(request)) {
    options.push(`    'headers' => ${php(request.headers, 1)}`);
  }

  if (request.body) {
    const data = asJson(request.body);
    options.push(
      data === undefined
        ? `    'body' => ${php(request.body)}`
        : `    'json' => ${php(data, 1)}`
    );
  }

  const client = '$client = new \\GuzzleHttp\\Client();';
  const call = options.length
    ? `$client->request('${request.method}', '${request.url}', [\n${options.join(',\n')},\n]);`
    : `$client->request('${request.method}', '${request.url}');`;

  return `${client}\n\n${call}`;
}

/** Laravel's `Http` facade, which is Guzzle with the ceremony removed. */
export function openApiLaravelHttp(request: DuxtOpenApiRequest): string {
  const verb = request.method.toLowerCase();
  const data = request.body ? asJson(request.body) : undefined;

  const head = hasHeaders(request)
    ? `Http::withHeaders(${php(request.headers, 0)})\n    ->`
    : 'Http::';

  const payload = request.body
    ? `, ${data === undefined ? php(request.body) : php(data, 1)}`
    : '';

  return `${head}${verb}('${request.url}'${payload});`;
}

/** The curl extension, for a project with no HTTP client at all. */
export function openApiPhpCurl(request: DuxtOpenApiRequest): string {
  const options = [`    CURLOPT_CUSTOMREQUEST => '${request.method}'`];

  if (hasHeaders(request)) {
    const headers = Object.entries(request.headers).map(
      ([name, value]) => `${name}: ${value}`
    );
    options.push(`    CURLOPT_HTTPHEADER => ${php(headers, 1)}`);
  }

  if (request.body) {
    options.push(`    CURLOPT_POSTFIELDS => ${php(request.body)}`);
  }

  options.push('    CURLOPT_RETURNTRANSFER => true');

  return [
    `$ch = curl_init('${request.url}');`,
    '',
    'curl_setopt_array($ch, [',
    options.join(',\n') + ',',
    ']);',
    '',
    'curl_exec($ch);'
  ].join('\n');
}

/**
 * Every sample the layer ships, in the order they are offered when a site takes
 * the default.
 *
 * `group` is the first level of the picker and `label` the second, so a language
 * with three clients costs one control rather than three tabs — which is what
 * makes an open registry survivable at all.
 *
 * The names are proper nouns and stay untranslated, which is why nothing here is
 * an i18n key.
 */
export const duxtRequestSamples: DuxtRequestSample[] = [
  {
    id: 'curl',
    icon: 'simple-icons:curl',
    group: 'curl',
    label: 'curl',
    language: 'bash',
    generate: openApiCurl
  },
  {
    id: 'fetch',
    icon: 'vscode-icons:file-type-js',
    group: 'JavaScript',
    label: 'fetch',
    language: 'typescript',
    generate: openApiFetch
  },
  {
    id: 'ofetch',
    icon: 'vscode-icons:file-type-js',
    group: 'JavaScript',
    label: '$fetch',
    language: 'typescript',
    generate: openApiOfetch
  },
  {
    id: 'use-fetch',
    icon: 'vscode-icons:file-type-js',
    group: 'JavaScript',
    label: 'useFetch',
    language: 'typescript',
    generate: openApiUseFetch
  },
  {
    id: 'axios',
    icon: 'vscode-icons:file-type-js',
    group: 'JavaScript',
    label: 'axios',
    language: 'typescript',
    generate: openApiAxios
  },
  {
    id: 'python-requests',
    icon: 'vscode-icons:file-type-python',
    group: 'Python',
    label: 'requests',
    language: 'python',
    generate: openApiRequests
  },
  {
    id: 'python-httpx',
    icon: 'vscode-icons:file-type-python',
    group: 'Python',
    label: 'httpx',
    language: 'python',
    generate: openApiHttpx
  },
  {
    id: 'python-urllib',
    icon: 'vscode-icons:file-type-python',
    group: 'Python',
    label: 'urllib',
    language: 'python',
    generate: openApiUrllib
  },
  {
    id: 'go',
    icon: 'vscode-icons:file-type-go',
    group: 'Go',
    label: 'net/http',
    language: 'go',
    generate: openApiGo
  },
  {
    id: 'php-guzzle',
    icon: 'vscode-icons:file-type-php',
    group: 'PHP',
    label: 'Guzzle',
    language: 'php',
    generate: openApiGuzzle
  },
  {
    id: 'php-laravel',
    icon: 'vscode-icons:file-type-php',
    group: 'PHP',
    label: 'Laravel Http',
    language: 'php',
    generate: openApiLaravelHttp
  },
  {
    id: 'php-curl',
    icon: 'vscode-icons:file-type-php',
    group: 'PHP',
    label: 'curl extension',
    language: 'php',
    generate: openApiPhpCurl
  }
];

/**
 * What a site shows without saying otherwise.
 *
 * Seven of the twelve. `useFetch`, `axios`, `httpx`, `urllib` and PHP's curl
 * extension are shipped but off: they are the second client for a language that
 * already has one on screen, and a picker is for choosing, not for listing
 * everything that exists.
 */
export const duxtDefaultRequestSamples = [
  'curl',
  'fetch',
  'ofetch',
  'python-requests',
  'go',
  'php-guzzle',
  'php-laravel'
];

/**
 * The samples a site offers, resolved from what it configured.
 *
 * ONE KEY DOES BOTH JOBS, because they are the same sentence. A string picks a
 * shipped sample by id; an object adds one of the site's own, or replaces a
 * shipped one by reusing its id. So a PHP API writes
 * `['curl', 'php-guzzle', 'php-laravel']` and a site with a Ruby client writes
 * its generator inline, in the one list that also fixes the order.
 *
 * Unset means the default seven. Arrays REPLACE rather than concatenate here,
 * the same rule the rest of `duxtDefaults` follows: a configured list is the
 * list, or a consumer could never drop `curl`.
 */
export function resolveRequestSamples(
  configured?: (string | DuxtRequestSample)[]
): DuxtRequestSample[] {
  const shipped = new Map(
    duxtRequestSamples.map((sample) => [sample.id, sample])
  );

  const wanted = configured ?? duxtDefaultRequestSamples;

  return wanted
    .map((entry) => (typeof entry === 'string' ? shipped.get(entry) : entry))
    .filter((sample): sample is DuxtRequestSample => sample !== undefined);
}
