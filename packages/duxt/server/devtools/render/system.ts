import { duxtDefaults, mergeDuxtConfig } from '../../../app/utils/duxt-config';
import {
  code,
  dim,
  escape,
  filter,
  json,
  row,
  stat,
  stats,
  table,
  tag
} from '../shell';

/**
 * The panels about the machinery around the content: the merged config, the
 * message catalogues, Content's download cache and the redirects that shipped.
 *
 * Each answers a question whose answer exists only as a side effect somewhere —
 * inside a defu call, across seven JSON files, in a directory nobody opens, in
 * a route-rule table generated at build time. The reading of those side effects
 * lives in `../system.ts`; this half turns what was read into a table.
 */

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The merged config, with the side of the merge each value came from.
 *
 * `mergeDuxtConfig` replaces arrays and merges objects, which is the subtlest
 * rule in the layer: a consumer's `navigation` is the navigation, but its
 * `footer.note` leaves `footer.columns` alone. "Why is duxt's entry still in my
 * navbar" takes one look here instead of a session.
 */
export function renderConfig(consumer: Record<string, unknown>): string {
  const merged = mergeDuxtConfig(
    consumer as unknown as Partial<DuxtConfig>,
    duxtDefaults
  ) as unknown as Record<string, unknown>;

  const rows: string[] = [];
  const counted: Origins = { consumer: 0, layer: 0, build: 0 };
  collect(
    merged,
    consumer,
    duxtDefaults as unknown as Record<string, unknown>,
    '',
    rows,
    counted
  );

  const summary = stats([
    stat(rows.length, 'keys'),
    stat(counted.consumer, 'from the site', 'ok'),
    stat(counted.layer, 'from the layer'),
    stat(counted.build, 'computed')
  ]);

  return `${summary}<div class="note">Arrays are replaced whole, objects merge key by key. A row marked ${tag(
    'build'
  )} was computed by <code>modules/config.ts</code> and is written nowhere.</div>${filter(
    'Filter keys'
  )}${table(['Key', 'From', 'Value'], rows)}`;
}

const BUILT = new Set(['resolvedSources']);

/**
 * Tallied while the rows are built, not counted back out of them.
 *
 * The first version of this figure filtered the rendered rows for the string
 * `>consumer<`, which is a search of the config's own VALUES as much as of its
 * origin badges — a label reading "consumer" would have counted itself.
 */
interface Origins {
  consumer: number;
  layer: number;
  build: number;
}

/**
 * A value the merge descends into: an object, and neither an array nor null.
 *
 * Checked on BOTH sides before recursing, not just for the merged value. The
 * two sides of a key need not have the same shape — `aside.title` is a
 * translation key in the layer's defaults and a per-locale object in a site
 * that translates it — and the earlier version tested only whether the KEY was
 * present, then walked into the string with `in`, which throws. A panel that
 * crashes on a translated string is a panel nobody can open on the site that
 * needs it most.
 */
const branches = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function collect(
  merged: Record<string, unknown>,
  consumer: Record<string, unknown> | undefined,
  defaults: Record<string, unknown> | undefined,
  prefix: string,
  rows: string[],
  counted: Origins
): void {
  for (const [key, value] of Object.entries(merged)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const inConsumer = branches(consumer) ? key in consumer : false;

    // Recurse only where both sides are objects: an array is a single value
    // here, by the same rule the merge itself follows, and a key that is an
    // object on one side and a string on the other is a REPLACED value — which
    // is precisely what the reader opened this panel to see.
    if (
      branches(value) &&
      branches(consumer?.[key]) &&
      branches(defaults?.[key])
    ) {
      collect(
        value as Record<string, unknown>,
        consumer?.[key] as Record<string, unknown>,
        defaults?.[key] as Record<string, unknown>,
        path,
        rows,
        counted
      );
      continue;
    }

    const kind = BUILT.has(key) ? 'build' : inConsumer ? 'consumer' : 'layer';
    counted[kind] += 1;

    const origin =
      kind === 'build'
        ? tag('build')
        : kind === 'consumer'
          ? tag('consumer', 'ok')
          : tag('layer', 'muted');

    rows.push(row([code(path), origin, json(value)]));
  }
}

/* -------------------------------------------------------------------------- */
/* i18n                                                                       */
/* -------------------------------------------------------------------------- */

export interface LocaleFile {
  /** The directory under `i18n/locales`, which is the locale's own name. */
  dir: string;
  /** Every message key it defines, flattened to `duxt.nav.open`. */
  keys: string[];
}

export interface I18nData {
  files: LocaleFile[];
  /** The locales the site actually serves, which is a different list. */
  locales: string[];
  defaultLocale?: string;
}

/**
 * Message keys per locale, against the base language.
 *
 * Seven locales and one JSON file per namespace make drift a matter of time,
 * and i18n answers a missing key by printing the key — so a gap shows up as a
 * label reading `duxt.nav.open` on a page nobody opened in that language.
 */
export function renderI18n({
  files,
  locales,
  defaultLocale
}: I18nData): string {
  if (!files.length) return '<div class="note">No locales found.</div>';

  const base = files.find((file) => file.dir === 'en') ?? files[0]!;
  const baseKeys = new Set(base.keys);

  const compared = files.map((file) => {
    const keys = new Set(file.keys);

    return {
      dir: file.dir,
      keys,
      missing: [...baseKeys].filter((key) => !keys.has(key)),
      extra: [...keys].filter((key) => !baseKeys.has(key))
    };
  });

  const rows = compared.map(({ dir, keys, missing, extra }) =>
    // A locale file may deliberately hold only its overrides — pt-BR against
    // pt-PT is the case in this repo — so "missing" is a fact, not a verdict.
    row([
      code(dir) + (dir === base.dir ? ` ${tag('base')}` : ''),
      String(keys.size),
      missing.length
        ? `${tag(String(missing.length), 'warn')} ${dim(truncate(missing.join(', '), 120))}`
        : tag('complete', 'ok'),
      extra.length
        ? `${tag(String(extra.length), 'warn')} ${dim(truncate(extra.join(', '), 120))}`
        : dim('—')
    ])
  );

  const served = locales.length
    ? `<p class="hint">Served locales: ${locales.map((locale) => code(locale)).join(' ')}${defaultLocale ? `, default ${code(defaultLocale)}` : ''}.</p>`
    : '';

  const gaps = compared.filter(
    (entry) => entry.missing.length || entry.extra.length
  ).length;

  const summary = stats([
    stat(files.length, 'locale files'),
    stat(baseKeys.size, `keys in ${base.dir}`),
    stat(gaps, 'with a gap', gaps ? 'warn' : 'ok')
  ]);

  return `${summary}${served}${table(
    ['Directory', 'Keys', 'Missing vs base', 'Not in base'],
    rows
  )}`;
}

const truncate = (value: string, length: number) =>
  value.length > length ? `${value.slice(0, length)}…` : value;

/* -------------------------------------------------------------------------- */
/* Cache                                                                      */
/* -------------------------------------------------------------------------- */

export interface CacheEntry {
  name: string;
  /** Bytes on disk, summed over the directory. */
  size: number;
  modified: Date;
}

export interface CacheData {
  dataDir: string;
  /** `undefined` when the directory does not exist at all. */
  entries?: CacheEntry[];
  /** What the last drop did, if this render follows one. */
  message?: string;
}

/**
 * Content's download cache, and a way to drop one entry.
 *
 * A stale directory here cost real time once: a tag was fetched as a branch,
 * failed, and the half-written `github.com-<owner>-<repo>-<ref>` folder kept
 * answering for the fixed config until it was deleted by hand. Nothing in the
 * build mentions this directory, so nothing suggests the fix.
 */
export function renderCache({ dataDir, entries, message }: CacheData): string {
  if (!entries) {
    return '<div class="note">Nothing downloaded yet — <code>.data/content</code> does not exist.</div>';
  }

  const rows = entries.map((entry) =>
    row([
      code(entry.name),
      megabytes(entry.size),
      entry.modified.toISOString().replace('T', ' ').slice(0, 16),
      `<form method="post" style="margin:0">
        <input type="hidden" name="drop" value="${escape(entry.name)}">
        <button type="submit">Drop</button>
      </form>`
    ])
  );

  const note = message ? `<div class="note">${escape(message)}</div>` : '';

  const summary = stats([
    stat(entries.length, 'cached sources'),
    stat(
      megabytes(entries.reduce((sum, entry) => sum + entry.size, 0)),
      'on disk'
    )
  ]);

  return `${note}${summary}<p class="hint">${escape(dataDir)}</p>${table(
    ['Entry', 'Size', 'Modified', ''],
    rows,
    'The cache directory exists but holds no source. Nothing remote has been downloaded yet.'
  )}<div class="note">Dropping an entry makes the next build download it again. Content keys a directory by repository <em>and</em> ref, so an entry for a ref you have renamed is never reused and never cleaned up either.</div>`;
}

const megabytes = (bytes: number) =>
  bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} kB`;

/* -------------------------------------------------------------------------- */
/* Redirects                                                                  */
/* -------------------------------------------------------------------------- */

export interface RedirectRule {
  from: string;
  to: string;
  status: number | string;
  /** True for a rule `redirectFrom` generated, false for another module's. */
  mine: boolean;
}

/**
 * The route rules that ship, and which of them are the layer's.
 *
 * Read rather than recomputed on purpose: a rule that was generated and a rule
 * that shipped are different claims, and only the second one redirects
 * anybody. Reading them back means reading EVERY module's — `@nuxtjs/sitemap`
 * puts `/sitemap.xml` in the table on any multi-locale site — so the rules the
 * layer wrote are marked as such, from the list `modules/redirects.ts` records
 * beside them. Nothing in a route rule says who wrote it.
 */
export function renderRedirects(rules?: RedirectRule[]): string {
  if (!rules) {
    return '<div class="note">Nitro exposed no route rules to read.</div>';
  }

  // The layer's own first: they are what this tab is opened for, and on a site
  // with one moved page they would otherwise sit under a module's boilerplate.
  const sorted = [...rules].sort(
    (a, b) => Number(b.mine) - Number(a.mine) || a.from.localeCompare(b.from)
  );

  const rows = sorted.map((rule) =>
    row([
      code(rule.from),
      code(rule.to),
      typeof rule.status === 'string'
        ? dim(rule.status)
        : escape(String(rule.status)),
      rule.mine ? tag('redirectFrom', 'ok') : tag('another module', 'muted')
    ])
  );

  const mine = sorted.filter((rule) => rule.mine).length;

  return `${stats([
    stat(rows.length, 'rules'),
    stat(mine, 'from redirectFrom', mine ? 'ok' : ''),
    stat(rows.length - mine, 'from elsewhere')
  ])}${table(
    ['From', 'To', 'Status', 'Written by'],
    rows,
    'The server shipped no redirect at all — not the layer’s, not a module’s.'
  )}<div class="note">${
    mine
      ? 'One rule per prefix a page is served under — the repository segment, the version segment and every locale — because an old URL was bookmarked under exactly one of them and nothing says which.'
      : 'No page carries <code>redirectFrom</code>, so the layer generated nothing; every rule above belongs to another module.'
  }</div>`;
}
