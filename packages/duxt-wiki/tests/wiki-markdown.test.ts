import { beforeEach, expect, it, vi } from 'vitest';
import { resolveSources } from '@kirchdev/duxt/sources-resolve';
import { duxtPageMarkdown } from '../../duxt/server/utils/page-markdown';

const database = vi.hoisted(() => new Map<string, Record<string, unknown>[]>());
const query = (_event: unknown, collection: string) => {
  let wanted: string | undefined;
  let fields: string[] | undefined;
  const project = (row: Record<string, unknown>) =>
    fields
      ? Object.fromEntries(
          fields.map((field) => {
            if (!(field in row)) throw new Error(`no such column: ${field}`);
            return [field, row[field]];
          })
        )
      : row;
  const builder = {
    path: (path: string) => {
      wanted = path;
      return builder;
    },
    select: (...selected: string[]) => {
      fields = selected;
      return builder;
    },
    first: async () => {
      const row = database.get(collection)?.find((row) => row.path === wanted);
      return row ? project(row) : null;
    },
    order: () => builder,
    limit: () => builder,
    skip: () => builder,
    all: async () => (database.get(collection) ?? []).map(project)
  };
  return builder;
};
vi.mock('@nuxt/content/nitro', () => ({
  queryCollection: (...args: Parameters<typeof query>) => query(...args)
}));
vi.mock('@nuxt/content/server', () => ({
  queryCollection: (...args: Parameters<typeof query>) => query(...args)
}));
vi.mock(
  '@duxt/../server/utils/mcp-docs',
  async () => await import('../../duxt/server/utils/mcp-docs')
);
vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin);
const sources = resolveSources([{ path: 'docs', slug: 'wiki' }]);
vi.stubGlobal('useAppConfig', () => ({ duxt: { resolvedSources: sources } }));
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { i18n: { defaultLocale: 'en', locales: ['en'] } }
}));
const { default: plugin } = await import('../server/plugins/wiki-markdown');

beforeEach(() => database.clear());

it('formats a disambiguation page using its stored Wiki type when Core supplies no page type', async () => {
  const source = sources[0]!;
  const rawbody = '[[Target]]';
  const body = {
    type: 'minimark',
    value: [
      [
        'p',
        {},
        [
          'span',
          {
            'data-duxt-wiki': JSON.stringify({
              target: 'Target',
              label: 'Target',
              section: '',
              start: 0,
              end: 10
            })
          },
          '[[Target]]'
        ]
      ]
    ]
  };
  database.set(source.collection, [
    {
      path: '/wiki/choices',
      title: 'Choices',
      type: 'disambiguation',
      body,
      aliases: [],
      categories: [],
      links: []
    },
    {
      path: '/wiki/target',
      title: 'Target',
      type: 'article',
      aliases: [],
      categories: [],
      links: []
    }
  ]);
  const event = { context: {} };
  plugin({
    hooks: {
      hook: (_name: string, handler: (event: unknown) => void) => handler(event)
    }
  } as never);
  expect(
    await duxtPageMarkdown(event as never, {
      rawbody,
      path: '/wiki/choices',
      source
    })
  ).toBe('[Target](/wiki/target)');
  expect(rawbody).toBe('[[Target]]');
});

it('leaves ordinary custom pages without a type column as plain Markdown', async () => {
  const source = sources[0]!;
  database.set(source.collection, [
    {
      path: '/wiki/ordinary',
      rawbody: '[[Target]]',
      body: { type: 'minimark', value: [] }
    }
  ]);
  const event = { context: {} };
  plugin({
    hooks: {
      hook: (_name: string, handler: (event: unknown) => void) => handler(event)
    }
  } as never);
  expect(
    await duxtPageMarkdown(event as never, {
      rawbody: '[[Target]]',
      path: '/wiki/ordinary',
      source
    })
  ).toBe('[[Target]]');
});
