import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { context } from './context';
import type { CacheEntry, LocaleFile, RedirectRule } from './render/system';
import {
  renderCache,
  renderConfig,
  renderI18n,
  renderRedirects
} from './render/system';

/**
 * What the panels about the machinery read: the merged config, the message
 * catalogues, Content's download cache and the redirects that shipped.
 *
 * Each answers a question whose answer exists only as a side effect somewhere —
 * inside a defu call, across seven JSON files, in a directory nobody opens, in
 * a route-rule table generated at build time. This half does the reading;
 * `render/system.ts` turns it into tables.
 */

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

/** The merged config, with the side of the merge each value came from. */
export function configPanel(): string {
  const { duxt } = useAppConfig() as { duxt?: Partial<DuxtConfig> };

  return renderConfig((duxt ?? {}) as unknown as Record<string, unknown>);
}

/* -------------------------------------------------------------------------- */
/* i18n                                                                       */
/* -------------------------------------------------------------------------- */

/** Every message key of every locale file the layer ships. */
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

  const files: LocaleFile[] = dirs.map((dir) => ({
    dir,
    keys: [...keysOf(join(root, dir, 'duxt'))]
  }));

  return renderI18n({
    files,
    locales: context.locales,
    defaultLocale: context.defaultLocale
  });
}

function keysOf(namespaces: string): Set<string> {
  const keys = new Set<string>();

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

/** Content's download cache, and a way to drop one entry. */
export function cachePanel(message?: string): string {
  let entries: CacheEntry[] | undefined;

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
    entries = undefined;
  }

  return renderCache({ dataDir: context.dataDir, entries, message });
}

function sizeOf(path: string): number {
  let total = 0;

  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    total += entry.isDirectory() ? sizeOf(child) : statSync(child).size;
  }

  return total;
}

/* -------------------------------------------------------------------------- */
/* Redirects                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Every redirect the server ships, and which of them the layer wrote.
 *
 * Read rather than recomputed on purpose: a rule that was generated and a rule
 * that shipped are different claims, and only the second one redirects anybody.
 * Reading them back means reading EVERY module's, so `modules/redirects.ts`
 * records which paths are its own beside them — nothing in a route rule says
 * who wrote it.
 */
export function redirectsPanel(): string {
  const config = useRuntimeConfig() as {
    nitro?: { routeRules?: Record<string, { redirect?: unknown }> };
    duxt?: { redirects?: string[] };
  };

  const rules = config.nitro?.routeRules;
  if (!rules) return renderRedirects();

  const ours = new Set(config.duxt?.redirects ?? []);

  const redirects: RedirectRule[] = Object.entries(rules)
    .filter(([, rule]) => rule?.redirect)
    .map(([from, rule]) => {
      const redirect = rule.redirect as
        | string
        | { to?: string; statusCode?: number };

      return {
        from,
        to: typeof redirect === 'string' ? redirect : (redirect.to ?? '?'),
        status:
          typeof redirect === 'string' ? '302' : (redirect.statusCode ?? 302),
        mine: ours.has(from)
      };
    });

  return renderRedirects(redirects);
}
