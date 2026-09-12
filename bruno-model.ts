/**
 * The shape a Bruno collection is read into — types only, and no imports.
 *
 * Split from `bruno-parse.ts` for the reason `openapi-model.ts` is split from
 * `openapi-parse.ts`: the parser reads a directory and the theme's components
 * need the model without it, and a file with no imports at all can be read from
 * the build, the tests and a `.vue` file in the browser bundle alike.
 *
 * WHAT IS DELIBERATELY NOT HERE, because a Bruno collection carries it and this
 * layer refuses to publish it:
 *
 * - **Environments.** `environments/*.bru` routinely holds hosts, tokens and
 *   keys. They are never read, never parsed and never rendered — see
 *   `BRUNO_UNPUBLISHED` in `bruno-parse.ts`.
 * - **Scripts and tests.** `script:pre-request`, `script:post-response`,
 *   `tests` and `assert` are executable code written against Bruno's own
 *   runtime. A documentation site neither runs them nor prints them; a request
 *   records only THAT it has them, so a reader downloading the collection knows
 *   the page is not the whole of it.
 * - **Credentials in an auth block.** `auth:bearer { token: … }` is a live
 *   secret as often as it is a placeholder. The MODE survives — a reader needs
 *   to know the endpoint wants a bearer token — and the value never does.
 *
 * A Bruno collection is a CLIENT ARTEFACT, and the model says so rather than
 * pretending otherwise: there are no response schemas here, no reusable
 * components and no statement of what a field means, because a `.bru` file
 * holds none of those. Inventing them is what the issue behind this type
 * rejected `bruno → openapi` conversion for.
 */

/** One `key: value` line of a dictionary block. */
export interface DuxtBrunoEntry {
  name: string;
  value: string;
  /** Written with a leading `~`: kept in the file, not sent. */
  disabled?: boolean;
  /**
   * The value was withheld because the name says it carries a credential.
   *
   * See `redactEntry` in `bruno-parse.ts`. The entry still appears — an
   * endpoint wanting an `Authorization` header is exactly what a reference has
   * to say — and the value is replaced rather than the line dropped.
   */
  redacted?: boolean;
}

/** A query or path parameter. */
export interface DuxtBrunoParam extends DuxtBrunoEntry {
  in: 'query' | 'path';
}

/** A request body, in whichever of Bruno's spellings the file used. */
export interface DuxtBrunoBody {
  /** `json`, `text`, `xml`, `sparql`, `graphql`, `form-urlencoded`, … */
  type: string;
  /** A text body, verbatim. */
  text?: string;
  /** A GraphQL body's variables block, verbatim. */
  variables?: string;
  /** A form body, as its fields. */
  entries?: DuxtBrunoEntry[];
  /**
   * The fence language for a text body, as Shiki reads it.
   *
   * Resolved at parse time rather than in the component: the page is Markdown,
   * so the language has to be in the fence the parser writes.
   */
  language?: string;
}

/** What a request authenticates with — the MODE, never the credential. */
export interface DuxtBrunoAuth {
  /** `bearer`, `basic`, `apikey`, `oauth2`, `inherit`, `none`, … */
  mode: string;
}

/** One request: a `.bru` file that is not `folder.bru` or `collection.bru`. */
export interface DuxtBrunoRequest {
  /** `meta.name`, falling back to the file name. */
  name: string;
  /** The file this came from, relative to the collection root. */
  file: string;
  /** `meta.seq`, which is how Bruno orders a folder's requests. */
  seq?: number;
  /** Upper-cased, e.g. `GET`. */
  method: string;
  /**
   * The URL as written, `{{variable}}` placeholders intact — minus whatever
   * the redaction rule withholds. See `redactUrl` in `bruno-parse.ts`.
   */
  url: string;
  /**
   * Something was taken out of the URL: userinfo, or a credential's value.
   *
   * Said on the model so the page can say it too. A blank `?api_key=` reads as
   * a parameter the collection forgot to fill in unless the page states that it
   * was withheld, which is the same thing the table's badge does for a header.
   */
  urlRedacted?: boolean;
  /** `meta.type`: `http` or `graphql`. */
  kind: string;
  params: DuxtBrunoParam[];
  headers: DuxtBrunoEntry[];
  auth?: DuxtBrunoAuth;
  body?: DuxtBrunoBody;
  /** The `docs` block, as the CommonMark it is. */
  docs?: string;
  /** It has a `script:*` block — said, never shown, never run. */
  script?: boolean;
  /** It has a `tests` or `assert` block — said, never shown, never run. */
  tests?: boolean;
  /**
   * What the try-it client is given, when the site opted into one.
   *
   * An `DuxtOpenApiOperation` rather than a shape of its own, and that is the
   * whole of this type's answer to "is the client reusable": the existing
   * client takes an operation, servers and security, so a Bruno request is
   * ADAPTED to that at build time and the component is reused unchanged. A
   * second client would be a second place for a credential to be mishandled.
   *
   * Absent when the site declared no `tryIt`, or when the URL still holds a
   * variable the site did not declare a value for — a send button that cannot
   * build a real URL is worse than none.
   */
  tryIt?: DuxtBrunoTryIt;
}

/** The request, resolved against the site's own public configuration. */
export interface DuxtBrunoTryIt {
  /** The public base URL the request is sent to. */
  server: string;
  /** The path under it, `{{variables}}` already substituted. */
  path: string;
}

/** A folder: a directory, plus whatever `folder.bru` said about it. */
export interface DuxtBrunoFolder {
  /** `meta.name`, falling back to the directory name. */
  name: string;
  /** The directory, relative to the collection root. */
  dir: string;
  /** `meta.seq`, which is how Bruno orders folders. */
  seq?: number;
  /** The folder's own `docs` block. */
  docs?: string;
  folders: DuxtBrunoFolder[];
  requests: DuxtBrunoRequest[];
}

/** A whole collection, as the pages are built from it. */
export interface DuxtBrunoCollection {
  /** `bruno.json`'s `name`, falling back to the declared path. */
  name: string;
  /** `bruno.json`'s `version`, where it has one. */
  version?: string;
  /** `collection.bru`'s `docs` block. */
  docs?: string;
  /** Collection-level headers, which every request inherits. */
  headers: DuxtBrunoEntry[];
  /** Collection-level auth mode, which `auth: inherit` resolves to. */
  auth?: DuxtBrunoAuth;
  folders: DuxtBrunoFolder[];
  /** Requests at the collection root, outside any folder. */
  requests: DuxtBrunoRequest[];
  /** How many environment files were found and deliberately not read. */
  environments: number;
  /** What the parser carried on past — see `DuxtSectionContext.warn`. */
  warnings: string[];
}
