import { expect, it, vi } from 'vitest';
import { duxtManifest } from '../sections-resolve';
import {
  searchExcerpt,
  searchRows,
  sourceDisplayNames
} from '../app/utils/search-display';

it('names a source by its own name, its segment, its repository, then the site', () => {
  const names = sourceDisplayNames(
    [
      // The site's own documentation at the root: no segment of its own, so
      // the old label was the bare `/` this issue is about.
      { collection: 'docs', repo: undefined, path: 'docs' },
      { collection: 'docs_demo', repo: 'demo', path: 'www/demo/docs' },
      {
        collection: 'docs_tf',
        repo: 'tf',
        repository: 'kirchDev/terraform-provider-linear',
        path: 'docs',
        name: 'Terraform Provider'
      },
      {
        collection: 'docs_sdk',
        repo: 'client-sdk',
        repository: 'acme/client-sdk',
        path: 'docs'
      },
      // No segment of its own AND a repository: still the site's name, because
      // one repository may back several sources and so names none of them.
      {
        collection: 'docs_root',
        repository: 'kirchDev/duxt',
        path: 'docs'
      }
    ],
    'duxt'
  );

  expect(names.get('docs')).toBe('duxt');
  expect(names.get('docs_demo')).toBe('Demo');
  expect(names.get('docs_tf')).toBe('Terraform Provider');
  expect(names.get('docs_sdk')).toBe('Client Sdk');
  expect(names.get('docs_root')).toBe('duxt');
});

it('keeps every edition of one source under a single unqualified name', () => {
  const names = sourceDisplayNames(
    [
      { collection: 'docs_demo', repo: 'demo', path: 'www/demo/docs' },
      { collection: 'docs_demo_v2', repo: 'demo', path: 'www/demo/docs' },
      { collection: 'docs_de_demo', repo: 'demo', path: 'www/demo/docs/de' }
    ],
    'duxt'
  );

  expect([...new Set(names.values())]).toEqual(['Demo']);
});

it('qualifies sources that would otherwise share one display name', () => {
  const names = sourceDisplayNames(
    [
      {
        collection: 'docs_api',
        repo: 'api',
        repository: 'acme/api',
        path: 'docs',
        name: 'Reference'
      },
      {
        collection: 'docs_cli',
        repo: 'cli',
        repository: 'acme/cli',
        path: 'docs',
        name: 'Reference'
      },
      { collection: 'docs_guide', repo: 'guide', path: 'docs' }
    ],
    'duxt'
  );

  expect(names.get('docs_api')).toBe('Reference (acme/api)');
  expect(names.get('docs_cli')).toBe('Reference (acme/cli)');
  // Untouched: it never collided, so it keeps the plain name.
  expect(names.get('docs_guide')).toBe('Guide');
});

it('falls back to the folder when colliding sources share one repository', () => {
  const names = sourceDisplayNames(
    [
      {
        collection: 'docs_v1',
        repo: 'v1',
        repository: 'acme/monorepo',
        path: 'packages/one/docs',
        name: 'Package'
      },
      {
        collection: 'docs_v2',
        repo: 'v2',
        repository: 'acme/monorepo',
        path: 'packages/two/docs',
        name: 'Package'
      }
    ],
    'duxt'
  );

  expect(names.get('docs_v1')).toBe('Package (packages/one/docs)');
  expect(names.get('docs_v2')).toBe('Package (packages/two/docs)');
});

it('collapses whitespace and starts at the beginning without a literal match', () => {
  expect(
    searchExcerpt('  A layer\n\n  that   carries\ta module.  ', 'nothing', 80)
  ).toBe('A layer that carries a module.');
});

it('windows around a literal match, marking both cuts', () => {
  const content = `${'filler '.repeat(20)}the collection cwd resolves against the layer ${'tail '.repeat(20)}`;
  const excerpt = searchExcerpt(content, 'collection cwd', 60);

  expect(excerpt).toContain('collection cwd');
  expect(excerpt.startsWith('…')).toBe(true);
  expect(excerpt.endsWith('…')).toBe(true);
  expect(excerpt.length).toBeLessThanOrEqual(62);
});

it('marks only the end when the match already sits at the beginning', () => {
  const excerpt = searchExcerpt(
    `Sources resolve ${'tail '.repeat(40)}`,
    'sources',
    40
  );

  expect(excerpt.startsWith('Sources resolve')).toBe(true);
  expect(excerpt.endsWith('…')).toBe(true);
});

it('has nothing to show for empty text, so the row can be dropped', () => {
  expect(searchExcerpt('   \n\t ', 'anything', 80)).toBe('');
  expect(searchExcerpt(undefined, 'anything', 80)).toBe('');
});

it('leaves short text whole, with no ellipsis at either end', () => {
  expect(searchExcerpt('One short line.', 'short', 80)).toBe('One short line.');
});

it('returns markup as the literal text it is, for a component to escape', () => {
  expect(searchExcerpt('Use <script> carefully.', 'script', 80)).toBe(
    'Use <script> carefully.'
  );
});

const sourced = (
  id: string,
  name: string,
  version?: string,
  artefact?: string
) => ({
  id,
  source: { name, version, artefact }
});

it('captions the first hit of each contiguous run and no other', () => {
  const rows = searchRows([
    sourced('/a', 'Demo'),
    sourced('/b', 'Demo'),
    sourced('/c', 'Guide'),
    sourced('/d', 'Demo')
  ]);

  expect(rows.map((row) => row.caption)).toEqual([
    'Demo',
    undefined,
    'Guide',
    // Noncontiguous: the run starts again rather than being gathered upward.
    'Demo'
  ]);
});

it('preserves the hits, their order and their count exactly', () => {
  const hits = [
    sourced('/a', 'Demo'),
    sourced('/b', 'Demo'),
    sourced('/c', 'Guide')
  ];

  expect(searchRows(hits).map((row) => row.hit)).toEqual(hits);
});

it('gives every hit its own provenance, caption or not', () => {
  const rows = searchRows([
    sourced('/a', 'Demo', 'v3.x'),
    sourced('/b', 'Demo', 'v3.x')
  ]);

  expect(rows.map((row) => row.provenance)).toEqual([
    'Demo \u00b7 v3.x',
    'Demo \u00b7 v3.x'
  ]);
  expect(rows[1]?.caption).toBeUndefined();
});

it('separates a version from a generated artefact of the same source', () => {
  const rows = searchRows([
    sourced('/a', 'Demo', 'v3.x', 'Demo API'),
    sourced('/b', 'Demo', 'v3.x')
  ]);

  expect(rows[0]?.caption).toBe('Demo \u00b7 Demo API \u00b7 v3.x');
  expect(rows[1]?.caption).toBe('Demo \u00b7 v3.x');
});

it('captions nothing on a site with a single source', () => {
  const rows = searchRows([{ id: '/a' }, { id: '/b' }]);

  expect(rows.map((row) => row.caption)).toEqual([undefined, undefined]);
  expect(rows.map((row) => row.provenance)).toEqual([undefined, undefined]);
});

it('carries a source display name through the resolved manifest', () => {
  const manifest = duxtManifest([
    {
      repo: 'acme/handbook',
      path: 'docs',
      name: { 'en-GB': 'Handbook', de: 'Handbuch' },
      refs: ['main', 'v1']
    }
  ]);

  expect(manifest.length).toBeGreaterThan(1);
  for (const entry of manifest) {
    expect(entry.name).toEqual({ 'en-GB': 'Handbook', de: 'Handbuch' });
  }
});

it('gives every real www source a readable name, never a slash or an identifier', async () => {
  vi.stubGlobal('defineAppConfig', <T>(config: T) => config);
  try {
    const { default: config } = await import('../www/app/app.config');
    const manifest = duxtManifest(
      config.duxt.sources,
      config.duxt.sourceOptions
    );
    const names = sourceDisplayNames(
      manifest.map((entry) => ({
        collection: entry.collection,
        // The build resolves the locale record before the theme reads it.
        name:
          typeof entry.name === 'string' ? entry.name : entry.name?.['en-GB'],
        repo: entry.repo,
        repository: entry.repository,
        path: entry.path
      })),
      config.duxt.title
    );

    expect(names.size).toBe(manifest.length);
    for (const [collection, name] of names) {
      expect(name).not.toBe('/');
      expect(name).not.toBe(collection);
      expect(name.trim()).not.toBe('');
    }
    // Named by config, not slugged — and `tf`, an abbreviation, least of all.
    expect(names.get('docs')).toBe('duxt documentation');
    expect(names.get('docs_demo')).toBe('Demo documentation');
    expect(names.get('docs_tf')).toBe('Terraform Provider');
    // Every edition of the demo answers to one name, captions included.
    expect(
      [...names].filter(([collection]) => collection.startsWith('docs_demo'))
    ).not.toHaveLength(0);
    for (const [collection, name] of names) {
      if (collection.startsWith('docs_demo')) {
        expect(name).toBe('Demo documentation');
      }
    }
  } finally {
    vi.unstubAllGlobals();
  }
});
