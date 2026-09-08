/**
 * The arithmetic the reference pages do, out of the components that draw them.
 *
 * A schema's type as a word, a worked example derived from a schema, a server
 * URL with its variables filled in, the request the try-it client is about to
 * send and the `curl` that would send the same thing. Every one of those is a
 * pure function of the model, and every one of them was the kind of thing that
 * ends up written inline in a template where it can only be checked by
 * clicking — the same argument `version-paths.ts` makes about prefixes, and the
 * same answer.
 *
 * Type-only import, so nothing here drags the YAML parser into the browser
 * bundle: `openapi-model.ts` exists for exactly this reason.
 */
import type {
  DuxtOpenApiOperation,
  DuxtOpenApiParameter,
  DuxtOpenApiSchema,
  DuxtOpenApiServer
} from '../../openapi-model';

/** How deep an example is derived before it is called recursive enough. */
const MAX_DEPTH = 6;

/**
 * A schema's type, as the one word a table cell has room for.
 *
 * The `$ref`'s NAME is deliberately not part of it — a schema drawn as `Pet` is
 * drawn as `Pet` beside its type, not instead of it, so a reader sees both the
 * component and what it is made of.
 */
export function openApiTypeLabel(schema?: DuxtOpenApiSchema): string {
  if (!schema) return 'any';

  const declared = schema.types ?? [];
  const nullable = declared.includes('null');
  const types = declared.filter((type) => type !== 'null');

  const written = types.map((type) =>
    type === 'array' ? `array<${openApiTypeLabel(schema.items)}>` : type
  );

  if (!written.length) {
    if (schema.properties?.length) written.push('object');
    else if (schema.items)
      written.push(`array<${openApiTypeLabel(schema.items)}>`);
    else if (schema.oneOf ?? schema.anyOf ?? schema.allOf) return 'any';
    else if (nullable) return 'null';
    else return 'any';
  }

  return written.join(' | ') + (nullable ? ' | null' : '');
}

/** The constraints a schema states, as keys the interface translates. */
export function openApiConstraints(
  schema?: DuxtOpenApiSchema
): { key: string; value: string }[] {
  const constraints = schema?.constraints;
  if (!constraints) return [];

  const entries: { key: string; value: string }[] = [];

  for (const [key, value] of Object.entries(constraints)) {
    if (value === undefined) continue;
    entries.push({ key, value: String(value) });
  }

  return entries;
}

/**
 * A worked example of what a schema describes.
 *
 * The document's own example WINS wherever it has one — `examples`, then
 * `default`, then `const`, then the first `enum` member — and only what is left
 * is derived from the type. A reference that invents a body where the author
 * wrote one is a reference nobody trusts twice.
 *
 * A schema the parser cut as `circular` stops here rather than being expanded:
 * `Pet.friends: Pet[]` would otherwise derive until the stack gave out.
 */
export function openApiExampleValue(
  schema?: DuxtOpenApiSchema,
  depth = 0
): unknown {
  if (!schema || schema.circular || depth > MAX_DEPTH) return null;

  if (schema.examples?.length) return schema.examples[0];
  if (schema.default !== undefined) return schema.default;
  if (schema.const !== undefined) return schema.const;
  if (schema.enum?.length) return schema.enum[0];

  const branch = schema.oneOf?.[0] ?? schema.anyOf?.[0];
  if (branch) return openApiExampleValue(branch, depth + 1);

  const declared = (schema.types ?? []).filter((type) => type !== 'null');
  const type =
    declared[0] ??
    (schema.properties?.length
      ? 'object'
      : schema.items
        ? 'array'
        : schema.allOf?.length
          ? 'object'
          : undefined);

  switch (type) {
    case 'object': {
      const built: Record<string, unknown> = {};

      for (const property of schema.properties ?? []) {
        // A field the server fills in is not a field a request carries, and
        // the example is what the try-it client starts from.
        if (property.schema.readOnly && depth === 0) continue;
        built[property.name] = openApiExampleValue(property.schema, depth + 1);
      }

      for (const merged of schema.allOf ?? []) {
        Object.assign(
          built,
          openApiExampleValue(merged, depth + 1) as Record<string, unknown>
        );
      }

      return built;
    }
    case 'array':
      return [openApiExampleValue(schema.items, depth + 1)];
    case 'boolean':
      return true;
    case 'integer':
    case 'number':
      return numberExample(schema);
    case 'null':
      return null;
    case 'string':
      return stringExample(schema);
    default:
      return null;
  }
}

/**
 * A number the schema would actually accept.
 *
 * Zero is the obvious placeholder and is wrong more often than it looks: a
 * `status` bounded to 400-599, or a `page` bounded to 1 upwards, rejects it —
 * so the example a reader copies into the try-it client fails validation
 * before it reaches anything interesting.
 */
function numberExample(schema: DuxtOpenApiSchema): number {
  const { minimum, exclusiveMinimum, maximum, exclusiveMaximum } =
    schema.constraints ?? {};

  if (minimum !== undefined) return minimum;
  if (exclusiveMinimum !== undefined) return exclusiveMinimum + 1;
  if (maximum !== undefined && maximum < 0) return maximum;
  if (exclusiveMaximum !== undefined && exclusiveMaximum <= 0) {
    return exclusiveMaximum - 1;
  }

  return 0;
}

/** A placeholder that looks like what the format asks for. */
function stringExample(schema: DuxtOpenApiSchema): string {
  switch (schema.format) {
    case 'date':
      return '2026-01-01';
    case 'date-time':
      return '2026-01-01T09:00:00Z';
    case 'time':
      return '09:00:00';
    case 'uuid':
      return '00000000-0000-4000-8000-000000000000';
    case 'email':
      return 'name@example.org';
    case 'uri':
    case 'url':
      return 'https://example.org';
    case 'hostname':
      return 'example.org';
    case 'ipv4':
      return '192.0.2.1';
    case 'ipv6':
      return '2001:db8::1';
    case 'byte':
      return 'ZHV4dA==';
    case 'binary':
      return '<binary>';
    case 'password':
      return '••••••••';
    default:
      // NOT the `pattern`, tempting as it is: a regular expression is a
      // description of the shape, not a value of it, and it would land in the
      // request body the try-it client sends.
      return 'string';
  }
}

/**
 * A server's URL with its variables substituted.
 *
 * A template left unfilled is a URL the try-it client cannot send to and a
 * reader cannot copy, so an unanswered variable falls back to the document's
 * own default rather than staying `{stage}`.
 */
export function openApiServerUrl(
  server?: DuxtOpenApiServer,
  values: Record<string, string> = {}
): string {
  if (!server) return '';

  return server.url.replaceAll(/\{([^{}]+)\}/g, (whole, name: string) => {
    const declared = server.variables?.find((entry) => entry.name === name);

    return values[name] ?? declared?.default ?? whole;
  });
}

/**
 * The one key a parameter's answer is filed under.
 *
 * OpenAPI identifies a parameter by the PAIR `(name, in)`, not by its name:
 * `id` in the path and `id` in the query are two parameters, and a document is
 * allowed to declare both. Keying the try-it client's boxes on the name alone
 * therefore sent one answer to both places, substituted a query parameter into
 * a path template, and emitted duplicate `v-for` keys — so the state, the
 * request builder and the form's own `label`/`id` pairs all key on this.
 *
 * The join is unambiguous because `in` is a closed set of four words and none
 * of them is a prefix of another: no `(name, in)` pair can spell the string
 * another pair spells.
 */
export function openApiParameterKey(
  parameter: Pick<DuxtOpenApiParameter, 'name' | 'in'>
): string {
  return `${parameter.in}-${parameter.name}`;
}

/**
 * The path with its path parameters substituted, unanswered ones left visible.
 *
 * A `{…}` template in a path can only ever be the PATH parameter of that name —
 * so the lookup names that location rather than trusting the name alone, and a
 * query parameter called `id` can no longer substitute itself into `/pets/{id}`
 * and send the request somewhere else.
 */
export function openApiFillPath(
  path: string,
  values: Record<string, string> = {}
): string {
  return path.replaceAll(/\{([^{}]+)\}/g, (whole, name: string) => {
    const value = values[openApiParameterKey({ name, in: 'path' })];

    return value ? encodeURIComponent(value) : whole;
  });
}

/**
 * A query string from the parameters the reader filled in.
 *
 * An empty value is left OUT rather than sent as `?limit=`: an empty query
 * parameter is a different request from an absent one, and the one the reader
 * meant is the absent one. `allowEmptyValue` is how a document says otherwise.
 */
export function openApiQueryString(
  parameters: DuxtOpenApiParameter[],
  values: Record<string, string>
): string {
  const query = new URLSearchParams();

  for (const parameter of parameters) {
    if (parameter.in !== 'query') continue;

    const value = values[openApiParameterKey(parameter)] ?? '';
    if (!value && !parameter.allowEmptyValue) continue;

    query.append(parameter.name, value);
  }

  const written = query.toString();

  return written ? `?${written}` : '';
}

export interface DuxtOpenApiRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

/** The request an operation, a server and the reader's answers add up to. */
export function openApiRequest(
  operation: Pick<DuxtOpenApiOperation, 'method' | 'path' | 'parameters'>,
  server: string,
  values: Record<string, string>,
  headers: Record<string, string> = {},
  body?: string
): DuxtOpenApiRequest {
  const parameters = operation.parameters ?? [];

  const path = openApiFillPath(operation.path, values);
  const query = openApiQueryString(parameters, values);

  const sent: Record<string, string> = { ...headers };

  for (const parameter of parameters) {
    if (parameter.in !== 'header') continue;

    const value = values[openApiParameterKey(parameter)];
    if (value) sent[parameter.name] = value;
  }

  // A COOKIE PARAMETER IS DELIBERATELY NOT SENT. `Cookie` is a forbidden header
  // name for `fetch`: a browser drops it with no error, no rejection and
  // nothing in the console. Building it anyway produced a request that quietly
  // lacked the credential while the `curl` sample rendered from this same
  // object showed it present — the one place a reader would look to confirm.
  // The client says the cookie cannot be set from a page instead, so what is
  // sent and what is shown are the same request again.

  return {
    method: operation.method.toUpperCase(),
    // Trailing slash on the server against leading slash on the path: one of
    // the two has to go, or every request is sent to a doubled separator.
    url: `${server.replace(/\/+$/, '')}${path}${query}`,
    headers: sent,
    body
  };
}

/**
 * The same request as a `curl` line.
 *
 * Single-quoted with the shell's own escape for an embedded quote, because
 * every part of this — a URL, a header, a JSON body — comes from a document
 * this layer did not write.
 */
export function openApiCurl(request: DuxtOpenApiRequest): string {
  const lines = [`curl -X ${request.method} ${shell(request.url)}`];

  for (const [name, value] of Object.entries(request.headers)) {
    lines.push(`  -H ${shell(`${name}: ${value}`)}`);
  }

  if (request.body) lines.push(`  -d ${shell(request.body)}`);

  return lines.join(' \\\n');
}

/** The same request as a `fetch` call. */
export function openApiFetch(request: DuxtOpenApiRequest): string {
  const options: string[] = [`  method: ${JSON.stringify(request.method)}`];

  if (Object.keys(request.headers).length) {
    options.push(
      `  headers: ${JSON.stringify(request.headers, null, 2).split('\n').join('\n  ')}`
    );
  }

  if (request.body) options.push(`  body: ${JSON.stringify(request.body)}`);

  return [
    `await fetch(${JSON.stringify(request.url)}, {`,
    options.join(',\n'),
    '});'
  ].join('\n');
}

/** One argument, safe inside a POSIX shell's single quotes. */
function shell(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

/** Which family a response status belongs to, for the colour it is drawn in. */
export function openApiStatusKind(
  status: string
): 'info' | 'success' | 'redirect' | 'client' | 'server' | 'default' {
  const first = status.trim()[0];

  switch (first) {
    case '1':
      return 'info';
    case '2':
      return 'success';
    case '3':
      return 'redirect';
    case '4':
      return 'client';
    case '5':
      return 'server';
    default:
      return 'default';
  }
}

/** A value as the JSON a code sample shows. */
export function openApiJson(value: unknown): string {
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value, null, 2) ?? '';
  } catch {
    // A document may carry anything, `BigInt` and a cyclic example included.
    return String(value);
  }
}
