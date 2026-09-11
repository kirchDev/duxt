import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { duxtManifest } from '../sections-resolve';

/**
 * The MCP endpoint's contract, as a client sees it.
 *
 * Three things are checked, because an agent meets them in this order and each
 * fails differently: DISCOVERY (a tool whose schema is wrong is never called
 * correctly), a SUCCESSFUL call (the shape the answer promises), and an ERROR
 * (an agent handed a dead prefix has to be told what to call instead, not an
 * empty list it reads as "this version has no pages").
 *
 * The tools are Nitro files using auto-imported globals, so the globals are
 * stubbed and the content layer mocked — the same seam `llms-exports` and
 * `raw-markdown` are tested through. What is asserted is SUBSTANCE, never the
 * exact wording: the listing formats are free to change, the contract is not.
 */

interface Row {
  path: string;
  title?: string;
  description?: string;
  rawbody?: string;
}

const database = vi.hoisted(() => ({ pages: {} as Record<string, Row[]> }));

vi.mock('@nuxt/content/nitro', () => ({
  queryCollection: (_event: unknown, name: string) => {
    let wanted: string | undefined;
    const builder = {
      path(value: string) {
        wanted = value;
        return builder;
      },
      select() {
        return builder;
      },
      async all() {
        return database.pages[name] ?? [];
      },
      async first() {
        return (database.pages[name] ?? []).find((row) => row.path === wanted);
      }
    };
    return builder;
  }
}));

/** Two versions of one source in two languages — v2 at `/app`, v1 below it. */
function manifest() {
  return duxtManifest(
    [
      {
        repo: 'acme/app',
        slug: 'app',
        path: 'docs',
        refs: [
          { tag: 'v2', default: true },
          { tag: 'v1', status: 'deprecated' }
        ],
        locales: ['en', 'de']
      }
    ],
    { defaultLocale: 'en' }
  );
}

let sources = manifest();
let i18n = {
  locales: ['en', 'de'],
  defaultLocale: 'en',
  strategy: 'prefix_except_default'
};

const event = {
  context: {
    nuxtI18n: { vueI18nOptions: { fallbackLocale: 'en' as string | string[] } }
  }
};
const extra = { event } as never;

async function tool(name: string) {
  const loaded = await import(`../server/mcp/tools/${name}.ts`);
  return loaded.default as {
    name: string;
    title?: string;
    description?: string;
    annotations?: Record<string, unknown>;
    inputSchema?: Record<string, unknown>;
    handler: (...args: never[]) => Promise<{
      content: { type: string; text: string }[];
      isError?: boolean;
    }>;
  };
}

/** Call a tool the way the SDK does: `(args, extra)`, or `(extra)` with none. */
async function call(name: string, args?: Record<string, unknown>) {
  const definition = await tool(name);
  const result = definition.inputSchema
    ? await definition.handler(...([args ?? {}, extra] as never[]))
    : await definition.handler(...([extra] as never[]));
  return { text: result.content.map((part) => part.text).join('\n'), result };
}

const text = async (name: string, args?: Record<string, unknown>) =>
  (await call(name, args)).text;

beforeEach(() => {
  sources = manifest();
  i18n = {
    locales: ['en', 'de'],
    defaultLocale: 'en',
    strategy: 'prefix_except_default'
  };
  event.context.nuxtI18n.vueI18nOptions.fallbackLocale = 'en';
  vi.stubGlobal('defineMcpTool', (definition: unknown) => definition);
  vi.stubGlobal('useAppConfig', () => ({
    duxt: { title: 'Test docs', resolvedSources: sources }
  }));
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { i18n } }));

  const collection = (prefix: string, locale?: string) =>
    sources.find(
      (source) =>
        source.prefix === prefix &&
        (locale ? source.locale === locale : source.isDefaultLocale)
    )!.collection;

  database.pages = {
    [collection('/app')]: [
      {
        path: '/app/guide',
        title: 'Guide',
        description: 'Getting started',
        rawbody:
          '---\ntitle: Guide\n---\n\nInstall the package, then run the CLI.\n'
      },
      {
        path: '/app/deploying',
        title: 'Deploying',
        description: 'Ship it',
        rawbody: '---\ntitle: Deploying\n---\n\nDeploy to Cloudflare Workers.\n'
      },
      {
        path: '/app/reference',
        title: 'Reference',
        rawbody: 'Every option, in one table.'
      }
    ],
    [collection('/app', 'de')]: [
      {
        path: '/app/guide',
        title: 'Anleitung',
        description: 'Erste Schritte',
        rawbody: '---\ntitle: Anleitung\n---\n\nPaket installieren.\n'
      }
    ],
    [collection('/app/v1')]: [
      {
        path: '/app/v1/guide',
        title: 'Guide (v1)',
        description: 'The old way',
        rawbody: 'Install the old package.'
      }
    ]
  };
});

afterEach(() => vi.unstubAllGlobals());

describe('tool discovery', () => {
  it('advertises four read-only documentation tools', async () => {
    const names = [];
    for (const file of [
      'list-versions',
      'list-pages',
      'search-docs',
      'read-page'
    ]) {
      const definition = await tool(file);
      expect(definition.title, file).toBeTruthy();
      expect(definition.description, file).toBeTruthy();
      expect(definition.annotations?.readOnlyHint, file).toBe(true);
      names.push(definition.name);
    }
    expect(names).toEqual([
      'list_versions',
      'list_pages',
      'search_docs',
      'read_page'
    ]);
  });

  it('bounds discovery and search with a limit and a cursor', async () => {
    for (const file of ['list-pages', 'search-docs']) {
      const schema = (await tool(file)).inputSchema!;
      expect(Object.keys(schema), file).toEqual(
        expect.arrayContaining(['prefix', 'limit', 'cursor'])
      );
    }
    expect((await tool('search-docs')).inputSchema).toHaveProperty('query');
    expect((await tool('read-page')).inputSchema).toHaveProperty('path');
    // No arguments at all: the SDK then hands the handler `extra` directly.
    expect((await tool('list-versions')).inputSchema).toBeUndefined();
  });
});

describe('list_versions', () => {
  it('names every version with its prefix, status and default role', async () => {
    const listing = await text('list-versions');
    expect(listing).toContain('/app');
    expect(listing).toContain('/app/v1');
    expect(listing).toContain('v2');
    expect(listing).toContain('v1');
    expect(listing).toContain('deprecated');
    expect(listing.toLowerCase()).toContain('default');
  });

  it('names the prefix that scopes each language', async () => {
    const listing = await text('list-versions');
    expect(listing).toContain('/de/app');
    expect(listing).toContain('/de/app/v1');
  });

  it('says so when a site publishes no version to choose between', async () => {
    // Every source a generated section: legal for a site whose documentation
    // tree declares `content: false`, and an empty block reads as a fault.
    sources = sources
      .slice(0, 1)
      .map(
        (source) => ({ ...source, generated: { declaration: 'x' } }) as never
      );

    const listing = await text('list-versions');
    expect(listing).toContain('list_pages');
    expect(listing).not.toBe('');
  });
});

describe('list_pages', () => {
  it('lists every version when no prefix is given', async () => {
    const listing = await text('list-pages', { limit: 100 });
    expect(listing).toContain('/app/guide');
    expect(listing).toContain('/app/v1/guide');
  });

  it('scopes to one version, and a nested version is not inside it', async () => {
    const listing = await text('list-pages', { prefix: '/app', limit: 100 });
    expect(listing).toContain('/app/guide');
    expect(listing).not.toContain('/app/v1/guide');
  });

  it('serves a language scope from its own URLs', async () => {
    const listing = await text('list-pages', { prefix: '/de/app', limit: 100 });
    expect(listing).toContain('/de/app/guide');
    expect(listing).toContain('Anleitung');
    // Untranslated pages still exist at the German URL, through the fallback.
    expect(listing).toContain('/de/app/deploying');
  });

  it('bounds the page and resumes from the cursor without gaps', async () => {
    // Three pages under /app, sorted by path: deploying, guide, reference.
    const first = await text('list-pages', { prefix: '/app', limit: 2 });
    expect(first).toContain('- /app/deploying');
    expect(first).toContain('- /app/guide');
    expect(first).not.toContain('- /app/reference');

    const cursor = /nextCursor:\s*(\S+)/.exec(first)?.[1];
    expect(cursor).toBe('/app/guide');

    const second = await text('list-pages', {
      prefix: '/app',
      limit: 2,
      cursor
    });
    expect(second).toContain('- /app/reference');
    expect(second).not.toContain('- /app/deploying');
    expect(second).not.toContain('- /app/guide');
    // The listing ended: no cursor, so an agent knows it has the whole scope.
    expect(second).not.toContain('nextCursor');
  });
});

describe('search_docs', () => {
  it('matches the authored Markdown, not only title and description', async () => {
    const found = await text('search-docs', { query: 'Cloudflare' });
    expect(found).toContain('/app/deploying');
    expect(found).not.toContain('/app/guide');
  });

  it('matches case-insensitively and excerpts around the match', async () => {
    const found = await text('search-docs', { query: 'cloudflare workers' });
    expect(found).toContain('Deploy to Cloudflare Workers');
    // An excerpt, not the page: the frontmatter fence never reaches a reader.
    expect(found).not.toContain('---');
  });

  it('scopes by prefix like list_pages does', async () => {
    const scoped = await text('search-docs', {
      query: 'Install',
      prefix: '/app'
    });
    expect(scoped).toContain('/app/guide');
    expect(scoped).not.toContain('/app/v1/guide');
  });

  it('says so plainly when nothing matches', async () => {
    const found = await call('search-docs', { query: 'nothing here at all' });
    expect(found.result.isError).toBeFalsy();
    expect(found.text.toLowerCase()).toContain('nothing');
  });
});

describe('read_page', () => {
  it('returns duxt frontmatter over the authored Markdown', async () => {
    const page = await text('read-page', { path: '/app/guide' });
    expect(page.startsWith('---\n')).toBe(true);

    const block = page.slice(4, page.indexOf('\n---', 4));
    expect(block).toContain('path:');
    expect(block).toContain('/app/guide');
    expect(block).toContain('prefix:');
    expect(block).toContain('v2');
    expect(block).toContain('current');

    const body = page.slice(page.indexOf('\n---', 4) + 4);
    expect(body).toContain('Install the package, then run the CLI.');
    // The author's own frontmatter is gone — one block, duxt's.
    expect(body).not.toContain('title: Guide');
  });

  it('reads a translation from its own URL', async () => {
    const page = await text('read-page', { path: '/de/app/guide' });
    expect(page).toContain('Paket installieren.');
    expect(page).toContain('de');
  });

  it('falls back to the original where a translation is missing', async () => {
    const page = await text('read-page', { path: '/de/app/deploying' });
    expect(page).toContain('Deploy to Cloudflare Workers.');
  });
});

describe('error responses', () => {
  it('rejects a prefix no version serves, and points at list_versions', async () => {
    const answer = await call('list-pages', { prefix: '/nope' });
    expect(answer.result.isError).toBe(true);
    expect(answer.text).toContain('list_versions');

    const searched = await call('search-docs', {
      query: 'install',
      prefix: '/nope'
    });
    expect(searched.result.isError).toBe(true);
    expect(searched.text).toContain('list_versions');
  });

  it('rejects a cursor that is not one it issued', async () => {
    const answer = await call('list-pages', { cursor: 'not-a-path' });
    expect(answer.result.isError).toBe(true);
    expect(answer.text.toLowerCase()).toContain('cursor');
  });

  it('rejects an unknown page path, and points at list_pages', async () => {
    const answer = await call('read-page', { path: '/app/missing' });
    expect(answer.result.isError).toBe(true);
    expect(answer.text).toContain('list_pages');
  });
});
