import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import config from '../nuxt.config';

/**
 * THE LAYER MUST NOT SHIP A DEPRECATED CONTENT OPTION TO ITS CONSUMERS.
 *
 * `content.experimental` is the one Content option block duxt sets on behalf of
 * every site that extends it, and it is the block Content itself churns: the
 * flag that picks the SQLite driver has already been renamed once, from
 * `nativeSqlite` to `sqliteConnector: 'native'`. A deprecation inside an
 * application is a line someone can see and fix; the same deprecation inside a
 * published layer reaches a consumer who cannot see where it comes from and
 * cannot turn it off. So the rule is not "use the current name today" — it is
 * "hold the layer to whatever the installed Content declares current".
 *
 * READ OUT OF CONTENT'S OWN DECLARATIONS, not restated here. `module.d.mts`
 * carries a JSDoc block per option, and a renamed option keeps its old key
 * alive with an `@deprecated` tag pointing at the replacement — which is
 * exactly the signal this file needs and the only one that stays true across a
 * version bump. Resolved from `tests/` the way `highlight-langs.test.ts`
 * resolves grammars: with pnpm's isolated node-linker, asking from the wrong
 * place answers about the wrong copy.
 *
 * Why `native` in particular, and what replaces it if it ever goes: the
 * "No SQLite driver is installed" bullet in `CLAUDE.md`, and
 * `docs/2.concepts/11.databases.md` for the consumer-facing version.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentEntry = createRequire(import.meta.url).resolve('@nuxt/content');
const declarations = readFileSync(
  join(dirname(contentEntry), 'module.d.mts'),
  'utf8'
);

/**
 * The `experimental` block of `ModuleOptions`, as a key → JSDoc map.
 *
 * A regex over a brace-matched slice rather than a TypeScript parser: the only
 * question asked of the text is "which doc comment sits above which key", and
 * pulling the compiler in to answer it would cost more than the coupling is
 * worth. The guard tests below fail loudly if the shape ever moves, which is
 * the failure mode a hand-rolled parse actually has.
 */
function experimentalDocs(source: string): Map<string, string> {
  const start = source.indexOf('experimental?: {');

  if (start === -1) {
    throw new Error(
      '@nuxt/content no longer declares `experimental?:` in module.d.mts'
    );
  }

  let depth = 0;
  let end = -1;

  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;

      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error('the `experimental?:` block in module.d.mts is unbalanced');
  }

  const docs = new Map<string, string>();
  const entry = /\/\*\*([\s\S]*?)\*\/\s*([A-Za-z_$][\w$]*)\??\s*:/g;

  for (const match of source.slice(start, end).matchAll(entry)) {
    docs.set(match[2]!, match[1]!);
  }

  return docs;
}

/** `>=24`, `^24.1.0`, `24.2.3` → `[24, 1, 0]`. */
function floorOf(range: string): [number, number, number] {
  const match = /(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(range);

  if (!match) throw new Error(`no version floor in ${range}`);

  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

/** Negative when `a` is the older version, positive when it is the newer. */
function compare(
  a: [number, number, number],
  b: [number, number, number]
): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

const docs = experimentalDocs(declarations);
const experimental = config.content?.experimental ?? {};

describe('the layer’s SQLite connector', () => {
  it('reads the option docs out of the installed Content', () => {
    // A parse that silently found nothing would make every assertion below
    // pass over an empty map — the one failure mode this file cannot report on
    // its own. `nativeSqlite` is the option this repo used to set and the one
    // Content deprecated, so it doubles as proof the `@deprecated` tag is
    // actually visible to the filter further down.
    expect(docs.size).toBeGreaterThan(1);
    expect(docs.has('sqliteConnector')).toBe(true);
    expect(docs.get('nativeSqlite')).toContain('@deprecated');
  });

  it('asks Content for the driver that needs no package installed', () => {
    // Content's default is `better-sqlite3`, a native addon built through
    // node-gyp — which `pnpm-workspace.yaml` refuses outright. `native` is
    // Node's own `node:sqlite`, and it is what makes the layer installable
    // without a compiler.
    expect(experimental.sqliteConnector).toBe('native');
  });

  it('names a connector Content actually accepts', () => {
    // `sqliteConnector` is a string union, and a value outside it does not
    // throw: `findBestSqliteAdapter` falls through to auto-detection and lands
    // on better-sqlite3. A typo here is a silent return to the addon.
    const union = /type SQLiteConnector\s*=\s*([^;]+);/.exec(declarations)?.[1];
    const accepted = [...(union ?? '').matchAll(/'([^']+)'/g)].map(
      (match) => match[1]
    );

    expect(accepted).toContain('native');
    expect(accepted).toContain(experimental.sqliteConnector);
  });

  it('sets no option Content has deprecated', () => {
    // The durable half. Whatever `experimental` grows to hold, none of it may
    // be a name Content is already pointing away from — the next rename is
    // caught here rather than in a consumer's build log.
    const deprecated = Object.keys(experimental).filter((option) =>
      (docs.get(option) ?? '').includes('@deprecated')
    );

    expect(deprecated).toEqual([]);
  });

  it('pins a Node the native connector is available on', () => {
    // `sqliteConnector: 'native'` is a request, not a guarantee: Content only
    // honours it when `node:sqlite` is importable, and otherwise drops back to
    // auto-detection. The floor that makes the request stick is Content's own,
    // read out of the same doc comment rather than copied into this file.
    const required = /requires Node\.js >=\s*([\d.]+)/.exec(
      docs.get('sqliteConnector') ?? ''
    )?.[1];

    expect(required, 'Content still states a Node floor').toBeTruthy();

    const engines = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
      .engines.node;

    expect(
      compare(floorOf(engines), floorOf(required!)),
      `engines.node ${engines} is below Content's ${required}`
    ).toBeGreaterThanOrEqual(0);
  });
});
