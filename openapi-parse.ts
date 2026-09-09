/**
 * An OpenAPI document, read into the shape the reference pages render.
 *
 * PURE, and separate from `sections-openapi.ts` for the reason
 * `sources-resolve.ts` is separate from `sources.ts`: this half is text in and
 * a model out, so it can be tested without a build, a file system or a Nuxt
 * runtime — and the model it returns is the contract the theme's components
 * read, which is the only place the spec's shape is allowed to be known.
 *
 * Three jobs, and they are the reason this file is not the parser call alone:
 *
 * - **One document out of two dialects.** 3.0 and 3.1 spell the same things
 *   differently — `nullable` against a `null` in the type list, a boolean
 *   `exclusiveMinimum` against a numeric one, a singular `example` against a
 *   list. The renderer sees ONE of those spellings, never both, because a
 *   component that branches on the document version is a component that grows a
 *   branch per keyword.
 * - **`$ref` resolution, cycles included.** A reference is followed and the
 *   NAME it was followed through is kept: a schema drawn as `Pet` rather than
 *   as its expansion is the difference between a readable reference and a wall.
 *   A cycle — and `Pet.friends: Pet[]` is the ordinary case, not the exotic
 *   one — is cut and marked rather than expanded until the stack gives out.
 * - **Saying what it could not read.** Every construct it declines to follow —
 *   an external `$ref`, a Swagger 2.0 document, a `$ref` pointing at nothing —
 *   lands in `warnings`, which the build prints. A reference that silently drops
 *   half a spec is worse than no reference at all.
 */
import { parse as parseYaml } from 'yaml';
import type {
  DuxtOpenApiBody,
  DuxtOpenApiCallback,
  DuxtOpenApiCallbackOperation,
  DuxtOpenApiCodeSample,
  DuxtOpenApiConstraints,
  DuxtOpenApiEncoding,
  DuxtOpenApiExample,
  DuxtOpenApiExternalDocs,
  DuxtOpenApiHeader,
  DuxtOpenApiLink,
  DuxtOpenApiMediaType,
  DuxtOpenApiOperation,
  DuxtOpenApiParameter,
  DuxtOpenApiResponse,
  DuxtOpenApiSchema,
  DuxtOpenApiSecurity,
  DuxtOpenApiSecurityScheme,
  DuxtOpenApiSecuritySchemeType,
  DuxtOpenApiServer,
  DuxtOpenApiSpec,
  DuxtOpenApiTag
} from './openapi-model';

import {
  DUXT_OPENAPI_DEFAULT_TAG,
  DUXT_OPENAPI_WEBHOOKS_TAG
} from './openapi-model';

// Re-exported so a caller reads the model through the parser it came out of,
// and never has to know the split exists.
export type * from './openapi-model';
export { DUXT_OPENAPI_DEFAULT_TAG, DUXT_OPENAPI_WEBHOOKS_TAG };

/** The HTTP methods a Path Item may carry, in the order a reference lists them. */
const METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace'
];

type Node = Record<string, unknown>;

const isObject = (value: unknown): value is Node =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const str = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const bool = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * The document, as text.
 *
 * JSON is read as YAML rather than as JSON, because YAML 1.2 is a superset of
 * it — one parser, one error message, and a `.json` file that happens to carry
 * a trailing comma still says which line it is on.
 */
export function parseOpenApiDocument(artefact: string): DuxtOpenApiSpec {
  let document: unknown;

  try {
    document = parseYaml(artefact);
  } catch (error) {
    throw new Error(
      `the document is neither JSON nor YAML: ${(error as Error).message}`
    );
  }

  if (!isObject(document)) {
    throw new Error('the document is not an object');
  }

  if ('swagger' in document) {
    throw new Error(
      `this is a Swagger ${str(document.swagger) ?? '2.0'} document. ` +
        'duxt reads OpenAPI 3.0 and 3.1 — convert it before sourcing it.'
    );
  }

  const declared = str(document.openapi);

  if (!declared) {
    throw new Error('the document declares no `openapi` version');
  }

  const dialect = declared.startsWith('3.1')
    ? '3.1'
    : declared.startsWith('3.0')
      ? '3.0'
      : undefined;

  if (!dialect) {
    throw new Error(
      `the document declares OpenAPI ${declared}. duxt reads 3.0 and 3.1.`
    );
  }

  const spec = read(document, dialect);

  // The model the parser HANDS BACK is the compacted one, so there is exactly
  // one shape: what the tests assert, what the section type writes into a
  // page's props, and what the theme's components receive are the same object.
  // `warnings` is rebuilt outside it, because an empty list there is a real
  // answer — nothing went unread — rather than noise to drop.
  return { ...compactOpenApi(spec), warnings: spec.warnings };
}

function read(document: Node, dialect: '3.0' | '3.1'): DuxtOpenApiSpec {
  const warnings: string[] = [];
  const warn = (message: string) => {
    if (!warnings.includes(message)) warnings.push(message);
  };

  /**
   * A `$ref`, followed once.
   *
   * Only INSIDE this document: an external reference names a file this layer
   * was never handed — the declaration is one path, and reaching past it would
   * reopen the build-time-network question `DuxtGeneratedSection.path` closes.
   * So it is reported and drawn as the reference it is.
   */
  const follow = (
    node: unknown
  ): { value: unknown; name?: string; ref?: string; external?: boolean } => {
    if (!isObject(node) || typeof node.$ref !== 'string')
      return { value: node };

    const ref = node.$ref;

    if (!ref.startsWith('#/')) {
      warn(
        `the reference "${ref}" points outside the document, which duxt does ` +
          'not follow. Bundle the specification before sourcing it.'
      );
      return { value: undefined, ref, external: true };
    }

    const segments = ref
      .slice(2)
      .split('/')
      .map((segment) =>
        decodeURIComponent(segment).replaceAll('~1', '/').replaceAll('~0', '~')
      );

    let current: unknown = document;

    for (const segment of segments) {
      if (Array.isArray(current)) current = current[Number(segment)];
      else if (isObject(current)) current = current[segment];
      else current = undefined;

      if (current === undefined) break;
    }

    if (current === undefined) {
      warn(`the reference "${ref}" points at nothing in this document.`);
      return { value: undefined, ref };
    }

    // The LAST segment is the component's own name, which is what a reader
    // recognises — `Pet`, not `#/components/schemas/Pet`.
    return { value: current, name: segments.at(-1), ref };
  };

  /** The externalDocs object, wherever one may appear. */
  const externalDocs = (node: unknown): DuxtOpenApiExternalDocs | undefined => {
    if (!isObject(node)) return undefined;
    const url = str(node.url);
    return url ? { url, description: str(node.description) } : undefined;
  };

  /**
   * A schema, with `$ref` followed and both dialects reduced to one spelling.
   *
   * `stack` holds the references currently being expanded. A schema that
   * reaches itself is cut with `circular` rather than followed — `Pet.friends:
   * Pet[]` is the ordinary shape of a schema, not a broken one, and expanding
   * it is a stack overflow at build time.
   */
  const schema = (
    node: unknown,
    stack: string[] = [],
    inherited?: string
  ): DuxtOpenApiSchema | undefined => {
    const followed = follow(node);

    if (followed.external) {
      return blank({ ref: followed.ref, external: true });
    }

    if (followed.ref && followed.value === undefined) {
      return blank({ ref: followed.ref });
    }

    if (followed.ref && stack.includes(followed.ref)) {
      return blank({
        ref: followed.ref,
        name: followed.name,
        circular: true
      });
    }

    const value = followed.value;

    // `true` and `false` are schemas in JSON Schema: everything and nothing.
    if (value === true) return blank({});
    if (value === false) return blank({ types: ['never'] });
    if (!isObject(value)) return undefined;

    const next = followed.ref ? [...stack, followed.ref] : stack;
    const name = followed.name ?? inherited;

    const types = new Set<string>();
    const declaredType = value.type;

    if (typeof declaredType === 'string') types.add(declaredType);
    for (const entry of list(declaredType)) {
      if (typeof entry === 'string') types.add(entry);
    }

    // 3.0 says `nullable: true`; 3.1 says `null` in the type list. ONE of them
    // reaches the renderer, so no component has to know which document it is
    // drawing.
    if (dialect === '3.0' && value.nullable === true) types.add('null');

    const required = new Set(
      list(value.required).filter(
        (entry): entry is string => typeof entry === 'string'
      )
    );

    const properties = isObject(value.properties)
      ? Object.entries(value.properties).map(([key, property]) => ({
          name: key,
          required: required.has(key),
          schema: schema(property, next) ?? blank({})
        }))
      : undefined;

    const built: DuxtOpenApiSchema = {
      ...(name ? { name } : {}),
      ...(followed.ref ? { ref: followed.ref } : {}),
      types: [...types],
      format: str(value.format),
      title: str(value.title),
      description: str(value.description),
      default: value.default,
      const: value.const,
      enum: Array.isArray(value.enum) ? value.enum : undefined,
      examples: schemaExamples(value),
      deprecated: bool(value.deprecated),
      readOnly: bool(value.readOnly),
      writeOnly: bool(value.writeOnly),
      constraints: constraints(value),
      properties,
      additionalProperties: additional(value.additionalProperties, next),
      items: schema(value.items, next),
      prefixItems: list(value.prefixItems)
        .map((entry) => schema(entry, next))
        .filter((entry): entry is DuxtOpenApiSchema => Boolean(entry)),
      oneOf: composition(value.oneOf, next),
      anyOf: composition(value.anyOf, next),
      allOf: composition(value.allOf, next),
      not: schema(value.not, next),
      discriminator: discriminator(value.discriminator),
      externalDocs: externalDocs(value.externalDocs)
    };

    if (!built.prefixItems?.length) delete built.prefixItems;

    return mergeAllOf(prune(built));
  };

  const composition = (
    node: unknown,
    stack: string[]
  ): DuxtOpenApiSchema[] | undefined => {
    if (!Array.isArray(node) || !node.length) return undefined;

    const branches = node
      .map((entry) => schema(entry, stack))
      .filter((entry): entry is DuxtOpenApiSchema => Boolean(entry));

    return branches.length ? branches : undefined;
  };

  const additional = (
    node: unknown,
    stack: string[]
  ): DuxtOpenApiSchema | false | undefined => {
    if (node === undefined) return undefined;
    if (node === false) return false;
    if (node === true) return blank({});

    return schema(node, stack);
  };

  /** One list, whichever dialect wrote it. */
  const schemaExamples = (value: Node): unknown[] => {
    if (Array.isArray(value.examples)) return value.examples;
    return 'example' in value ? [value.example] : [];
  };

  const namedExamples = (node: Node): DuxtOpenApiExample[] => {
    const examples = isObject(node.examples)
      ? Object.entries(node.examples).map(([key, entry]) => {
          const followed = follow(entry);
          const value = isObject(followed.value) ? followed.value : {};

          return {
            name: key,
            summary: str(value.summary),
            description: str(value.description),
            value: value.value,
            externalValue: str(value.externalValue)
          };
        })
      : [];

    // A singular `example` is the same statement with no name, so it is
    // promoted rather than kept as a second field every component must read.
    if (!examples.length && 'example' in node) {
      return [{ name: 'default', value: node.example }];
    }

    return examples;
  };

  const mediaTypes = (node: unknown): DuxtOpenApiMediaType[] => {
    if (!isObject(node)) return [];

    return Object.entries(node).map(([type, entry]) => {
      const value = isObject(entry) ? entry : {};

      return {
        type,
        schema: schema(value.schema),
        examples: namedExamples(value),
        encoding: encodings(value.encoding)
      };
    });
  };

  const encodings = (node: unknown): DuxtOpenApiEncoding[] | undefined => {
    if (!isObject(node)) return undefined;

    const entries = Object.entries(node).map(([property, entry]) => {
      const value = isObject(entry) ? entry : {};

      return {
        property,
        contentType: str(value.contentType),
        style: str(value.style),
        explode: bool(value.explode),
        allowReserved: bool(value.allowReserved),
        headers: headers(value.headers)
      };
    });

    return entries.length ? entries : undefined;
  };

  const headers = (node: unknown): DuxtOpenApiHeader[] => {
    if (!isObject(node)) return [];

    return Object.entries(node).map(([name, entry]) => {
      const followed = follow(entry).value;
      const header = isObject(followed) ? followed : {};

      return {
        name,
        description: str(header.description),
        required: header.required === true,
        deprecated: bool(header.deprecated),
        schema: schema(header.schema),
        examples: namedExamples(header)
      };
    });
  };

  const parameters = (node: unknown): DuxtOpenApiParameter[] =>
    list(node)
      .map((entry): DuxtOpenApiParameter | undefined => {
        const value = follow(entry).value;
        if (!isObject(value)) return undefined;

        const where = str(value.in);
        const name = str(value.name);

        // Both are required by the specification, and a parameter missing
        // either cannot be rendered, sent, or matched against the path item's
        // own list. Dropped rather than drawn as a blank row.
        if (!where || !name) return undefined;

        return {
          name,
          in: where as DuxtOpenApiParameter['in'],
          description: str(value.description),
          // A path parameter is required by the specification whether or not
          // the document remembered to say so.
          required: value.required === true || where === 'path',
          deprecated: bool(value.deprecated),
          allowEmptyValue: bool(value.allowEmptyValue),
          style: str(value.style),
          explode: bool(value.explode),
          schema: schema(value.schema),
          examples: namedExamples(value),
          content: isObject(value.content)
            ? mediaTypes(value.content)
            : undefined
        };
      })
      .filter((entry) => entry !== undefined);

  const requestBody = (node: unknown): DuxtOpenApiBody | undefined => {
    const value = follow(node).value;
    if (!isObject(value)) return undefined;

    return {
      description: str(value.description),
      required: value.required === true,
      content: mediaTypes(value.content)
    };
  };

  const links = (node: unknown): DuxtOpenApiLink[] => {
    if (!isObject(node)) return [];

    return Object.entries(node).map(([name, entry]) => {
      const followed = follow(entry).value;
      const value = isObject(followed) ? followed : {};

      return {
        name,
        operationId: str(value.operationId),
        operationRef: str(value.operationRef),
        description: str(value.description),
        parameters: isObject(value.parameters)
          ? (value.parameters as Record<string, unknown>)
          : undefined,
        requestBody: value.requestBody,
        server: server(value.server)
      };
    });
  };

  const responses = (node: unknown): DuxtOpenApiResponse[] => {
    if (!isObject(node)) return [];

    return Object.entries(node)
      .sort(([a], [b]) => statusOrder(a) - statusOrder(b))
      .map(([status, entry]) => {
        const followed = follow(entry).value;
        const value = isObject(followed) ? followed : {};

        return {
          status,
          description: str(value.description),
          headers: headers(value.headers),
          content: mediaTypes(value.content),
          links: links(value.links)
        };
      });
  };

  const server = (node: unknown): DuxtOpenApiServer | undefined => {
    if (!isObject(node)) return undefined;
    const url = str(node.url);
    if (!url) return undefined;

    return {
      url,
      description: str(node.description),
      variables: isObject(node.variables)
        ? Object.entries(node.variables).map(([name, entry]) => {
            const value = isObject(entry) ? entry : {};

            return {
              name,
              default: str(value.default) ?? '',
              enum: list(value.enum).filter(
                (option): option is string => typeof option === 'string'
              ),
              description: str(value.description)
            };
          })
        : []
    };
  };

  const servers = (node: unknown): DuxtOpenApiServer[] =>
    list(node)
      .map(server)
      .filter((entry): entry is DuxtOpenApiServer => Boolean(entry));

  const securitySchemes: DuxtOpenApiSecurityScheme[] = isObject(
    (document.components as Node | undefined)?.securitySchemes
  )
    ? Object.entries((document.components as Node).securitySchemes as Node).map(
        ([key, entry]) => {
          const followed = follow(entry).value;
          const value = isObject(followed) ? followed : {};

          return {
            key,
            type: (str(value.type) ??
              'apiKey') as DuxtOpenApiSecuritySchemeType,
            description: str(value.description),
            name: str(value.name),
            in: str(value.in) as DuxtOpenApiSecurityScheme['in'],
            scheme: str(value.scheme),
            bearerFormat: str(value.bearerFormat),
            openIdConnectUrl: str(value.openIdConnectUrl),
            flows: isObject(value.flows)
              ? Object.entries(value.flows).map(([name, flow]) => {
                  const it = isObject(flow) ? flow : {};

                  return {
                    name,
                    authorizationUrl: str(it.authorizationUrl),
                    tokenUrl: str(it.tokenUrl),
                    refreshUrl: str(it.refreshUrl),
                    scopes: isObject(it.scopes)
                      ? Object.entries(it.scopes).map(
                          ([scope, description]) => ({
                            name: scope,
                            description: str(description)
                          })
                        )
                      : []
                  };
                })
              : []
          };
        }
      )
    : [];

  const security = (node: unknown): DuxtOpenApiSecurity | undefined => {
    if (!Array.isArray(node)) return undefined;

    return node.map((entry) =>
      isObject(entry)
        ? Object.entries(entry).map(([key, scopes]) => ({
            key,
            scopes: list(scopes).filter(
              (scope): scope is string => typeof scope === 'string'
            ),
            scheme: securitySchemes.find((candidate) => candidate.key === key)
          }))
        : []
    );
  };

  /**
   * `x-codeSamples`, under both spellings it has had.
   *
   * Redocly renamed `x-code-samples` to `x-codeSamples` and documents carry
   * either, so both are read and the newer one wins where a document has both.
   * `lang` is required — it is both the grammar and the name of the group the
   * sample joins — and a sample with no source is nothing to show.
   */
  const codeSamples = (
    operation: Record<string, unknown>
  ): DuxtOpenApiCodeSample[] =>
    list(operation['x-codeSamples'] ?? operation['x-code-samples'])
      .filter(isObject)
      .map((entry) => ({
        lang: str(entry.lang) ?? '',
        label: str(entry.label),
        source: str(entry.source) ?? ''
      }))
      .filter((entry) => !!entry.lang && !!entry.source);

  const callbacks = (node: unknown): DuxtOpenApiCallback[] => {
    if (!isObject(node)) return [];

    return Object.entries(node).map(([name, entry]) => {
      const followed = follow(entry).value;
      const value = isObject(followed) ? followed : {};

      const operations: DuxtOpenApiCallbackOperation[] = [];

      for (const [expression, item] of Object.entries(value)) {
        if (!isObject(item)) continue;

        for (const method of METHODS) {
          const operation = item[method];
          if (!isObject(operation)) continue;

          operations.push({
            expression,
            method,
            summary: str(operation.summary),
            description: str(operation.description),
            requestBody: requestBody(operation.requestBody),
            responses: responses(operation.responses)
          });
        }
      }

      return { name, operations };
    });
  };

  const operations: DuxtOpenApiOperation[] = [];

  const readPathItem = (
    path: string,
    node: unknown,
    kind: 'operation' | 'webhook'
  ) => {
    const item = follow(node).value;
    if (!isObject(item)) return;

    // Declared once on the Path Item and inherited by every operation under it.
    const shared = parameters(item.parameters);

    for (const method of METHODS) {
      const operation = item[method];
      if (!isObject(operation)) continue;

      const own = parameters(operation.parameters);

      // The operation's own entry WINS over the path's, matched on name and
      // location — which is what the specification says, and the reason a
      // concatenation would list some parameters twice.
      const merged = [
        ...shared.filter(
          (entry) =>
            !own.some(
              (candidate) =>
                candidate.name === entry.name && candidate.in === entry.in
            )
        ),
        ...own
      ];

      operations.push({
        kind,
        method,
        path,
        operationId: str(operation.operationId),
        summary: str(operation.summary),
        description: str(operation.description),
        deprecated: operation.deprecated === true,
        tags: list(operation.tags).filter(
          (tag): tag is string => typeof tag === 'string'
        ),
        externalDocs: externalDocs(operation.externalDocs),
        servers: servers(operation.servers ?? item.servers),
        security: security(operation.security),
        parameters: merged,
        requestBody: requestBody(operation.requestBody),
        responses: responses(operation.responses),
        callbacks: callbacks(operation.callbacks),
        codeSamples: codeSamples(operation)
      });
    }
  };

  if (isObject(document.paths)) {
    for (const [path, item] of Object.entries(document.paths)) {
      readPathItem(path, item, 'operation');
    }
  }

  if (isObject(document.webhooks)) {
    if (dialect === '3.0') {
      warn(
        'the document declares `webhooks`, which OpenAPI 3.0 has no such key ' +
          'for. They are rendered, but the document should declare 3.1.'
      );
    }

    for (const [name, item] of Object.entries(document.webhooks)) {
      readPathItem(name, item, 'webhook');
    }
  }

  const info = isObject(document.info) ? document.info : {};

  return {
    dialect,
    info: {
      title: str(info.title) ?? 'API',
      version: str(info.version) ?? '',
      summary: str(info.summary),
      description: str(info.description),
      termsOfService: str(info.termsOfService),
      contact: isObject(info.contact)
        ? {
            name: str(info.contact.name),
            url: str(info.contact.url),
            email: str(info.contact.email)
          }
        : undefined,
      license: isObject(info.license)
        ? {
            name: str(info.license.name) ?? '',
            identifier: str(info.license.identifier),
            url: str(info.license.url)
          }
        : undefined
    },
    servers: servers(document.servers),
    externalDocs: externalDocs(document.externalDocs),
    security: security(document.security),
    securitySchemes,
    tags: group(operations, list(document.tags)),
    warnings
  };
}

/**
 * The operations, grouped into the tags the pages are built from.
 *
 * The document's own `tags` array sets the ORDER and carries the descriptions;
 * a tag used by an operation and never declared is appended rather than
 * dropped, because a document is allowed to omit the array entirely. An
 * operation with no tag at all lands in one group of its own, so no endpoint is
 * ever unreachable for want of a heading.
 */
function group(
  operations: DuxtOpenApiOperation[],
  declared: unknown[]
): DuxtOpenApiTag[] {
  // The operations list is non-optional HERE, unlike on the model: the tags
  // are built by pushing into it, and only `compactOpenApi` — which runs after
  // this — is allowed to make an empty one disappear.
  type Filled = DuxtOpenApiTag & { operations: DuxtOpenApiOperation[] };

  const tags = new Map<string, Filled>();

  const ensure = (name: string, webhooks = false) => {
    const existing = tags.get(name);
    if (existing) return existing;

    const created: Filled = {
      name,
      ...(webhooks ? { webhooks: true } : {}),
      operations: []
    };
    tags.set(name, created);
    return created;
  };

  for (const entry of declared) {
    if (!isObject(entry)) continue;
    const name = str(entry.name);
    if (!name) continue;

    const tag = ensure(name);
    tag.description = str(entry.description);

    if (isObject(entry.externalDocs)) {
      const url = str(entry.externalDocs.url);
      if (url) {
        tag.externalDocs = {
          url,
          description: str(entry.externalDocs.description)
        };
      }
    }
  }

  for (const operation of operations) {
    if (operation.kind === 'webhook') {
      ensure(DUXT_OPENAPI_WEBHOOKS_TAG, true).operations.push(operation);
      continue;
    }

    const names = operation.tags?.length
      ? operation.tags
      : [DUXT_OPENAPI_DEFAULT_TAG];

    for (const name of names) ensure(name).operations.push(operation);
  }

  // A declared tag no operation uses documents nothing and would be an empty
  // page in the sidebar.
  return [...tags.values()].filter((tag) => tag.operations.length);
}

/**
 * `default` last, a wildcard at the END of its own range, everything else by
 * code.
 *
 * The `X`s become nines rather than being stripped: `4XX` means "any client
 * error", so it belongs after `404` and not before `201` — which is where
 * parsing it as the number 4 puts it.
 */
function statusOrder(status: string): number {
  if (status === 'default') return 10_000;

  const numeric = Number.parseInt(status.replaceAll(/[Xx]/g, '9'), 10);

  return Number.isNaN(numeric) ? 9_000 : numeric;
}

function constraints(value: Node): DuxtOpenApiConstraints {
  const built: DuxtOpenApiConstraints = {
    minimum: num(value.minimum),
    maximum: num(value.maximum),
    exclusiveMinimum: num(value.exclusiveMinimum),
    exclusiveMaximum: num(value.exclusiveMaximum),
    multipleOf: num(value.multipleOf),
    minLength: num(value.minLength),
    maxLength: num(value.maxLength),
    pattern: str(value.pattern),
    minItems: num(value.minItems),
    maxItems: num(value.maxItems),
    uniqueItems: bool(value.uniqueItems),
    minProperties: num(value.minProperties),
    maxProperties: num(value.maxProperties)
  };

  // 3.0 writes an exclusive bound as a BOOLEAN beside the inclusive one; 3.1
  // writes the number itself. Reduced to 3.1's spelling, so the renderer draws
  // one thing.
  if (value.exclusiveMinimum === true && built.minimum !== undefined) {
    built.exclusiveMinimum = built.minimum;
    delete built.minimum;
  }

  if (value.exclusiveMaximum === true && built.maximum !== undefined) {
    built.exclusiveMaximum = built.maximum;
    delete built.maximum;
  }

  for (const [key, entry] of Object.entries(built)) {
    if (entry === undefined) delete built[key as keyof DuxtOpenApiConstraints];
  }

  return built;
}

function discriminator(node: unknown): DuxtOpenApiSchema['discriminator'] {
  if (!isObject(node)) return undefined;
  const propertyName = str(node.propertyName);
  if (!propertyName) return undefined;

  return {
    propertyName,
    mapping: isObject(node.mapping)
      ? (Object.fromEntries(
          Object.entries(node.mapping).filter(
            ([, value]) => typeof value === 'string'
          )
        ) as Record<string, string>)
      : undefined
  };
}

/**
 * `allOf` of plain objects, folded into the schema that carries it.
 *
 * The overwhelmingly common shape is `allOf: [$ref, { properties: … }]` — a
 * component plus the two fields this endpoint adds — and drawing that as a
 * composition of two boxes is strictly harder to read than the object it
 * describes. So object branches are merged, and anything that is NOT a plain
 * object (a `oneOf`, a scalar, a branch with its own composition) is left in
 * `allOf` for the renderer to draw as the composition it is.
 */
function mergeAllOf(value: DuxtOpenApiSchema): DuxtOpenApiSchema {
  if (!value.allOf?.length) return value;

  const mergeable = (branch: DuxtOpenApiSchema) =>
    !branch.circular &&
    !branch.external &&
    !branch.oneOf &&
    !branch.anyOf &&
    !branch.allOf &&
    !branch.not &&
    !branch.items &&
    !branch.enum &&
    (branch.types ?? []).every((type) => type === 'object');

  const merged = value.allOf.filter(mergeable);
  const kept = value.allOf.filter((branch) => !mergeable(branch));

  if (!merged.length) return value;

  const properties = [...(value.properties ?? [])];

  for (const branch of merged) {
    for (const property of branch.properties ?? []) {
      const existing = properties.findIndex(
        (entry) => entry.name === property.name
      );

      // A later branch refines an earlier one rather than duplicating it, and
      // `required` is a union: required anywhere is required.
      if (existing === -1) properties.push(property);
      else {
        properties[existing] = {
          ...property,
          required: properties[existing]!.required || property.required
        };
      }
    }
  }

  const result: DuxtOpenApiSchema = {
    ...value,
    types: value.types?.length
      ? value.types
      : merged.some((branch) => branch.types?.includes('object'))
        ? ['object']
        : [],
    description:
      value.description ??
      merged.find((branch) => branch.description)?.description,
    properties: properties.length ? properties : undefined,
    allOf: kept.length ? kept : undefined
  };

  return prune(result);
}

function blank(over: Partial<DuxtOpenApiSchema>): DuxtOpenApiSchema {
  return { types: [], examples: [], constraints: {}, ...over };
}

/** Drop the keys that are `undefined`, so a rendered prop carries no noise. */
function prune(value: DuxtOpenApiSchema): DuxtOpenApiSchema {
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) delete value[key as keyof DuxtOpenApiSchema];
  }

  return value;
}

/**
 * Keys whose value is the DOCUMENT'S data rather than the model's structure.
 *
 * `compact` does not descend into these. An example whose value is genuinely
 * `{}` or `[]` is a fact about the API — dropping it would make the page say
 * the endpoint takes no body when the document says it takes an empty one.
 */
/**
 * Keys whose EMPTY value is a statement rather than an absence.
 *
 * `security: []` is how an operation says it needs no authentication at all,
 * and it has to survive: dropped, the operation reads as inheriting the
 * document's requirement and the reference tells a reader to send credentials
 * to an endpoint that wants none. The one key in the model where empty and
 * absent are opposite answers.
 */
const KEEP = new Set(['security']);

const RAW = new Set([
  'value',
  'default',
  'const',
  'enum',
  'example',
  'examples',
  'mapping'
]);

/**
 * The model, small enough to read in the page's own source.
 *
 * Three jobs in one pass. It drops the `undefined`s the model carries, which
 * YAML has no spelling for. It drops what is EMPTY — `examples: []`,
 * `constraints: {}`, `headers: []` — which on a document of any size is most of
 * the payload, and which lands in `rawbody` and so in `llms-full.txt` and the
 * copy-page button. And it rebuilds every object, which breaks the shared
 * references between `security[].scheme` and `securitySchemes` that YAML would
 * otherwise write out as anchors and aliases: valid, and unreadable.
 *
 * `false` and `0` SURVIVE. `additionalProperties: false` is a constraint, not
 * an absence, and a `minimum: 0` is the whole of what some parameters allow.
 */
export function compactOpenApi<T>(value: T, raw = false): T {
  if (raw || value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((entry) => compactOpenApi(entry)) as T;
  }

  const built: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value)) {
    const cleaned = compactOpenApi(entry, RAW.has(key));

    if (cleaned === undefined) continue;

    if (!KEEP.has(key)) {
      if (cleaned === '') continue;
      if (Array.isArray(cleaned) && !cleaned.length) continue;
      if (
        !RAW.has(key) &&
        cleaned !== null &&
        typeof cleaned === 'object' &&
        !Array.isArray(cleaned) &&
        !Object.keys(cleaned).length
      ) {
        continue;
      }
    }

    built[key] = cleaned;
  }

  return built as T;
}
