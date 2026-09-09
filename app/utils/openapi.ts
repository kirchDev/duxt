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
 * Which way a body is travelling.
 *
 * `readOnly` and `writeOnly` are statements about direction, and until this
 * existed the code had no word for it: one function guessed "request" and the
 * rest ignored the question, so a response example dropped the `id` and
 * `createdAt` a response is mostly about.
 */
export type DuxtOpenApiDirection = 'request' | 'response';

/**
 * Whether a property cannot appear in a body travelling this way.
 *
 * The rule OpenAPI states, and the reason `required` alone is not enough to go
 * on: a `readOnly` property belongs to responses, a `writeOnly` one to
 * requests, and either may still be listed under `required` — where the
 * requirement then applies only in the direction the property exists in.
 */
export function excluded(
  schema: DuxtOpenApiSchema,
  direction: DuxtOpenApiDirection
): boolean {
  return direction === 'request'
    ? schema.readOnly === true
    : schema.writeOnly === true;
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
  schema: DuxtOpenApiSchema | undefined,
  direction: DuxtOpenApiDirection,
  depth = 0
): unknown {
  if (!schema || schema.circular || depth > MAX_DEPTH) return null;

  if (schema.examples?.length) return schema.examples[0];
  if (schema.default !== undefined) return schema.default;
  if (schema.const !== undefined) return schema.const;
  if (schema.enum?.length) return schema.enum[0];

  const branch = schema.oneOf?.[0] ?? schema.anyOf?.[0];
  if (branch) return openApiExampleValue(branch, direction, depth + 1);

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
        // `readOnly` and `writeOnly` say WHICH WAY a field travels, and an
        // example is a value rather than documentation — so a field that cannot
        // appear in this direction is not in the example either. At every depth:
        // this used to hold at the top level only, so a nested `id` the server
        // assigns landed in the body the try-it client prefilled.
        if (excluded(property.schema, direction)) continue;

        built[property.name] = openApiExampleValue(
          property.schema,
          direction,
          depth + 1
        );
      }

      for (const merged of schema.allOf ?? []) {
        Object.assign(
          built,
          openApiExampleValue(merged, direction, depth + 1) as Record<
            string,
            unknown
          >
        );
      }

      return built;
    }
    case 'array':
      return [openApiExampleValue(schema.items, direction, depth + 1)];
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
/** What kind of control a value of this schema should be typed into. */
export interface DuxtOpenApiField {
  /** `select` when the document names the whole set of legal values. */
  control: 'text' | 'number' | 'select';
  /** The values a `select` offers, as the strings the request will carry. */
  options?: string[];
  /** Attributes the box takes verbatim — `type`, `step`, `min`, `max`. */
  attrs: Record<string, string>;
}

/**
 * The box a parameter is typed into, chosen from what the document says it is.
 *
 * Every try-it client the layer has drawn until now offered one text box for
 * every parameter, and a text box is the honest control only where the document
 * says nothing: `limit: integer, min 1, max 100` is a number with a range, and
 * an `enum` is a list — typing either by hand is a chance to send something the
 * endpoint will reject, on a form whose whole purpose is to reach it.
 *
 * The VALUE STAYS A STRING whatever the control is, because that is what goes
 * on the wire: a query, a path segment and a header are text, and parsing them
 * into numbers here would only be undone one function later in
 * `openApiQueryString`. What the type buys is the box, the stepper and the
 * range — not a different representation.
 *
 * Pure, and here rather than in the component, for the reason everything else
 * in this file is: a mapping written inline in a template can only be checked
 * by clicking through every operation of every document.
 */
export function openApiField(schema?: DuxtOpenApiSchema): DuxtOpenApiField {
  const types = schema?.types ?? [];

  // The document naming the values wins over the type it names them as: an
  // `enum` of integers is still a list to pick from, not a number to type.
  if (schema?.enum?.length) {
    return {
      control: 'select',
      options: schema.enum.map((value) =>
        typeof value === 'string' ? value : String(value)
      ),
      attrs: {}
    };
  }

  if (types.includes('boolean')) {
    return { control: 'select', options: ['true', 'false'], attrs: {} };
  }

  if (types.includes('integer') || types.includes('number')) {
    const { minimum, maximum, multipleOf } = schema?.constraints ?? {};

    return {
      control: 'number',
      attrs: {
        type: 'number',
        // An integer steps by one unless the document says otherwise; a
        // `number` takes anything, or the browser's own validation rejects a
        // decimal in a field it decided was whole.
        step: String(multipleOf ?? (types.includes('integer') ? 1 : 'any')),
        ...(minimum === undefined ? {} : { min: String(minimum) }),
        ...(maximum === undefined ? {} : { max: String(maximum) })
      }
    };
  }

  return { control: 'text', attrs: {} };
}

/** One property of a request body, as the box it is typed into. */
export interface DuxtOpenApiBodyField {
  name: string;
  required: boolean;
  description?: string;
  field: DuxtOpenApiField;
}

/** Why a body cannot be drawn as a form, when it cannot. */
export type DuxtOpenApiBodyReason =
  | 'not-object'
  | 'empty'
  | 'nested'
  | 'variants'
  | 'unresolved'
  | 'dynamic';

export type DuxtOpenApiBodyForm =
  | { expressible: true; fields: DuxtOpenApiBodyField[] }
  | { expressible: false; reason: DuxtOpenApiBodyReason };

/** The scalar types a single box can carry a value of. */
const SCALARS = new Set(['string', 'number', 'integer', 'boolean', 'null']);

/**
 * Can one box hold a value of this schema?
 *
 * An UNTYPED property counts, and that is the interesting half. A schema that
 * names no type at all constrains nothing — OpenAPI's `any` — and refusing the
 * whole form over one of them is how a body of five strings and one `any` ended
 * up with no form at all. It gets a text box like any other unconstrained
 * value, and the JSON view is one click away for the reader who needs to put an
 * object in it. A schema that names no type but DOES carry properties, items or
 * a combinator is a shape rather than a value, and still disqualifies.
 */
function scalar(schema: DuxtOpenApiSchema): boolean {
  if (schema.enum?.length) return true;

  const types = schema.types ?? [];
  if (types.length) return types.every((type) => SCALARS.has(type));

  return !(
    schema.properties?.length ||
    schema.items ||
    schema.prefixItems?.length ||
    schema.oneOf?.length ||
    schema.anyOf?.length ||
    schema.allOf?.length ||
    schema.additionalProperties
  );
}

/**
 * Can this request body be drawn as a form, and out of which boxes?
 *
 * THE ANSWER IS OFTEN NO, and saying so is the whole point. A JSON body is a
 * tree: `oneOf` between two shapes, an array of objects, a `$ref` that loops or
 * leaves the document, a map with no fixed keys. A form covers the flat object
 * — which is most request bodies most of the time — and a form that silently
 * could not express the rest would be worse than no form at all, because the
 * reader would not learn that what they typed is not what would be sent. So
 * every case it cannot draw comes back named, and the client shows the editor
 * instead.
 *
 * `null` is allowed among a property's types rather than disqualifying it: a
 * nullable string is a string with one more legal value, and 3.0's `nullable`
 * reaches the model as exactly that — see `DuxtOpenApiSchema.types`.
 */
export function openApiBodyForm(
  schema?: DuxtOpenApiSchema
): DuxtOpenApiBodyForm {
  if (!schema) return { expressible: false, reason: 'not-object' };

  // A reference the build could not follow has no properties to read, and one
  // that loops would draw a form of itself.
  //
  // NOT `schema.ref`, which was the bug: the parser keeps `ref` on a reference
  // it DID follow, beside the name and the properties it resolved — so testing
  // it refused every body that is a named component, which is very nearly all
  // of them. `circular` and `external` are the two that actually mean "there is
  // nothing here to read".
  if (schema.circular || schema.external) {
    return { expressible: false, reason: 'unresolved' };
  }

  if (schema.oneOf?.length || schema.anyOf?.length || schema.allOf?.length) {
    return { expressible: false, reason: 'variants' };
  }

  if (schema.types?.length && !schema.types.includes('object')) {
    return { expressible: false, reason: 'not-object' };
  }

  // A map with no fixed keys: the form would offer the properties it happens to
  // know and quietly forbid every other key the endpoint accepts. `false` is
  // the opposite statement — no other keys exist — and a form says that fine.
  if (schema.additionalProperties) {
    return { expressible: false, reason: 'dynamic' };
  }

  /**
   * A `readOnly` property is not part of a REQUEST, and this form is only ever
   * a request.
   *
   * The document says who fills a field in, and the form used to ignore it: an
   * `id` the server assigns got a box, and — where the schema also listed it
   * under `required`, which is the ordinary way to describe such a field — a
   * red marker demanding the reader invent one. Dropped before the checks
   * below, not after: a read-only property that is itself an object must not
   * cost the whole form its `nested` verdict for a field the request never
   * carries.
   */
  const properties = (schema.properties ?? []).filter(
    (property) => !excluded(property.schema, 'request')
  );

  if (!properties.length) return { expressible: false, reason: 'empty' };

  if (properties.some((property) => !scalar(property.schema))) {
    return { expressible: false, reason: 'nested' };
  }

  return {
    expressible: true,
    fields: properties.map((property) => ({
      name: property.name,
      required: property.required,
      description: property.schema.description,
      field: openApiField(property.schema)
    }))
  };
}

/**
 * The form's boxes, filled from a JSON body.
 *
 * Read from the TEXT rather than kept beside it, so the two views are one
 * value: whatever the reader last typed in the editor is what the form opens
 * on, and a body the form cannot account for is not silently dropped — see
 * `openApiBodyJson`, which writes back only what the form owns.
 */
export function openApiBodyValues(
  fields: DuxtOpenApiBodyField[],
  json: string
): Record<string, string> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    parsed = undefined;
  }

  const source =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    fields.map((entry) => {
      const value = source[entry.name];

      return [
        entry.name,
        value === undefined || value === null
          ? ''
          : typeof value === 'string'
            ? value
            : String(value)
      ];
    })
  );
}

/**
 * The form's boxes, back as a JSON body.
 *
 * An empty OPTIONAL box is left out rather than sent as `""`: a form has no way
 * to say "absent" other than by being empty, and an endpoint told a field is
 * the empty string was told something. A required one stays, because dropping
 * it would send a body the document says is invalid without saying so.
 *
 * The TYPE decides the JSON type, which is the half a textarea cannot help
 * with: `20` typed into a number box is a number, `true` in a boolean box is a
 * boolean, and both were strings a moment ago.
 */
export function openApiBodyJson(
  fields: DuxtOpenApiBodyField[],
  values: Record<string, string>,
  json = ''
): string {
  // WHAT THE FORM DOES NOT OWN SURVIVES. A body may carry keys the document
  // never described — a reader typed one in the JSON view, or the server takes
  // more than it says — and rebuilding the object from the boxes alone deleted
  // every one of them the moment a box was touched. The form edits the body it
  // was given; it does not replace it.
  let body: Record<string, unknown> = {};

  try {
    const parsed: unknown = JSON.parse(json);

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      body = { ...(parsed as Record<string, unknown>) };
    }
  } catch {
    // Not an object yet; the boxes are the whole body.
  }

  for (const entry of fields) {
    const raw = values[entry.name] ?? '';

    if (raw === '' && !entry.required) {
      delete body[entry.name];
      continue;
    }

    body[entry.name] = openApiBodyValue(entry, raw);
  }

  return openApiJson(body);
}

/** One box's text, as the JSON value its schema calls for. */
function openApiBodyValue(entry: DuxtOpenApiBodyField, raw: string): unknown {
  if (entry.field.control === 'number') {
    const value = Number(raw);

    // Not a number after all — the box is empty, or holds something the
    // browser let through. Sent as written rather than as `NaN`, which is not
    // JSON at all and would be serialised as `null`.
    return raw !== '' && Number.isFinite(value) ? value : raw;
  }

  if (entry.field.options?.length === 2 && entry.field.options[0] === 'true') {
    return raw === 'true';
  }

  return raw;
}

/** One key a body may carry, as the editor offers and checks it. */
export interface DuxtOpenApiKey {
  name: string;
  required: boolean;
  /** The one word `openApiTypeLabel` would print, for the completion list. */
  type: string;
  description?: string;
  /** The values the document allows, where it named them. */
  enum?: string[];
}

/**
 * The keys a request body's TOP LEVEL may carry, for the editor.
 *
 * Narrower than `openApiBodyForm` on purpose, and the two answer different
 * questions. The form asks "can I draw every one of these as a box?" and gives
 * up on the first nested object; completion has no such requirement — offering
 * `address` and letting the reader type the object themselves is strictly
 * better than offering nothing, and marking a misspelt key is useful whatever
 * its value looks like.
 *
 * Empty where the top level is not a fixed set of keys at all: an array, a
 * `oneOf` between two shapes, a reference that could not be followed, or a map
 * with no fixed keys. Empty means the editor still lints the JSON itself and
 * simply has nothing to add — never that it starts inventing.
 */
export function openApiBodyKeys(schema?: DuxtOpenApiSchema): DuxtOpenApiKey[] {
  // `ref` is deliberately not among these — see `openApiBodyForm`.
  if (!schema || schema.circular || schema.external) return [];
  if (schema.oneOf?.length || schema.anyOf?.length || schema.allOf?.length) {
    return [];
  }
  if (schema.types?.length && !schema.types.includes('object')) return [];

  return (schema.properties ?? []).map((property) => ({
    name: property.name,
    /**
     * `readOnly` UNDOES `required` HERE, because this list describes a request.
     *
     * OpenAPI is explicit: where a property is `readOnly` and also listed under
     * `required`, the requirement applies to the response only. A request must
     * not carry it at all. Without this the editor demanded a field it had
     * itself, correctly, left out of the body it prefilled — the linter and the
     * default contradicting each other inside one component.
     *
     * It stays in the list rather than being dropped: the document DOES
     * describe it, so a reader who types it deserves completion and not the
     * "not described by this document" warning that removing it would produce.
     */
    required: property.required && !excluded(property.schema, 'request'),
    type: openApiTypeLabel(property.schema),
    description: property.schema.description,
    enum: property.schema.enum?.length
      ? property.schema.enum.map((value) =>
          typeof value === 'string' ? value : String(value)
        )
      : undefined
  }));
}

/** One thing wrong with a body, at the character where it is wrong. */
export interface DuxtOpenApiBodyProblem {
  from: number;
  to: number;
  severity: 'error' | 'warning';
  message: string;
}

/**
 * What the document says is wrong with this body — MISSING and UNKNOWN keys.
 *
 * Only the two the top level can be sure about, and each is a different kind
 * of claim: a required key that is not there is an `error`, because the
 * document says the request is invalid without it; a key the document does not
 * list is a `warning`, because a server is free to accept more than it
 * describes and this client exists partly to find out that it does.
 *
 * Positions are found by SEARCHING THE TEXT rather than by a parser with
 * offsets: `JSON.parse` throws away where anything was, and pulling in a
 * position-preserving parser for two rules would be a dependency for a
 * squiggle. The search is for the quoted key at the top nesting level, which is
 * the only place these rules apply anyway — a nested `"name"` is somebody
 * else's key and is skipped by the depth count.
 */
export function openApiBodyProblems(
  json: string,
  keys: DuxtOpenApiKey[]
): DuxtOpenApiBodyProblem[] {
  if (!keys.length || !json.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    // Not JSON yet. The editor's own linter is already saying so, and a second
    // opinion on a document that does not parse is noise.
    return [];
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];

  const body = parsed as Record<string, unknown>;
  const known = new Set(keys.map((key) => key.name));
  const problems: DuxtOpenApiBodyProblem[] = [];

  for (const name of Object.keys(body)) {
    if (known.has(name)) continue;

    const at = topLevelKey(json, name);
    if (!at) continue;

    problems.push({
      ...at,
      severity: 'warning',
      message: `"${name}" is not described by this document.`
    });
  }

  const missing = keys
    .filter((key) => key.required && !(key.name in body))
    .map((key) => key.name);

  if (missing.length) {
    const open = json.indexOf('{');

    problems.push({
      from: Math.max(open, 0),
      to: Math.max(open, 0) + 1,
      severity: 'error',
      message: `Required by this document: ${missing.join(', ')}.`
    });
  }

  return problems;
}

/** Where a key sits, counted at the top level of the object only. */
function topLevelKey(
  json: string,
  name: string
): { from: number; to: number } | undefined {
  const needle = JSON.stringify(name);

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < json.length; index += 1) {
    const character = json[index]!;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (inString) {
      if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') {
      // A string opening exactly here, one level in, and spelled like the key.
      if (depth === 1 && json.startsWith(needle, index)) {
        return { from: index, to: index + needle.length };
      }

      inString = true;
      continue;
    }

    if (character === '{' || character === '[') depth += 1;
    else if (character === '}' || character === ']') depth -= 1;
  }

  return undefined;
}

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
