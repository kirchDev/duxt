/**
 * A Bruno collection, read out of a directory of `.bru` files.
 *
 * THE LANGUAGE. `.bru` is a block format: a name, a `{`, lines until a `}` in
 * the first column. A block is either a DICTIONARY of `key: value` lines — a
 * `~` in front of the key means the line is kept but switched off — or a TEXT
 * block whose contents are a body, a script or a page of Markdown. Which of the
 * two a block is is decided by its name and not by looking at it, because a JSON
 * body's first line is indistinguishable from a dictionary's and guessing would
 * pick the wrong one on `{"a": 1}`.
 *
 * The closing brace is matched in the FIRST COLUMN rather than by counting
 * braces, and that is the format's own rule rather than a shortcut: a JSON body
 * is full of braces, and a counter would end the block in the middle of one.
 *
 * WHAT THIS PARSER REFUSES TO READ is as much of its job as what it reads. A
 * Bruno collection is a working client's state, and three things in it are not
 * documentation:
 *
 * - `environments/` holds hosts, tokens and keys. The files are COUNTED and
 *   never opened, so no code path exists down which a key could reach a page.
 * - `script:*`, `tests` and `assert` are executable code. A request records
 *   THAT it has them; the code is never carried, so it cannot be rendered by a
 *   component written later, and it is never executed.
 * - An `auth:<mode>` block's contents are a credential as often as a
 *   placeholder. The mode is kept, the value is dropped.
 *
 * The same rule is applied by NAME to header and parameter values, which is the
 * one place a live token is written in the open — see `redactEntry`.
 */
import type {
  DuxtBrunoAuth,
  DuxtBrunoBody,
  DuxtBrunoCollection,
  DuxtBrunoEntry,
  DuxtBrunoFolder,
  DuxtBrunoParam,
  DuxtBrunoRequest
} from './bruno-model';
import type { DuxtSectionInput } from './sections-resolve';

/** The manifest at the root of every Bruno collection. */
const MANIFEST = 'bruno.json';
/** The folder-level file, which names and orders a directory. */
const FOLDER = 'folder.bru';
/** The collection-level file: shared headers, auth and docs. */
const COLLECTION = 'collection.bru';

/**
 * The directory this layer counts and never opens.
 *
 * Stated as a constant so the rule is greppable from the model, which cites it.
 */
export const BRUNO_UNPUBLISHED = 'environments';

/** The methods a `.bru` file can name a block after. */
const METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace'
]);

/**
 * Blocks whose contents are TEXT rather than a dictionary.
 *
 * By name, never by inspection: a JSON body's `{` opens a line that looks
 * exactly like a nested dictionary, and a parser that guessed would read
 * `{"a": 1}` as a key called `{"a"`.
 */
const TEXT_BLOCKS = new Set([
  'docs',
  'tests',
  'body',
  'body:json',
  'body:text',
  'body:xml',
  'body:sparql',
  'body:graphql',
  'body:graphql:vars',
  'script:pre-request',
  'script:post-response'
]);

/** A text body's block name, to the language its fence gets. */
const LANGUAGES: Record<string, string> = {
  json: 'json',
  xml: 'xml',
  graphql: 'graphql',
  sparql: 'sparql',
  text: 'text'
};

/**
 * Header and parameter names whose value is withheld.
 *
 * By NAME rather than by looking for something token-shaped, because a token is
 * not shaped like anything: `sk-live-…`, a bare JWT and a base64 basic pair
 * have no form in common, and a heuristic that caught two of them would publish
 * the third. These five names are where a credential is actually written, and
 * an entry under one of them is withheld unless its value is nothing but
 * `{{variable}}` placeholders — which name a secret rather than carrying one.
 */
const CREDENTIAL_NAMES = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
  'apikey',
  'x-auth-token'
]);

/** A value made of nothing but placeholders, whitespace and punctuation. */
const PLACEHOLDER_ONLY = /^(?:[\s\w-]*\{\{[^{}]+\}\})+[\s\w-]*$/;

interface Block {
  name: string;
  lines: string[];
}

/**
 * The whole collection.
 *
 * Walks the input's own listing rather than the filesystem, so the parser is
 * the same code over a real directory and over a map in a test — and so a name
 * this function composes can never reach `readFileSync`.
 */
export function parseBrunoCollection(
  input: DuxtSectionInput
): DuxtBrunoCollection {
  const warnings: string[] = [];
  const files = input.files();

  const manifest = files.includes(MANIFEST)
    ? readManifest(input.read(MANIFEST), warnings)
    : (warnings.push(
        'the collection has no bruno.json, so it may not open in Bruno.'
      ),
      {});

  // COUNTED, NEVER READ. The count is what the page needs — a reader has to be
  // told the collection expects an environment — and opening one is the only
  // way a key could reach a page, so there is no code that does.
  const environments = files.filter((file) =>
    file.startsWith(`${BRUNO_UNPUBLISHED}/`)
  ).length;

  const shared = files.includes(COLLECTION)
    ? blocksOf(input.read(COLLECTION))
    : [];

  const requests = new Map<string, DuxtBrunoRequest[]>();
  const folders = new Map<
    string,
    { name: string; seq?: number; docs?: string }
  >();

  for (const file of files) {
    if (file.startsWith(`${BRUNO_UNPUBLISHED}/`)) continue;
    if (!file.endsWith('.bru')) continue;
    if (file === COLLECTION) continue;

    const dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '';

    if (file.endsWith(`/${FOLDER}`) || file === FOLDER) {
      folders.set(dir, folderMeta(input.read(file)));
      continue;
    }

    const request = parseBruFile(file, input.read(file), warnings);
    if (!request) continue;

    const group = requests.get(dir);
    if (group) group.push(request);
    else requests.set(dir, [request]);
  }

  // Every directory that holds anything is a folder, whether or not it declared
  // a `folder.bru` — a collection that never opened Bruno's folder settings
  // still has folders on disk, and a reference that only showed the declared
  // ones would drop most of it.
  for (const dir of requests.keys()) ancestors(dir, folders);
  for (const dir of Array.from(folders.keys())) ancestors(dir, folders);

  return {
    name: manifest.name ?? input.path,
    version: manifest.version,
    docs: textBlock(shared, 'docs'),
    headers: entries(shared, 'headers').map(redactEntry),
    auth: sharedAuth(shared),
    folders: tree('', folders, requests),
    requests: order(requests.get('') ?? []),
    environments,
    warnings
  };
}

/**
 * One `.bru` request file.
 *
 * Returns nothing rather than an empty request where the file names no method:
 * a `.bru` with no method block is a Bruno artefact of some other kind, and a
 * page for it would be a page about nothing.
 */
export function parseBruFile(
  file: string,
  source: string,
  warnings: string[]
): DuxtBrunoRequest | undefined {
  const blocks = blocksOf(source);
  const meta = dictionary(blocks, 'meta');

  const method = blocks.find((block) => METHODS.has(block.name));

  if (!method) {
    warnings.push(
      `the request "${file}" names no HTTP method, so it was skipped.`
    );
    return undefined;
  }

  const call = toDictionary(method.lines);
  const seq = Number(meta.seq);

  const body = readBody(blocks, call.body);

  return {
    name: meta.name ?? fallbackName(file),
    file,
    ...(Number.isFinite(seq) ? { seq } : {}),
    method: method.name.toUpperCase(),
    url: call.url ?? '',
    kind: meta.type ?? 'http',
    params: [
      ...entries(blocks, 'params:query').map((entry): DuxtBrunoParam => ({
        ...entry,
        in: 'query'
      })),
      ...entries(blocks, 'params:path').map((entry): DuxtBrunoParam => ({
        ...entry,
        in: 'path'
      }))
    ].map(redactEntry),
    headers: entries(blocks, 'headers').map(redactEntry),
    ...(call.auth && call.auth !== 'none' ? { auth: { mode: call.auth } } : {}),
    ...(body ? { body } : {}),
    ...(textBlock(blocks, 'docs') ? { docs: textBlock(blocks, 'docs') } : {}),
    // SAID, NEVER CARRIED. The code is not put on the model at all, so no
    // component written later can render it and nothing can execute it.
    ...(blocks.some((block) => block.name.startsWith('script:'))
      ? { script: true }
      : {}),
    ...(blocks.some(
      (block) => block.name === 'tests' || block.name === 'assert'
    )
      ? { tests: true }
      : {})
  };
}

/**
 * The file's blocks, in order.
 *
 * A block opens on a line that is a name and a `{` and closes on the first
 * later line that is a lone `}` in the FIRST COLUMN — the format's own rule.
 * Counting braces instead would end a JSON body at its first nested object.
 */
function blocksOf(source: string): Block[] {
  const lines = source.split(/\r?\n/);
  const blocks: Block[] = [];

  for (let index = 0; index < lines.length; index++) {
    const open = /^([\w:-]+)\s*\{\s*$/.exec(lines[index]!);
    if (!open) continue;

    const body: string[] = [];

    while (++index < lines.length && !/^\}\s*$/.test(lines[index]!)) {
      body.push(lines[index]!);
    }

    blocks.push({ name: open[1]!, lines: body });
  }

  return blocks;
}

/** A dictionary block's lines, as entries. */
function entries(blocks: Block[], name: string): DuxtBrunoEntry[] {
  const block = blocks.find((candidate) => candidate.name === name);
  if (!block) return [];

  const out: DuxtBrunoEntry[] = [];

  for (const line of block.lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colon = trimmed.indexOf(':');
    if (colon < 1) continue;

    const disabled = trimmed.startsWith('~');
    const key = trimmed.slice(disabled ? 1 : 0, colon).trim();
    const value = trimmed.slice(colon + 1).trim();

    out.push({ name: key, value, ...(disabled ? { disabled: true } : {}) });
  }

  return out;
}

/** A dictionary block as a plain map, for the blocks that are one. */
function dictionary(blocks: Block[], name: string): Record<string, string> {
  return Object.fromEntries(
    entries(blocks, name).map((entry) => [entry.name, entry.value])
  );
}

function toDictionary(lines: string[]): Record<string, string> {
  return dictionary([{ name: 'x', lines }], 'x');
}

/** A text block's contents, dedented by the two spaces the format indents by. */
function textBlock(blocks: Block[], name: string): string | undefined {
  const block = blocks.find(
    (candidate) => candidate.name === name && TEXT_BLOCKS.has(candidate.name)
  );

  if (!block) return undefined;

  // Dedented by the SHALLOWEST non-empty line rather than by a fixed two, so a
  // body whose author indented it four keeps its own internal shape.
  const indents = block.lines
    .filter((line) => line.trim())
    .map((line) => /^\s*/.exec(line)![0].length);

  const strip = indents.length ? Math.min(...indents) : 0;

  const text = block.lines
    .map((line) => line.slice(strip))
    .join('\n')
    .replace(/^\n+|\s+$/g, '');

  return text || undefined;
}

/** The body, in whichever spelling the file used. */
function readBody(
  blocks: Block[],
  declared?: string
): DuxtBrunoBody | undefined {
  const block = blocks.find(
    (candidate) =>
      candidate.name.startsWith('body') &&
      candidate.name !== 'body:graphql:vars'
  );

  if (!block) return undefined;

  const type =
    block.name === 'body' ? (declared ?? 'text') : block.name.slice(5);

  if (
    type === 'form-urlencoded' ||
    type === 'multipart-form' ||
    type === 'file'
  ) {
    return { type, entries: entries(blocks, block.name) };
  }

  const text = textBlock(blocks, block.name);
  const variables = textBlock(blocks, 'body:graphql:vars');

  return {
    type,
    ...(LANGUAGES[type] ? { language: LANGUAGES[type] } : {}),
    ...(text ? { text } : {}),
    ...(variables ? { variables } : {})
  };
}

/**
 * A value withheld where the name says it carries a credential.
 *
 * The ENTRY SURVIVES and the value does not: an endpoint wanting an
 * `Authorization` header is exactly what a reference has to say, and dropping
 * the line would describe a request the collection does not make.
 *
 * A value made only of `{{placeholders}}` is kept, because it names a secret
 * rather than carrying one — and hiding it would take away the one thing the
 * reader needs, which is the name of the variable to set.
 */
function redactEntry<T extends DuxtBrunoEntry>(entry: T): T {
  if (!CREDENTIAL_NAMES.has(entry.name.toLowerCase())) return entry;
  if (!entry.value || PLACEHOLDER_ONLY.test(entry.value)) return entry;

  return { ...entry, value: '', redacted: true };
}

/** `collection.bru`'s `auth { mode: … }`, which `auth: inherit` resolves to. */
function sharedAuth(blocks: Block[]): DuxtBrunoAuth | undefined {
  const mode = dictionary(blocks, 'auth').mode;

  return mode && mode !== 'none' ? { mode } : undefined;
}

/** What a `folder.bru` said about its directory. */
function folderMeta(source: string): {
  name: string;
  seq?: number;
  docs?: string;
} {
  const blocks = blocksOf(source);
  const meta = dictionary(blocks, 'meta');
  const seq = Number(meta.seq);

  return {
    name: meta.name ?? '',
    ...(Number.isFinite(seq) ? { seq } : {}),
    ...(textBlock(blocks, 'docs') ? { docs: textBlock(blocks, 'docs') } : {})
  };
}

/** Every directory on the way to `dir`, so a folder's parents exist too. */
function ancestors(
  dir: string,
  folders: Map<string, { name: string; seq?: number; docs?: string }>
): void {
  if (!dir) return;

  const parts = dir.split('/');

  for (let depth = 1; depth <= parts.length; depth++) {
    const path = parts.slice(0, depth).join('/');
    if (!folders.has(path)) folders.set(path, { name: '' });
  }
}

/** The folders directly under `parent`, recursively, in Bruno's own order. */
function tree(
  parent: string,
  folders: Map<string, { name: string; seq?: number; docs?: string }>,
  requests: Map<string, DuxtBrunoRequest[]>
): DuxtBrunoFolder[] {
  const depth = parent ? parent.split('/').length : 0;

  const children = [...folders.entries()].filter(
    ([dir]) =>
      (parent ? dir.startsWith(`${parent}/`) : dir) &&
      dir.split('/').length === depth + 1
  );

  return sequenced(
    children.map(([dir, meta]) => ({
      name: meta.name || dir.slice(dir.lastIndexOf('/') + 1),
      dir,
      ...(meta.seq === undefined ? {} : { seq: meta.seq }),
      ...(meta.docs ? { docs: meta.docs } : {}),
      folders: tree(dir, folders, requests),
      requests: order(requests.get(dir) ?? [])
    }))
  );
}

/** Requests in `seq` order, falling back to the name. */
function order(requests: DuxtBrunoRequest[]): DuxtBrunoRequest[] {
  return sequenced(requests);
}

/**
 * Bruno's own ordering: `seq` first, then the name.
 *
 * A folder that never had its order set has no `seq` at all, and sorting those
 * by name is what keeps two builds of the same collection identical — the
 * listing they came from is sorted, but a missing `seq` would otherwise leave
 * them in whatever order the walk produced.
 */
function sequenced<T extends { name: string; seq?: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const a = left.seq ?? Number.MAX_SAFE_INTEGER;
    const b = right.seq ?? Number.MAX_SAFE_INTEGER;

    return a === b ? left.name.localeCompare(right.name) : a - b;
  });
}

/** `bruno.json`, as far as this layer reads it. */
function readManifest(
  source: string,
  warnings: string[]
): { name?: string; version?: string } {
  try {
    const json: unknown = JSON.parse(source);

    if (!json || typeof json !== 'object') return {};

    const record = json as Record<string, unknown>;

    return {
      ...(typeof record.name === 'string' ? { name: record.name } : {}),
      ...(typeof record.version === 'string' ? { version: record.version } : {})
    };
  } catch (error) {
    warnings.push(`bruno.json could not be read — ${(error as Error).message}`);
    return {};
  }
}

/** A request's name, where `meta` gave it none: the file, unprefixed. */
function fallbackName(file: string): string {
  return file
    .slice(file.lastIndexOf('/') + 1)
    .replace(/\.bru$/, '')
    .replace(/^\d+[.\-_]/, '');
}
