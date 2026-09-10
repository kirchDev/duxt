/**
 * The `openapi` type: an API description, published as reference pages.
 *
 * The second type in the registry, and the first one that answers the questions
 * the registry was built to ask. A changelog is one global history in the
 * language it was written in; a reference is **per version** and **per locale**,
 * and it needs a **layout** the docs chrome does not give it. Those three
 * differences are policies on the type rather than branches in the scaffold,
 * which is exactly what #9 claimed they would be — so this file adds a parser
 * and three declarations, and nothing else.
 *
 * ONE PAGE PER OPERATION, plus an index per tag. Everything the layer can do
 * hangs off pages: the search a reader actually performs is "find this
 * endpoint", `llms.txt` lists pages, the MCP tools read pages, and a deep link
 * to an endpoint has to survive being pasted into a ticket. A single-page
 * reference with client-side routing has none of that.
 *
 * The pages are Markdown carrying MDC components, because that is what the
 * scaffold's `getKeys`/`getItem` seam produces and what makes the result an
 * ordinary collection. The prose — the operation's own description, a tag's,
 * the document's — is written OUTSIDE the component, as the CommonMark the
 * specification says it is, so Content parses it, the search indexes it and
 * `llms-full.txt` carries it. Only what is structural — parameters, schemas,
 * responses, the try-it client — travels as props.
 */
import { stringify as stringifyYaml } from 'yaml';
import type {
  DuxtOpenApiOperation,
  DuxtOpenApiSecurity,
  DuxtOpenApiServer,
  DuxtOpenApiSpec,
  DuxtOpenApiTag
} from './openapi-model';
import { compactOpenApi, parseOpenApiDocument } from './openapi-parse';
import type {
  DuxtSectionContext,
  DuxtSectionPage,
  DuxtSectionType
} from './sections-resolve';

/**
 * The layout name this type binds — PUBLIC SURFACE, so renaming it is a
 * `feat!:`. It is the first name to go through the shared slot, which is what
 * makes it the first real test of it.
 */
export const DUXT_OPENAPI_LAYOUT = 'reference';

export const openapiSectionType: DuxtSectionType = {
  parse: parseOpenApiSection,
  /**
   * PER VERSION, like any other page.
   *
   * An API description belongs to the release it describes: `v1` and `v2` have
   * different endpoints, and a reader on `v1` asking what a field means must
   * not be shown `v2`'s answer. Each version collection therefore carries the
   * spec file at its own ref, and the version switcher works on the reference
   * exactly as it works on the prose. This is the opposite answer to the
   * changelog's, and the reason `versioning` is a policy rather than a rule.
   */
  versioning: 'per-version',
  /**
   * PER LOCALE, where a locale ships a spec of its own.
   *
   * A description is written prose as much as it is structure — summaries,
   * descriptions, response meanings — so a translated one is a real artefact
   * rather than the same file relabelled. A locale that declares none builds no
   * collection, and the existing fallback chain then serves the original with
   * `DuxtTranslationBanner` saying so. What stays translatable either way are
   * the LAYER'S OWN labels — the table headers, "Request", "Response", the
   * status names — because those belong to the theme and not to the document.
   */
  localisation: 'per-locale',
  layout: DUXT_OPENAPI_LAYOUT,
  icon: 'lucide:plug'
};

function parseOpenApiSection(
  artefact: string,
  context: DuxtSectionContext
): DuxtSectionPage[] {
  let spec: DuxtOpenApiSpec;

  try {
    spec = parseOpenApiDocument(artefact);
  } catch (error) {
    // Rethrown rather than swallowed into an empty section: the scaffold turns
    // "no pages" into the right severity for local and remote alike, but a
    // message saying WHY reads better than one saying the file held nothing.
    throw new Error(
      `duxt: the generated section "${context.label}" could not read its ` +
        `OpenAPI document — ${(error as Error).message}`
    );
  }

  // Into the report rather than onto the console: a document is parsed while
  // the config is loading, so a printed warning about a dropped `$ref` has
  // scrolled away before the dev server has finished starting — and what it
  // reports is content silently missing from the reference. See
  // `DuxtSectionContext.warn`.
  for (const warning of spec.warnings) context.warn?.(warning);

  if (!spec.tags?.length) return [];

  const groups = spec.tags.map((tag, index) => ({
    tag,
    slug: segment(tag.name),
    order: order(index, spec.tags!.length)
  }));

  // A tag whose name slugifies to the same segment as another's would serve
  // two groups from one URL, and the later one would win silently.
  const seen = new Set<string>();
  for (const group of groups) {
    let candidate = group.slug || 'group';
    let attempt = 2;
    while (seen.has(candidate)) candidate = `${group.slug}-${attempt++}`;
    seen.add(candidate);
    group.slug = candidate;
  }

  return [
    overview(spec, groups, context),
    ...groups.flatMap((group) => pagesFor(spec, group, context))
  ];
}

interface Group {
  tag: DuxtOpenApiTag;
  slug: string;
  order: string;
}

/** The section's own page: what the API is, where it is, how to authenticate. */
function overview(
  spec: DuxtOpenApiSpec,
  groups: Group[],
  context: DuxtSectionContext
): DuxtSectionPage {
  const props = {
    version: spec.info.version,
    // NO `summary`: it is this page's `description` below, and the shell draws
    // a description under the title. Handed to the component as well, it was
    // printed a second time under the rule where the body starts.
    servers: spec.servers,
    securitySchemes: spec.securitySchemes,
    security: spec.security,
    contact: spec.info.contact,
    license: spec.info.license,
    termsOfService: spec.info.termsOfService,
    externalDocs: spec.externalDocs,
    groups: groups.map((group) => ({
      name: group.tag.name,
      // One line, and plain: a card is not prose, and a tag description that
      // renders as Markdown on its own page would otherwise show its asterisks
      // here.
      description: firstLine(group.tag.description),
      webhooks: group.tag.webhooks ?? false,
      operations: group.tag.operations?.length ?? 0,
      to: `${context.prefix}/${group.slug}`
    }))
  };

  return {
    file: 'index.md',
    body: page(
      { title: spec.info.title, description: overviewDescription(spec) },
      // NO `<h1>` OF ITS OWN. The shell draws the docs header — breadcrumb,
      // title, the copy control beside it — for every generated page whose body
      // opens on no heading, and these pages want exactly that: a reference
      // page has a title and a trail like any written one, and the method chip
      // that made this type look different is drawn below the heading anyway.
      [component('open-api-overview', props, spec.info.description)]
    )
  };
}

function overviewDescription(spec: DuxtOpenApiSpec): string {
  return (
    spec.info.summary ??
    firstLine(spec.info.description) ??
    // `version` is optional once the model has been compacted, and a template
    // literal writes an absent one out as the word `undefined`.
    [spec.info.title, spec.info.version].filter(Boolean).join(' ')
  );
}

/** A tag's index page, and one page per operation under it. */
function pagesFor(
  spec: DuxtOpenApiSpec,
  group: Group,
  context: DuxtSectionContext
): DuxtSectionPage[] {
  const operations = group.tag.operations ?? [];
  const slugs = operationSlugs(operations);
  const width = operations.length;

  const links = operations.map((operation, index) => ({
    method: operation.method,
    path: operation.path,
    kind: operation.kind,
    summary: operation.summary,
    deprecated: operation.deprecated,
    to: `${context.prefix}/${group.slug}/${slugs[index]}`
  }));

  const index: DuxtSectionPage = {
    file: `${group.order}.${group.slug}/index.md`,
    body: page(
      // No invented description where the tag has none: a count in the
      // layer's own English would be untranslatable text the layer does not
      // own, which `tests/i18n-ownership.test.ts` exists to keep out.
      { title: group.tag.name, description: firstLine(group.tag.description) },
      [
        component(
          'open-api-operations',
          { operations: links, externalDocs: group.tag.externalDocs },
          group.tag.description
        )
      ]
    )
  };

  return [
    index,
    ...operations.map((operation, position) =>
      operationPage(
        spec,
        group,
        operation,
        slugs[position]!,
        order(position, width)
      )
    )
  ];
}

function operationPage(
  spec: DuxtOpenApiSpec,
  group: Group,
  operation: DuxtOpenApiOperation,
  slug: string,
  position: string
): DuxtSectionPage {
  const title =
    operation.summary?.trim() ||
    `${operation.method.toUpperCase()} ${operation.path}`;

  // The description travels in the SLOT rather than in the props, so what the
  // document wrote as CommonMark is rendered as CommonMark. `servers` and
  // `security` leave with it: both are RESOLVED against the document below, and
  // an unresolved copy beside the resolved one is two answers to one question.
  // The underscores are what marks them deliberately dropped rather than
  // forgotten — `no-unused-vars` reads the prefix, and this repository denies
  // warnings.
  const {
    description,
    servers: _servers,
    security: _security,
    ...rest
  } = operation;

  const props = {
    operation: rest,
    servers: serversFor(spec, operation),
    security: securityFor(spec, operation),
    securitySchemes: spec.securitySchemes
  };

  return {
    file: `${group.order}.${group.slug}/${position}.${slug}.md`,
    body: page(
      {
        title,
        description:
          firstLine(description) ??
          `${operation.method.toUpperCase()} ${operation.path}`
      },
      [component('open-api-operation', props, description)]
    )
  };
}

/**
 * The servers this operation is reachable at.
 *
 * An operation's own list REPLACES the document's rather than adding to it,
 * which is what the specification says and what the try-it client has to obey:
 * offering a server the endpoint is not served from is a request that fails for
 * a reason nothing on the page explains.
 */
function serversFor(
  spec: DuxtOpenApiSpec,
  operation: DuxtOpenApiOperation
): DuxtOpenApiServer[] {
  return operation.servers?.length ? operation.servers : (spec.servers ?? []);
}

/**
 * The security this operation demands.
 *
 * An operation's own `security` replaces the document's, and an EMPTY LIST is a
 * statement rather than an absence: it is how an endpoint opts out of a global
 * requirement, which is why this cannot be a `||`.
 */
function securityFor(
  spec: DuxtOpenApiSpec,
  operation: DuxtOpenApiOperation
): DuxtOpenApiSecurity | undefined {
  return operation.security ?? spec.security;
}

/**
 * A URL segment per operation, unique inside its tag.
 *
 * `operationId` first, because it is the name the document itself gives the
 * endpoint and the one an SDK generator uses — a reader following a link from
 * generated code lands on the right page. Without one the method and path are
 * the only stable identity there is.
 */
function operationSlugs(operations: DuxtOpenApiOperation[]): string[] {
  const taken = new Set<string>();

  return operations.map((operation) => {
    const base =
      segment(operation.operationId ?? '') ||
      segment(`${operation.method}-${operation.path}`) ||
      operation.method;

    let candidate = base;
    let attempt = 2;
    while (taken.has(candidate)) candidate = `${base}-${attempt++}`;
    taken.add(candidate);

    return candidate;
  });
}

/**
 * A URL segment: lowercase, no dots.
 *
 * The dots matter. Content reads a name made of digits and dots as a version
 * and stops refining it, which would leave the `NN.` ordering prefix in the
 * URL — the same trap `sections-changelog.ts` answers with a leading `v`. An
 * endpoint at `/v1.0/pets` walks straight into it, so the dot goes.
 */
function segment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Zero-padded so ten pages still sort the way they read. */
function order(index: number, total: number): string {
  return String(index + 1).padStart(String(total).length, '0');
}

/**
 * The first paragraph of a description, as one line of PLAIN text.
 *
 * Plain matters because of where this goes: a page's `description`
 * frontmatter, which becomes the meta description, the og tag and the card in
 * a search result, and the summary on a group card. A CommonMark description
 * carrying `*emphasis*` or a `[link](url)` renders as prose everywhere it is
 * rendered as prose — and as its own punctuation everywhere it is not.
 *
 * Deliberately small. It undoes the four inline constructs a one-line summary
 * actually meets — emphasis, code spans, links and images — and leaves
 * everything else alone rather than growing into a second Markdown parser
 * whose disagreements with the first would be invisible.
 */
function firstLine(value?: string): string | undefined {
  const line = plain(value?.split(/\n\s*\n/)[0] ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  return line || undefined;
}

/** Inline Markdown, as the text it renders to. */
function plain(value: string): string {
  return (
    value
      // An image before a link: `![alt](src)` is a link with a `!` in front, and
      // taking the link first would leave the `!` behind.
      .replaceAll(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replaceAll(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replaceAll(/`([^`]*)`/g, '$1')
      .replaceAll(/(\*\*|__)(.+?)\1/g, '$2')
      .replaceAll(/(\*|_)(.+?)\1/g, '$2')
  );
}

/**
 * An MDC block component with YAML props and Markdown inside it.
 *
 * The fence LENGTH is computed rather than fixed: a description containing a
 * line of colons would otherwise close the component early and spill its props
 * into the page. Three is the floor — enough that `::callout` inside a
 * description is content rather than a closing fence.
 */
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
    stringifyYaml(compactOpenApi(props)).trimEnd(),
    '---',
    ...(body ? [body] : []),
    fence
  ].join('\n');
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
 * Every value is a JSON string, which is also a YAML double-quoted scalar — so
 * a summary carrying a colon cannot end the mapping early. The rule
 * `tests/frontmatter-yaml.test.ts` exists over, and a title like
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
