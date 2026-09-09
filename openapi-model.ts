/**
 * The shape an OpenAPI document is read into — types only, and no imports.
 *
 * Split from `openapi-parse.ts` for the reason `sources-resolve.ts` is split
 * from `sources.ts`, one step further down: the PARSER imports a YAML reader,
 * and the theme's components need the model without it. A file with no imports
 * at all can be read from either side — the build, the tests and a `.vue` file
 * in the browser bundle — and there is then no way for a value import to drag
 * a parser into the client by accident.
 *
 * ONE SPELLING FOR TWO DIALECTS. 3.0 and 3.1 say the same things differently:
 * `nullable: true` against a `null` in the type list, a boolean
 * `exclusiveMinimum` against a numeric one, a singular `example` against a
 * list. Every one of those is reduced by the parser to the 3.1 spelling before
 * it reaches this model, so nothing that renders a schema branches on the
 * version of the document it came from.
 *
 * EMPTY IS ABSENT, everywhere but one place. `compactOpenApi` runs over the
 * parser's own result, so a list with nothing in it and a map with no keys are
 * dropped rather than carried — which is why so many collections here are
 * optional. That is not defensive typing: it is the shape the model actually
 * has, in the tests, in the props a page writes and in the components that read
 * them, and a required field the payload does not carry would be a lie the
 * compiler could not catch. The exception is `security`, where an empty list is
 * an operation saying it needs no authentication at all — see `KEEP` in
 * `openapi-parse.ts`.
 */

/** A server the API is reachable at, variables unexpanded. */
export interface DuxtOpenApiServer {
  url: string;
  description?: string;
  variables?: DuxtOpenApiServerVariable[];
}

export interface DuxtOpenApiServerVariable {
  name: string;
  default?: string;
  enum?: string[];
  description?: string;
}

/** One named example, from `examples` or promoted out of a singular `example`. */
export interface DuxtOpenApiExample {
  name: string;
  summary?: string;
  description?: string;
  value?: unknown;
  /** An example the document points at rather than carries. */
  externalValue?: string;
}

/** The constraint keywords, gathered so a renderer draws them in one row. */
export interface DuxtOpenApiConstraints {
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
}

/** One property of an object schema. */
export interface DuxtOpenApiProperty {
  name: string;
  required: boolean;
  schema: DuxtOpenApiSchema;
}

/**
 * A schema, in ONE spelling.
 *
 * `types` is always a list, because 3.1 allows one and 3.0's `nullable` is the
 * same statement written differently — normalising here is what keeps
 * `nullable` out of every component that draws a type.
 */
export interface DuxtOpenApiSchema {
  /** The component name this came through, when it came through a `$ref`. */
  name?: string;
  /** The `$ref` this schema stands for, when the reference was not followed. */
  ref?: string;
  /** True when following the reference again would loop. */
  circular?: boolean;
  /** True when the reference leaves this document and cannot be followed. */
  external?: boolean;
  types?: string[];
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  const?: unknown;
  enum?: unknown[];
  examples?: unknown[];
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  constraints?: DuxtOpenApiConstraints;
  properties?: DuxtOpenApiProperty[];
  /** `false` forbids further properties; a schema constrains them. */
  additionalProperties?: DuxtOpenApiSchema | false;
  items?: DuxtOpenApiSchema;
  /** 3.1's positional array schemas. */
  prefixItems?: DuxtOpenApiSchema[];
  oneOf?: DuxtOpenApiSchema[];
  anyOf?: DuxtOpenApiSchema[];
  /** Only what could NOT be merged — see `mergeAllOf`. */
  allOf?: DuxtOpenApiSchema[];
  not?: DuxtOpenApiSchema;
  discriminator?: { propertyName: string; mapping?: Record<string, string> };
  externalDocs?: DuxtOpenApiExternalDocs;
}

export interface DuxtOpenApiExternalDocs {
  url: string;
  description?: string;
}

export interface DuxtOpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  description?: string;
  required: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  schema?: DuxtOpenApiSchema;
  examples?: DuxtOpenApiExample[];
  /** A parameter serialised as a body rather than a scalar. */
  content?: DuxtOpenApiMediaType[];
}

export interface DuxtOpenApiMediaType {
  /** The media type itself, e.g. `application/json`. */
  type: string;
  schema?: DuxtOpenApiSchema;
  examples?: DuxtOpenApiExample[];
  encoding?: DuxtOpenApiEncoding[];
}

export interface DuxtOpenApiEncoding {
  property: string;
  contentType?: string;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  headers?: DuxtOpenApiHeader[];
}

export interface DuxtOpenApiHeader {
  name: string;
  description?: string;
  required: boolean;
  deprecated?: boolean;
  schema?: DuxtOpenApiSchema;
  examples?: DuxtOpenApiExample[];
}

export interface DuxtOpenApiBody {
  description?: string;
  required: boolean;
  content?: DuxtOpenApiMediaType[];
}

export interface DuxtOpenApiLink {
  name: string;
  operationId?: string;
  operationRef?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  requestBody?: unknown;
  server?: DuxtOpenApiServer;
}

export interface DuxtOpenApiResponse {
  /** A status code, a wildcard like `4XX`, or `default`. */
  status: string;
  description?: string;
  headers?: DuxtOpenApiHeader[];
  content?: DuxtOpenApiMediaType[];
  links?: DuxtOpenApiLink[];
}

export type DuxtOpenApiSecuritySchemeType =
  | 'apiKey'
  | 'http'
  | 'oauth2'
  | 'openIdConnect'
  | 'mutualTLS';

export interface DuxtOpenApiOAuthFlow {
  /** `authorizationCode`, `implicit`, `password` or `clientCredentials`. */
  name: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes?: { name: string; description?: string }[];
}

export interface DuxtOpenApiSecurityScheme {
  /** The key it is declared under in `components.securitySchemes`. */
  key: string;
  type: DuxtOpenApiSecuritySchemeType;
  description?: string;
  /** `apiKey`: the parameter name and where it goes. */
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  /** `http`: the authentication scheme, e.g. `bearer` or `basic`. */
  scheme?: string;
  /**
   * A value the try-it client fills the field with, from `x-duxt-example`.
   *
   * An EXTENSION, because OpenAPI has no field for it: a security scheme
   * describes where a credential goes, never what one looks like. A demo
   * endpoint that answers to any token — or to one known token — can say so
   * here, and a reader presses Send without first inventing a value.
   *
   * A published document, so this is a value that may be public and nothing
   * else. Real credentials belong nowhere near a spec file.
   */
  example?: string;
  bearerFormat?: string;
  flows?: DuxtOpenApiOAuthFlow[];
  openIdConnectUrl?: string;
}

/** One scheme inside an alternative, with the scopes that alternative asks for. */
export interface DuxtOpenApiSecurityRequirement {
  key: string;
  scopes?: string[];
  scheme?: DuxtOpenApiSecurityScheme;
}

/**
 * The security a request must satisfy: alternatives of conjunctions.
 *
 * `security` is a LIST of objects, and the two levels mean different things —
 * any one entry suffices, and every scheme inside one entry is required. An
 * empty inner list is the document saying "no authentication", which is how an
 * operation opts out of a global requirement.
 */
export type DuxtOpenApiSecurity = DuxtOpenApiSecurityRequirement[][];

export interface DuxtOpenApiCallbackOperation {
  /** The runtime expression the callback is sent to. */
  expression: string;
  method: string;
  summary?: string;
  description?: string;
  requestBody?: DuxtOpenApiBody;
  responses?: DuxtOpenApiResponse[];
}

export interface DuxtOpenApiCallback {
  name: string;
  operations?: DuxtOpenApiCallbackOperation[];
}

export interface DuxtOpenApiOperation {
  /**
   * A path operation or a 3.1 webhook.
   *
   * A webhook is the same object under a name instead of a URL — the reader is
   * the server rather than the client — so it renders through the same page and
   * says which it is rather than getting a shape of its own.
   */
  kind: 'operation' | 'webhook';
  method: string;
  /** The path template, or — for a webhook — the name it is declared under. */
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  deprecated: boolean;
  tags?: string[];
  externalDocs?: DuxtOpenApiExternalDocs;
  servers?: DuxtOpenApiServer[];
  /** Absent when the operation inherits the document's own requirement. */
  security?: DuxtOpenApiSecurity;
  parameters?: DuxtOpenApiParameter[];
  requestBody?: DuxtOpenApiBody;
  responses?: DuxtOpenApiResponse[];
  callbacks?: DuxtOpenApiCallback[];
  /**
   * Samples the API's own author wrote, from `x-codeSamples`.
   *
   * The extension is Redocly's and is what an OpenAPI document already carries
   * where somebody has written samples by hand. They are STATIC — they cannot
   * follow the reader's edits in the try-it client — and they are worth showing
   * anyway: the person who owns the API knows its idioms, and a build-time
   * sample is highlighted with the full grammar set and so costs a reader
   * nothing.
   */
  codeSamples?: DuxtOpenApiCodeSample[];
}

/** One hand-written sample from `x-codeSamples`. */
export interface DuxtOpenApiCodeSample {
  /** The `lang` field, used as the Shiki id and as the group's name. */
  lang: string;
  /** The client, where the author named one. */
  label?: string;
  source: string;
}

export interface DuxtOpenApiTag {
  name: string;
  description?: string;
  externalDocs?: DuxtOpenApiExternalDocs;
  /** True for the group 3.1 webhooks are collected into. */
  webhooks?: boolean;
  operations?: DuxtOpenApiOperation[];
}

export interface DuxtOpenApiInfo {
  title: string;
  version?: string;
  summary?: string;
  description?: string;
  termsOfService?: string;
  contact?: { name?: string; url?: string; email?: string };
  license?: { name?: string; identifier?: string; url?: string };
}

export interface DuxtOpenApiSpec {
  /** The dialect the document declared, normalised to its minor line. */
  dialect: '3.0' | '3.1';
  info: DuxtOpenApiInfo;
  servers?: DuxtOpenApiServer[];
  externalDocs?: DuxtOpenApiExternalDocs;
  /** The document-wide requirement an operation inherits. */
  security?: DuxtOpenApiSecurity;
  securitySchemes?: DuxtOpenApiSecurityScheme[];
  tags?: DuxtOpenApiTag[];
  /** Everything the reader was not given, in the words the build prints. */
  warnings: string[];
}

/**
 * The groups the layer names when the document does not.
 *
 * Untranslated, and for the same reason a generated section's `label` is a
 * plain string rather than a `DuxtText`: a tag's name is its URL segment, and a
 * translated text is not a stable URL. The alternative — a translated heading
 * over a segment fixed in English — is a page whose address and whose title
 * disagree in six of seven languages.
 */
export const DUXT_OPENAPI_DEFAULT_TAG = 'Endpoints';

/** The tag 3.1 webhooks are filed under. See above for why it is not translated. */
export const DUXT_OPENAPI_WEBHOOKS_TAG = 'Webhooks';
