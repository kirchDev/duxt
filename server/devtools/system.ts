import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { duxtDefaults, mergeDuxtConfig } from '../../app/utils/duxt-config';
import { code, context, dim, escape, row, table, tag } from './shell';

/**
 * The panels about the machinery around the content: the merged config, the
 * message catalogues, Content's download cache and the redirects that shipped.
 *
 * Each answers a question whose answer exists only as a side effect somewhere —
 * inside a defu call, across seven JSON files, in a directory nobody opens, in
 * a route-rule table generated at build time.
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
export function configPanel(): string {
  const { duxt } = useAppConfig() as { duxt?: Partial<DuxtConfig> };
  const consumer = (duxt ?? {}) as unknown as Record<string, unknown>;
  const merged = mergeDuxtConfig(consumer, duxtDefaults) as unknown as Record<
    string,
    unknown
  >;

  const rows: string[] = [];
  collect(
    merged,
    consumer,
    duxtDefaults as unknown as Record<string, unknown>,
    '',
    rows
  );

  return `<div class="note">Arrays are replaced whole, objects merge key by key. A row marked ${tag(
    'build'
  )} was computed by <code>modules/config.ts</code> and is not written anywhere.</div>${table(
    ['Key', 'From', 'Value'],
    rows
  )}`;
}

const BUILT = new Set(['resolvedSources']);

function collect(
  merged: Record<string, unknown>,
  consumer: Record<string, unknown> | undefined,
  defaults: Record<string, unknown> | undefined,
  prefix: string,
  rows: string[]
): void {
  for (const [key, value] of Object.entries(merged)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const inConsumer = consumer ? key in consumer : false;
    const inDefaults = defaults ? key in defaults : false;

    // Recurse only through plain objects: an array is a single value here, by
    // the same rule the merge itself follows.
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      inDefaults &&
      inConsumer
    ) {
      collect(
        value as Record<string, unknown>,
        consumer?.[key] as Record<string, unknown>,
        defaults?.[key] as Record<string, unknown>,
        path,
        rows
      );
      continue;
    }

    const origin = BUILT.has(key)
      ? tag('build')
      : inConsumer
        ? tag('consumer', 'ok')
        : tag('layer', 'muted');

    rows.push(row([code(path), origin, preview(value)]));
  }
}

function preview(value: unknown): string {
  if (Array.isArray(value)) {
    return `${dim(`${value.length} entries`)} ${code(truncate(JSON.stringify(value)))}`;
  }

  if (value && typeof value === 'object') {
    return code(truncate(JSON.stringify(value)));
  }

  return code(String(value));
}

const truncate = (value: string, length = 160) =>
  value.length > length ? `${value.slice(0, length)}…` : value;

/* -------------------------------------------------------------------------- */
/* i18n                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Message keys per locale, against the base language.
 *
 * Seven locales and one JSON file per namespace make drift a matter of time,
 * and i18n answers a missing key by printing the key — so a gap shows up as a
 * label reading `duxt.nav.open` on a page nobody opened in that language.
 */
export function i18nPanel(): string {
  const root = join(context.layerDir, 'i18n/locales');

  let dirs: string[];
  try {
    dirs = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return '<div class="note">No <code>i18n/locales</code> directory in the layer.</div>';
  }

  const keysOf = (dir: string) => {
    const keys = new Set<string>();
    const namespaces = join(root, dir, 'duxt');

    let files: string[];
    try {
      files = readdirSync(namespaces).filter((file) => file.endsWith('.json'));
    } catch {
      return keys;
    }

    for (const file of files) {
      try {
        flatten(
          JSON.parse(readFileSync(join(namespaces, file), 'utf8')) as unknown,
          '',
          keys
        );
      } catch {
        keys.add(`${file}: unreadable`);
      }
    }

    return keys;
  };

  const base = dirs.includes('en') ? 'en' : dirs[0];
  if (!base) return '<div class="note">No locales found.</div>';

  const baseKeys = keysOf(base);

  const rows = dirs.map((dir) => {
    const keys = dir === base ? baseKeys : keysOf(dir);
    const missing = [...baseKeys].filter((key) => !keys.has(key));
    const extra = [...keys].filter((key) => !baseKeys.has(key));

    // A locale file may deliberately hold only its overrides — pt-BR against
    // pt-PT is the case in this repo — so "missing" is a fact, not a verdict.
    return row([
      code(dir) + (dir === base ? ` ${tag('base')}` : ''),
      String(keys.size),
      missing.length
        ? `${tag(String(missing.length), 'warn')} ${dim(truncate(missing.join(', '), 120))}`
        : tag('complete', 'ok'),
      extra.length
        ? `${tag(String(extra.length), 'warn')} ${dim(truncate(extra.join(', '), 120))}`
        : dim('—')
    ]);
  });

  const served = context.locales.length
    ? `<p class="hint">Served locales: ${context.locales.map((locale) => code(locale)).join(' ')}${context.defaultLocale ? `, default ${code(context.defaultLocale)}` : ''}.</p>`
    : '';

  return `${served}${table(['Directory', 'Keys', 'Missing vs base', 'Not in base'], rows)}`;
}

function flatten(node: unknown, prefix: string, out: Set<string>): void {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    if (prefix) out.add(prefix);
    return;
  }

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    flatten(value, prefix ? `${prefix}.${key}` : key, out);
  }
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Content's download cache, and a way to drop one entry.
 *
 * A stale directory here cost real time once: a tag was fetched as a branch,
 * failed, and the half-written `github.com-<owner>-<repo>-<ref>` folder kept
 * answering for the fixed config until it was deleted by hand. Nothing in the
 * build mentions this directory, so nothing suggests the fix.
 */
export function cachePanel(message?: string): string {
  let entries: { name: string; size: number; modified: Date }[];

  try {
    entries = readdirSync(context.dataDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const path = join(context.dataDir, entry.name);
        return {
          name: entry.name,
          size: sizeOf(path),
          modified: statSync(path).mtime
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
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

  return `${note}<p class="hint">${escape(context.dataDir)}</p>${table(
    ['Entry', 'Size', 'Modified', ''],
    rows
  )}<div class="note">Dropping an entry makes the next build download it again. Content keys a directory by repository <em>and</em> ref, so an entry for a ref you have renamed is never reused and never cleaned up either.</div>`;
}

function sizeOf(path: string): number {
  let total = 0;

  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    total += entry.isDirectory() ? sizeOf(child) : statSync(child).size;
  }

  return total;
}

const megabytes = (bytes: number) =>
  bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} kB`;

/* -------------------------------------------------------------------------- */
/* Redirects                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The route rules `redirectFrom` produced, read back out of the running server.
 *
 * Read rather than recomputed on purpose: a rule that was generated and a rule
 * that shipped are different claims, and only the second one redirects anybody.
 */
export function redirectsPanel(): string {
  const rules = (
    useRuntimeConfig() as {
      nitro?: { routeRules?: Record<string, { redirect?: unknown }> };
    }
  ).nitro?.routeRules;

  if (!rules) {
    return '<div class="note">Nitro exposed no route rules to read.</div>';
  }

  const rows = Object.entries(rules)
    .filter(([, rule]) => rule?.redirect)
    .map(([from, rule]) => {
      const redirect = rule.redirect as
        | string
        | { to?: string; statusCode?: number };

      return row([
        code(from),
        code(typeof redirect === 'string' ? redirect : (redirect.to ?? '?')),
        typeof redirect === 'string'
          ? dim('302')
          : escape(String(redirect.statusCode ?? 302))
      ]);
    });

  return `${table(['From', 'To', 'Status'], rows)}<div class="note">One rule per prefix a page is served under — the repository segment, the version segment and every locale — because an old URL was bookmarked under exactly one of them and nothing says which.</div>`;
}
