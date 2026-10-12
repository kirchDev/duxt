import { describe, expect, it, vi } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { duxtSources, repositoryRoot } from '../build/sources/sources';

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

it('publishes docs media through the prepared source without creating asset pages', async () => {
  const root = mkdtempSync(join(tmpdir(), 'duxt-source-media-'));
  const cwd = process.cwd();
  try {
    mkdirSync(join(root, 'docs/_assets'), { recursive: true });
    writeFileSync(join(root, 'docs/_assets/demo.gif'), 'generated GIF');
    writeFileSync(join(root, 'docs/_assets/demo.tape'), 'capture source');
    writeFileSync(join(root, 'docs/_assets/index.md'), '# Asset provenance');
    writeFileSync(join(root, 'docs/index.md'), '# Documentation');
    writeFileSync(join(root, '.git'), 'isolated fixture');
    process.chdir(root);
    const collection = duxtSources([{ path: 'docs' }]).docs;
    const source = collection.source![0]!;
    await source.prepare!({ rootDir: root });
    expect(await source.getKeys!()).toEqual(['index.md']);
    const media = (source as unknown as { duxtMedia: { prefix: string } })
      .duxtMedia;
    expect(
      readFileSync(
        join(root, '.data/duxt-media/public', media.prefix, '_assets/demo.gif'),
        'utf8'
      )
    ).toBe('generated GIF');
  } finally {
    process.chdir(cwd);
    rmSync(root, { recursive: true, force: true });
  }
});

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
      '**/_assets/**',
      '**/*.wip.md'
    ]);
  } finally {
    vi.unstubAllEnvs();
  }
});

// The exclusion glob and the partials collection's own `include` are derived
// from ONE consumer setting, and conflating them is the regression the `*.md`
// restriction has already been written once to prevent: the partials
// collection is `type: 'page'`, so a screenshot sitting beside a partial is
// read as a document unless the include is restricted to Markdown.
describe('partials are excluded as a subtree and included as Markdown', () => {
  it('restricts the local partials collection to Markdown', () => {
    const collections = duxtSources([{ path: 'docs' }]);

    expect(collections.docs.source?.[0]?.exclude).toContain('**/_partials/**');
    expect(collections.duxt_partials.source?.[0]?.include).toBe(
      '**/_partials/**/*.md'
    );
  });

  it('restricts a repository partials collection to Markdown', () => {
    const collections = duxtSources([{ repo: 'acme/docs', path: 'docs' }]);

    expect(collections.docs.source?.[0]?.exclude).toContain('**/_partials/**');
    expect(collections.duxt_partials.source?.[0]?.include).toBe(
      'docs/**/_partials/**/*.md'
    );
  });

  it.each([
    { partials: '**/_includes/**', include: '**/_includes/**/*.md' },
    { partials: '**/_includes/*', include: '**/_includes/*.md' },
    { partials: '**/_includes', include: '**/_includes/**/*.md' },
    { partials: '**/_includes/**/*.mdc', include: '**/_includes/**/*.mdc' }
  ])('derives $include from a custom $partials', ({ partials, include }) => {
    const collections = duxtSources([{ path: 'docs', exclude: { partials } }]);

    // The page collection still loses the whole subtree — every file in it,
    // whatever the extension — while the partials collection takes only the
    // Markdown, at whatever depth the consumer's own glob reaches.
    expect(collections.docs.source?.[0]?.exclude).toContain(partials);
    expect(collections.duxt_partials.source?.[0]?.include).toBe(include);
  });
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
  const { duxtGeneratedCollections } =
    await import('../build/sections/sections');
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
  const { duxtGeneratedCollections } =
    await import('../build/sections/sections');
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
          parse: (input: { text: () => string }) => [
            { file: 'index.md', body: input.text() }
          ]
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

/**
 * Content follows symlinks when it globs a downloaded repository, so a page
 * committed as a link out of the checkout would be read off the build machine
 * and published. Such a key is dropped; a link that stays inside is a page.
 */
it('drops a downloaded page that links out of its checkout', async () => {
  const { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } =
    await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');

  const base = mkdtempSync(join(tmpdir(), 'duxt-remote-keys-'));
  const checkout = join(base, 'checkout');
  try {
    mkdirSync(join(checkout, 'docs'), { recursive: true });
    writeFileSync(join(base, 'secret.txt'), 'NOT_FOR_PUBLICATION');
    writeFileSync(join(checkout, 'docs', 'index.md'), '# Index');
    symlinkSync(join(base, 'secret.txt'), join(checkout, 'docs', 'env.md'));
    symlinkSync(
      join(checkout, 'docs', 'index.md'),
      join(checkout, 'docs', 'alias.md')
    );

    const collections = duxtSources([
      { repo: 'o/r', path: 'docs', refs: [{ branch: 'main' }] }
    ]) as Record<
      string,
      {
        source?: {
          repository?: unknown;
          cwd: string;
          getKeys?: () => Promise<string[]>;
        }[];
      }
    >;

    const source = Object.values(collections)
      .flatMap((collection) => collection.source ?? [])
      .find((entry) => entry.repository && entry.getKeys)!;
    source.cwd = checkout;

    expect((await source.getKeys!()).sort()).toEqual(['alias.md', 'index.md']);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
