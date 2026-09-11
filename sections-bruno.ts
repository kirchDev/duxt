/**
 * The `bruno` type: a Bruno collection, published as reference pages.
 *
 * The third type in the registry and the second API one, and the question it
 * was filed to answer is whether a second API type is a second RENDERING PATH.
 * It is not: a Bruno request page renders in the same `reference` chrome an
 * OpenAPI operation does, and the try-it column is the same component fed a
 * different parser's output. What this file adds is a parser, two policies and
 * an adapter — which is the registry doing the job it was built for.
 *
 * WHAT A BRUNO COLLECTION IS NOT is why the pages are shaped the way they are.
 * It is a client artefact: requests, folders, headers, bodies, scripts and
 * environments, with no response schemas, no reusable components and no
 * statement of what a field means. So these pages say what the collection
 * actually says — method, URL, headers, parameters, body — and invent nothing.
 * The issue that decided this type rejected converting Bruno to OpenAPI for
 * exactly that reason: the conversion invents schemas it does not have, which
 * makes the thinness invisible rather than honest.
 *
 * ONE PAGE PER REQUEST, a page per folder, and the collection's own overview —
 * the same shape `openapi` uses, for the same reason: everything the layer can
 * do hangs off pages, and a deep link to a request has to survive being pasted
 * into a ticket.
 *
 * THE ARCHIVE IS THE POINT OF THE OVERVIEW. A reference tells you what the
 * requests are; a collection is a thing you OPEN. The download is built from
 * the exact version and locale the reader is looking at — see `bruno-zip.ts` —
 * which is what neither a link to the repository's default branch nor a "Fetch
 * in Bruno" clone of today's HEAD can offer.
 */
import { stringify as stringifyYaml } from 'yaml';
import type {
  DuxtBrunoCollection,
  DuxtBrunoEntry,
  DuxtBrunoFolder,
  DuxtBrunoRequest
} from './bruno-model';
import { parseBrunoCollection } from './bruno-parse';
import { brunoZipPath } from './bruno-zip';
import type {
  DuxtSectionContext,
  DuxtSectionInput,
  DuxtSectionOptions,
  DuxtSectionPage,
  DuxtSectionType
} from './sections-resolve';

/**
 * The layout this type binds — the SAME one `openapi` binds.
 *
 * Deliberately not a name of its own. The two types produce the same kind of
 * page and want the same chrome: the full column width, the request list on the
 * left, no reading measure. A second layout would be a copy that drifts, and a
 * consumer who overrode `reference` to brand their API pages would find half of
 * them unbranded.
 */
export const DUXT_BRUNO_LAYOUT = 'reference';

/** Bruno's own deep link, which needs no third-party script on the page. */
const FETCH_IN_BRUNO = 'https://fetch.usebruno.com/?url=';

/** The variable a Bruno collection conventionally puts its host in. */
const DEFAULT_BASE_VARIABLE = 'baseUrl';

export const brunoSectionType: DuxtSectionType = {
  parse: parseBrunoSection,
  /**
   * A DIRECTORY, which is the contract change this type is the reason for.
   *
   * `bruno.json`, a tree of `.bru` files, `folder.bru` ordering and an
   * `environments/` directory — there is no one file to open, and a type that
   * had to be handed one would have to be handed the wrong thing.
   */
  input: 'directory',
  /**
   * PER VERSION, for the reason `openapi` is: an API belongs to the release it
   * describes, and a reader on `v1` must not be shown `v2`'s endpoints.
   */
  versioning: 'per-version',
  /**
   * PER LOCALE, also matching `openapi`. A `.bru` file's `docs` blocks are
   * written prose — the same prose an OpenAPI `description` is — so a
   * translated collection is a real artefact rather than the same files
   * relabelled. A locale that declares none builds nothing and falls through to
   * the original with the translation banner saying so.
   */
  localisation: 'per-locale',
  layout: DUXT_BRUNO_LAYOUT,
  /**
   * `lucide`, not `simple-icons`, and the repository's icon rule says why: this
   * entry names a SECTION OF THE DOCUMENTATION, not the Bruno platform. The one
   * place `simple-icons:bruno` belongs is the "Fetch in Bruno" action, which
   * hands the collection to Bruno itself.
   */
  icon: 'lucide:send'
};

/** What a site turned on, as this type reads it. */
interface BrunoOptions {
  tryIt?: {
    /** The public base URL requests are sent to. */
    baseUrl?: string;
    /** The Bruno variable that base URL stands in for. */
    baseVariable?: string;
    /** Variables with a public value, and nothing else, may be substituted. */
    variables?: Record<string, string>;
  };
  /** A public git URL, which turns on the "Fetch in Bruno" action. */
  fetch?: string;
}

function parseBrunoSection(
  input: DuxtSectionInput,
  context: DuxtSectionContext
): DuxtSectionPage[] {
  const collection = parseBrunoCollection(input);

  // Into the report rather than onto the console, for the reason every other
  // type does it: a collection is parsed while the config is loading, so a
  // printed warning has scrolled away before the dev server has started.
  for (const warning of collection.warnings) context.warn?.(warning);

  const options = readOptions(context.options);

  // ONE NAMESPACE FOR BOTH. A folder and a request at the same level are
  // siblings in the URL — `/api/shipments` and `/api/ping` — so the slugs have
  // to be unique across the two lists together, not within each.
  const level = slugsFor(collection.folders, collection.requests);

  return [
    overview(collection, context, options, level),
    ...collection.folders.flatMap((folder, index) =>
      folderPages(
        folder,
        options,
        level.slugs[index]!,
        `${order(index, level.width)}.`,
        '',
        context.prefix
      )
    ),
    ...collection.requests.map((request, index) =>
      requestPage(
        request,
        options,
        level.slugs[collection.folders.length + index]!,
        `${order(collection.folders.length + index, level.width)}.`,
        ''
      )
    )
  ];
}

/**
 * Unique URL segments for one level of the tree.
 *
 * Two requests called `Get user` and `Get User` slugify to the same segment,
 * and without this the second one's page would overwrite the first's — a
 * request silently missing from the reference, which is the failure mode the
 * OpenAPI type already answers for tags and operations. Numbered in the order
 * they are read, so the first keeps the clean name.
 */
function slugsFor(
  folders: DuxtBrunoFolder[],
  requests: DuxtBrunoRequest[]
): { slugs: string[]; width: number } {
  const taken = new Set<string>();

  const slugs = [
    ...folders.map((folder) => folder.name || folder.dir),
    ...requests.map((request) => request.name)
  ].map((name) => {
    const base = segment(name);

    let candidate = base;
    let attempt = 2;
    while (taken.has(candidate)) candidate = `${base}-${attempt++}`;
    taken.add(candidate);

    return candidate;
  });

  return { slugs, width: folders.length + requests.length };
}

/* ------------------------------------------------------------------ pages */

/** The collection's own page: what it is, what is in it, how to get it. */
function overview(
  collection: DuxtBrunoCollection,
  context: DuxtSectionContext,
  options: BrunoOptions,
  level: { slugs: string[] }
): DuxtSectionPage {
  const props = {
    name: collection.name,
    version: collection.version,
    auth: collection.auth,
    headers: collection.headers,
    environments: collection.environments,
    // A REMOTE collection gets no archive, and the limit is real rather than
    // chosen: Content's checkout lands in a hash-cached directory known only
    // inside the collection that declared it, so the module that writes these
    // files cannot read the artefact a second time. A link to a file nothing
    // wrote would be worse than the link being absent.
    download: context.remote ? undefined : brunoZipPath(context.collection),
    fetch: options.fetch
      ? `${FETCH_IN_BRUNO}${encodeURIComponent(options.fetch)}`
      : undefined,
    groups: collection.folders.map((folder, index) => ({
      name: folder.name,
      description: firstLine(folder.docs),
      requests: count(folder),
      to: `${context.prefix}/${level.slugs[index]}`
    })),
    requests: collection.requests.map((request, index) => ({
      name: request.name,
      method: request.method,
      url: request.url,
      to: `${context.prefix}/${level.slugs[collection.folders.length + index]}`
    }))
  };

  return {
    file: 'index.md',
    body: page(
      {
        title: collection.name,
        description: firstLine(collection.docs) ?? collection.name
      },
      [component('bruno-overview', props, collection.docs)]
    )
  };
}

/** A folder's index page, and a page for everything under it. */
function folderPages(
  folder: DuxtBrunoFolder,
  options: BrunoOptions,
  slug: string,
  prefix: string,
  parent: string,
  parentUrl: string
): DuxtSectionPage[] {
  // The FILE path carries the `NN.` ordering prefixes; the URL does not,
  // because Content strips them. Two values rather than one derived from the
  // other by a regex — which is what this was, and a folder legitimately named
  // `1.x` walked straight into it.
  const dir = `${parent}${prefix}${slug}`;
  const to = `${parentUrl}/${slug}`;

  const level = slugsFor(folder.folders, folder.requests);

  const children = folder.folders.flatMap((child, index) =>
    folderPages(
      child,
      options,
      level.slugs[index]!,
      `${order(index, level.width)}.`,
      `${dir}/`,
      to
    )
  );

  const requests = folder.requests.map((request, index) =>
    requestPage(
      request,
      options,
      level.slugs[folder.folders.length + index]!,
      `${order(folder.folders.length + index, level.width)}.`,
      `${dir}/`
    )
  );

  const index: DuxtSectionPage = {
    file: `${dir}/index.md`,
    body: page({ title: folder.name, description: firstLine(folder.docs) }, [
      component(
        'bruno-requests',
        {
          requests: folder.requests.map((request, position) => ({
            name: request.name,
            method: request.method,
            url: request.url,
            to: `${to}/${level.slugs[folder.folders.length + position]}`
          })),
          groups: folder.folders.map((child, position) => ({
            name: child.name,
            description: firstLine(child.docs),
            requests: count(child),
            to: `${to}/${level.slugs[position]}`
          }))
        },
        folder.docs
      )
    ])
  };

  return [index, ...children, ...requests];
}

/** One request, as one page. */
function requestPage(
  request: DuxtBrunoRequest,
  options: BrunoOptions,
  slug: string,
  prefix: string,
  parent: string
): DuxtSectionPage {
  // The docs travel in the SLOT rather than in the props, so what the file
  // wrote as Markdown is rendered as Markdown — the same rule `openapi`
  // follows for a description.
  const { docs, ...rest } = request;

  const client = tryIt(request, options);

  return {
    file: `${parent}${prefix}${slug}.md`,
    body: page(
      {
        title: request.name,
        description: firstLine(docs) ?? `${request.method} ${request.url}`
      },
      [component('bruno-request', { request: rest, ...client }, docs)]
    )
  };
}

/* ----------------------------------------------------------------- try-it */

/**
 * The request as the existing try-it client takes it — or nothing at all.
 *
 * OFF UNTIL A SITE TURNS IT ON, which is the decision this whole function
 * implements. A Bruno collection is written against whatever the author could
 * reach, which is routinely a staging host behind a VPN or a `localhost` port;
 * a documentation site that pointed a send button at it would be offering
 * readers a request that cannot work, and a site that guessed a public host
 * from the collection would be inventing one. So the site states the public
 * base URL and the variables that have a public value, and anything it did not
 * state leaves the page static.
 *
 * ADAPTED TO `DuxtOpenApiOperation` rather than given a client of its own: the
 * existing one already answers "where do the credentials go" in a way this
 * layer has committed to — in the component's own state, never stored, never
 * proxied — and a second client would be a second place to get that wrong.
 */
function tryIt(
  request: DuxtBrunoRequest,
  options: BrunoOptions
): { operation: Record<string, unknown>; servers: { url: string }[] } | object {
  const base = options.tryIt?.baseUrl;
  if (!base) return {};

  const variable = options.tryIt?.baseVariable ?? DEFAULT_BASE_VARIABLE;

  const resolved = resolve(request.url, {
    [variable]: '',
    ...options.tryIt?.variables
  });

  // A URL still holding `{{something}}` cannot be sent, and a send button that
  // builds a wrong URL is worse than no button: the reader gets a failure the
  // page cannot explain.
  if (resolved === undefined) return {};

  const [withoutQuery] = resolved.split('?');

  // Bruno writes a path parameter as `:name`; OpenAPI writes it as `{name}`,
  // which is the spelling the client draws a box for.
  const path = (withoutQuery || '/').replace(/:([A-Za-z_][\w-]*)/g, '{$1}');

  const parameters = [
    ...request.params
      .filter((entry) => !entry.disabled)
      .map((entry) => parameter(entry, entry.in)),
    ...request.headers
      .filter((entry) => !entry.disabled)
      .map((entry) => parameter(entry, 'header'))
  ];

  return {
    servers: [{ url: base }],
    operation: {
      kind: 'operation',
      method: request.method,
      path: path.startsWith('/') ? path : `/${path}`,
      deprecated: false,
      ...(parameters.length ? { parameters } : {}),
      ...(request.body?.text
        ? {
            requestBody: {
              required: false,
              content: [
                {
                  type: mediaType(request.body.type),
                  examples: [
                    { name: 'default', value: example(request.body.text) }
                  ]
                }
              ]
            }
          }
        : {})
    }
  };
}

/**
 * One box in the client.
 *
 * A REDACTED value carries no example at all, so the box opens empty and the
 * reader supplies their own credential. Prefilling it would put the collection
 * author's live token into every reader's form — which is the leak the
 * redaction exists to stop, arriving by the other door.
 */
function parameter(entry: DuxtBrunoEntry, where: string) {
  return {
    name: entry.name,
    in: where,
    required: where === 'path',
    ...(entry.redacted || !entry.value
      ? {}
      : { examples: [{ name: 'default', value: entry.value }] })
  };
}

/**
 * A URL with its `{{variables}}` filled in, or nothing where one is unknown.
 *
 * Only what the site DECLARED is substituted. A variable the site said nothing
 * about is not guessed at and not left in: the whole URL is abandoned, because
 * half a URL is a request to the wrong place.
 */
function resolve(
  url: string,
  values: Record<string, string>
): string | undefined {
  let unknown = false;

  const out = url.replaceAll(
    /\{\{\s*([^{}]+?)\s*\}\}/g,
    (_match, name: string) => {
      const value = values[name];

      if (value === undefined) {
        unknown = true;
        return '';
      }

      return value;
    }
  );

  return unknown ? undefined : out;
}

/** The body's media type, as a header value. */
function mediaType(type: string): string {
  if (type === 'json') return 'application/json';
  if (type === 'xml') return 'application/xml';
  if (type === 'graphql') return 'application/json';
  if (type === 'sparql') return 'application/sparql-query';

  return 'text/plain';
}

/** A JSON body as a value the client's editor can open; anything else as text. */
function example(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* ---------------------------------------------------------------- helpers */

function readOptions(options: DuxtSectionOptions): BrunoOptions {
  const tryItOption = options.tryIt;
  const fetchOption = options.fetch;

  const tryIt =
    tryItOption && typeof tryItOption === 'object'
      ? (tryItOption as BrunoOptions['tryIt'])
      : undefined;

  return {
    ...(tryIt?.baseUrl ? { tryIt } : {}),
    ...(typeof fetchOption === 'string' && fetchOption
      ? { fetch: fetchOption }
      : {})
  };
}

/** Every request under a folder, its own and its children's. */
function count(folder: DuxtBrunoFolder): number {
  return (
    folder.requests.length +
    folder.folders.reduce((total, child) => total + count(child), 0)
  );
}

/**
 * A URL segment: lowercase, no dots.
 *
 * The dots matter for the reason they matter in `sections-openapi.ts`: Content
 * reads a name made of digits and dots as a version and stops refining it,
 * which would leave the `NN.` ordering prefix in the URL.
 */
function segment(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'request'
  );
}

/** Zero-padded so ten pages still sort the way they read. */
function order(index: number, total: number): string {
  return String(index + 1).padStart(String(total).length, '0');
}

/** The first paragraph of a docs block, as one line of plain text. */
function firstLine(value?: string): string | undefined {
  const line = (value?.split(/\n\s*\n/)[0] ?? '')
    .replaceAll(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replaceAll(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replaceAll(/`([^`]*)`/g, '$1')
    .replaceAll(/(\*\*|__)(.+?)\1/g, '$2')
    .replaceAll(/(\*|_)(.+?)\1/g, '$2')
    .replace(/\s+/g, ' ')
    .trim();

  return line || undefined;
}

/** An MDC block component with YAML props and Markdown inside it. */
function component(
  name: string,
  props: Record<string, unknown>,
  slot?: string
): string {
  const body = slot?.trim() ?? '';

  const longest = Math.max(
    2,
    ...body.split('\n').map((line) => /^\s*(:+)/.exec(line)?.[1]?.length ?? 0)
  );

  const fence = ':'.repeat(Math.max(3, longest + 1));

  return [
    `${fence}${name}`,
    '---',
    stringifyYaml(compact(props)).trimEnd(),
    '---',
    ...(body ? [body] : []),
    fence
  ].join('\n');
}

/**
 * The props, with every absent thing actually absent.
 *
 * `undefined` is not YAML, and a key written as `null` is a key a component has
 * to test for a second way. Empty lists and maps go too — the model's own rule,
 * stated in `openapi-model.ts` and followed here so the two types' props read
 * the same.
 */
function compact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compact);

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      if (item === undefined || item === null) continue;
      if (Array.isArray(item) && !item.length) continue;
      if (
        typeof item === 'object' &&
        !Array.isArray(item) &&
        !Object.keys(item).length
      ) {
        continue;
      }

      out[key] = compact(item);
    }

    return out;
  }

  return value;
}

/** A page: frontmatter, then the lines. */
function page(
  fields: Record<string, string | undefined>,
  lines: string[]
): string {
  return [frontmatter(fields), '', ...lines, ''].join('\n');
}

/**
 * A frontmatter block YAML can read back.
 *
 * Every value is a JSON string, which is also a YAML double-quoted scalar — the
 * rule `tests/frontmatter-yaml.test.ts` exists over, and a request named
 * `GET /pets/{petId}: not found` is exactly the shape that breaks it.
 */
function frontmatter(fields: Record<string, string | undefined>): string {
  return [
    '---',
    ...Object.entries(fields)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`),
    '---'
  ].join('\n');
}
