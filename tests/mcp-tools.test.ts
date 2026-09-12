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
  search?: boolean;
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

/**
 * Every field the MCP SDK puts on a tool handler's second argument.
 *
 * Copied off `RequestHandlerExtra` in
 * `@modelcontextprotocol/sdk/shared/protocol.d.ts`, and the point of writing it
 * out is that `event` is NOT among them — `@nuxtjs/mcp-toolkit` registers a
 * definition's handler with the SDK unwrapped, so what arrives is the SDK's
 * object and nothing of H3's.
 */
const SDK_EXTRA_FIELDS = new Set([
  'signal',
  'authInfo',
  'sessionId',
  '_meta',
  'requestId',
  'taskId',
  'taskStore',
  'taskRequestedTtl',
  'requestInfo',
  'sendNotification',
  'sendRequest',
  'closeSSEStream',
  'closeStandaloneSSEStream'
]);

/**
 * THE `extra` THE SDK ACTUALLY PASSES, and it refuses to be anything else.
 *
 * This used to be `{ event }` — a shape invented by this file, which no
 * transport has ever produced. Every tool read `extra.event` off it, the tests
 * were green, and in production the read was `undefined`: harmless while it was
 * only forwarded to `queryCollection`, fatal the moment `duxtLocaleSetup`
 * dereferenced `event.context`, at which point all four tools began answering
 * `Cannot read properties of undefined (reading 'context')` and only the
 * adapter matrix noticed (#90).
 *
 * So the fake is a proxy that throws on any field the SDK does not define. A
 * tool that reaches for the request through `extra` again fails here, with the
 * reason, instead of in somebody's deploy.
 */
const extra = new Proxy(
  {
    signal: new AbortController().signal,
    requestId: 1,
    sendNotification: async () => {},
    sendRequest: async () => ({})
  } as Record<string | symbol, unknown>,
  {
    get(target, property) {
      if (typeof property === 'string' && !SDK_EXTRA_FIELDS.has(property)) {
        throw new Error(
          `a tool read extra.${property}, which the MCP SDK's ` +
            'RequestHandlerExtra does not carry. The H3 request comes from ' +
            'duxtMcpEvent().'
        );
      }

      return Reflect.get(target, property);
    }
  }
) as never;

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
  // Nitro's own, and the only way into the request from inside a tool — which
  // is why the layer turns `nitro.experimental.asyncContext` on.
  vi.stubGlobal('useEvent', () => event);
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

  /**
   * The regression #90 is, stated as a contract.
   *
   * Every tool has to answer from the arguments the transport gives it and
   * `useEvent()`, taking nothing off `extra` — the proxy above throws on any
   * field the SDK does not define, so a tool that reaches for the request
   * through `extra` fails here rather than returning `isError` at runtime.
   * Asserted per tool and not left implicit in the cases below, because what
   * broke was never one tool's logic: it was the argument all four share.
   */
  it('answers on the extra the SDK actually passes, taking the request from useEvent', async () => {
    for (const [file, args] of [
      ['list-versions', undefined],
      ['list-pages', {}],
      ['search-docs', { query: 'install' }],
      ['read-page', { path: '/app/guide' }]
    ] as const) {
      const { result } = await call(file, args);
      expect(result.isError, file).toBeFalsy();
      expect(result.content.map((part) => part.text).join(''), file).not.toBe(
        ''
      );
    }
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

  /**
   * `search: false` makes a page UN-FINDABLE, not unpublished — decided, and
   * the reason the filter sits in this tool rather than in `duxtScopedPages`
   * where all three listing tools would have inherited it. An agent handed a
   * link to the page still gets the page; it simply is not offered.
   */
  it('hides a page that opted out, while the tree and the page stay', async () => {
    const pages = database.pages[Object.keys(database.pages)[0]!] as Row[];
    const deploying = pages.find((row) => row.path === '/app/deploying')!;
    deploying.search = false;

    expect(await text('search-docs', { query: 'Cloudflare' })).not.toContain(
      '/app/deploying'
    );
    expect(await text('list-pages', { limit: 100 })).toContain(
      '/app/deploying'
    );
    expect(await text('read-page', { path: '/app/deploying' })).toContain(
      'Cloudflare'
    );
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
