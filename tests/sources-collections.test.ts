import { describe, expect, it, vi } from 'vitest';
import { duxtSources, repositoryRoot } from '../sources';

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  execFileSync: () => {
    throw new Error('No Git tags available');
  }
}));

// Content normally initializes schema converters during Nuxt module setup.
vi.mock('@nuxt/content', async (importOriginal) => {
  const content = await importOriginal<typeof import('@nuxt/content')>();
  return {
    ...content,
    defineCollection: (
      collection: Parameters<typeof content.defineCollection>[0]
    ) => content.defineCollection({ ...collection, schema: undefined })
  };
});

vi.mock('@nuxtjs/sitemap/content', () => ({
  defineSitemapSchema: ({ z }: { z: typeof import('@nuxt/content').z }) =>
    z.object({})
}));

describe('local checkout refs', () => {
  it('rejects publishing the checkout under a declared Git ref', () => {
    expect(() => duxtSources([{ path: 'docs', refs: ['main'] }])).toThrow(
      /docs.*local.*ref.*explicit.*repo/i
    );
  });
});

it('rejects latest before attempting to resolve checkout tags', () => {
  expect(() => duxtSources([{ path: 'docs', refs: ['latest'] }])).toThrow(
    /docs.*local.*ref.*explicit.*repo/i
  );
});

it.each([
  { path: 'docs', refs: ['main', { tag: 'v1.0.0' }] },
  {
    path: 'docs',
    refs: [{ tag: 'v1.0.0' }],
    origin: { repo: 'acme/docs', ref: 'main' }
  },
  { path: 'docs', locales: ['en', { locale: 'de', ref: { tag: 'v1.0.0' } }] },
  { path: 'docs', locales: [{ locale: 'en', ref: 'main' }] }
])('rejects effective local ref configuration %#', (source) => {
  expect(() => duxtSources([source])).toThrow(
    /docs.*local.*ref.*explicit.*repo/i
  );
});

it('selects explicit remote branches and tags for documentation collections', () => {
  const collections = duxtSources([
    { repo: 'acme/docs', path: 'docs', refs: ['main', { tag: 'v1.0.0' }] }
  ]);
  expect(collections.docs.source?.[0]?.repository).toEqual({
    url: 'https://github.com/acme/docs',
    branch: 'main'
  });
  expect(collections.docs_v1_0_0.source?.[0]?.repository).toEqual({
    url: 'https://github.com/acme/docs',
    tag: 'v1.0.0'
  });
});

it('uses a source’s custom draft and partial patterns', () => {
  vi.stubEnv('NODE_ENV', 'production');
  try {
    const collections = duxtSources([
      {
        path: 'docs',
        exclude: { drafts: '**/*.wip.md', partials: '**/_includes/**' }
      }
    ]);

    expect(collections.docs.source?.[0]?.exclude).toEqual([
      '**/_includes/**',
      '**/*.wip.md'
    ]);
  } finally {
    vi.unstubAllEnvs();
  }
});

it('allows a remote locale ref beside the unversioned local checkout', async () => {
  const collections = duxtSources([
    {
      path: 'docs',
      origin: { repo: 'acme/docs', ref: 'main' },
      locales: [
        'en',
        { locale: 'de', repo: 'acme/docs-de', ref: { tag: 'v1.0.0' } }
      ]
    }
  ]);
  await collections.docs.source![0]!.prepare!({ rootDir: repositoryRoot() });
  expect(collections.docs.source?.[0]?.cwd).toMatch(/\/docs$/);
  expect(collections.docs_de.source?.[0]?.repository).toEqual({
    url: 'https://github.com/acme/docs-de',
    tag: 'v1.0.0'
  });
});

it('reads local versions from distinct folders', async () => {
  const collections = duxtSources([
    { path: 'docs/v2', version: 'v2' },
    { path: 'docs/v1', version: 'v1' }
  ]);
  await collections.docs.source![0]!.prepare!({ rootDir: repositoryRoot() });
  await collections.docs_v1.source![0]!.prepare!({ rootDir: repositoryRoot() });
  expect(collections.docs.source?.[0]).toMatchObject({
    cwd: expect.stringMatching(/\/docs\/v2$/),
    prefix: ''
  });
  expect(collections.docs_v1.source?.[0]).toMatchObject({
    cwd: expect.stringMatching(/\/docs\/v1$/),
    prefix: '/v1'
  });
});

it('rejects invalid local refs before generated sections are constructed', async () => {
  const { duxtGeneratedCollections } = await import('../sections');
  expect(() =>
    duxtGeneratedCollections([
      {
        path: 'docs',
        refs: ['main'],
        generated: [
          { type: 'changelog', path: 'CHANGELOG.md', label: 'Changes' }
        ]
      }
    ])
  ).toThrow(/docs.*local.*ref.*explicit.*repo/i);
});

it('keeps local generated sections versioned by their files', async () => {
  const { duxtGeneratedCollections } = await import('../sections');
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join, relative } = await import('node:path');
  const folder = mkdtempSync(join(tmpdir(), 'duxt-local-versions-'));
  const path = relative(repositoryRoot(), folder);
  try {
    writeFileSync(join(folder, 'v1.md'), 'Old API');
    writeFileSync(join(folder, 'v2.md'), 'Current API');
    const collections = duxtGeneratedCollections(
      [
        {
          path: 'docs',
          generated: [
            {
              type: 'test',
              path: `${path}/v2.md`,
              label: 'API',
              versions: [
                { version: 'v2', path: `${path}/v2.md` },
                { version: 'v1', path: `${path}/v1.md` }
              ]
            }
          ]
        }
      ],
      {},
      {
        test: {
          versioning: 'per-version',
          localisation: 'original',
          parse: (raw: string) => [{ file: 'index.md', body: raw }]
        }
      }
    );
    const sources = Object.values(collections).map(
      (collection) => collection.source![0]!
    );
    expect(
      await Promise.all(sources.map((source) => source.getItem!('index.md')))
    ).toEqual(['Current API', 'Old API']);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
