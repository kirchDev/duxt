import { describe, expect, it, vi } from 'vitest';
import type { DuxtSectionOptions, DuxtSectionType } from '../sections-resolve';
import type { DuxtResolvedSource } from '../sources-resolve';
import {
  duxtManifest,
  duxtSectionTypes,
  generatedSectionRef,
  missingSectionArtefact,
  resolveGeneratedSections,
  sectionPages
} from '../sections-resolve';

/** A type that does nothing, so the policies are the only variable. */
const stub = (over: Partial<DuxtSectionType> = {}): DuxtSectionType => ({
  parse: () => [{ file: 'index.md', body: '' }],
  versioning: 'global',
  localisation: 'original',
  ...over
});

const types = (over: Partial<DuxtSectionType> = {}) => ({ stub: stub(over) });

const section = { type: 'stub', path: 'CHANGELOG.md', label: 'Releases' };

describe('resolveGeneratedSections', () => {
  it('produces nothing until a source declares one', () => {
    expect(resolveGeneratedSections([{ path: 'docs' }])).toEqual([]);
  });

  it('serves a section from the source prefix plus its own segment', () => {
    const [only] = resolveGeneratedSections(
      [{ path: 'docs', generated: [section] }],
      {},
      types()
    );

    expect(only).toMatchObject({
      collection: 'docs_releases',
      prefix: '/releases',
      // The ARTEFACT, so "edit this page" links at the file every page in the
      // section came out of.
      path: 'CHANGELOG.md',
      isDefault: true,
      // Its pages have no file of their own for git to answer about.
      history: false
    });
  });

  it('takes the URL segment from `slug` over the label', () => {
    const [only] = resolveGeneratedSections(
      [{ path: 'docs', generated: [{ ...section, slug: 'changelog' }] }],
      {},
      types()
    );

    expect(only!.prefix).toBe('/changelog');
    expect(only!.collection).toBe('docs_changelog');
  });

  it('sits under the repository segment once there is more than one', () => {
    const generated = resolveGeneratedSections(
      [
        { path: 'docs', repo: 'kirchDev/duxt', generated: [section] },
        { path: 'docs', repo: 'kirchDev/workflows' }
      ],
      {},
      types()
    );

    expect(generated.map((entry) => entry.prefix)).toEqual(['/duxt/releases']);
  });

  it('puts a global section on the default version only, without one', () => {
    const generated = resolveGeneratedSections(
      [{ path: 'docs', refs: ['main', 'v1.x'], generated: [section] }],
      {},
      types()
    );

    // One history, at a version-neutral URL — never a copy per version, each
    // missing the releases that came after it.
    expect(generated).toHaveLength(1);
    expect(generated[0]).toMatchObject({ prefix: '/releases' });
    expect(generated[0]!.version).toBeUndefined();
  });

  it('gives a per-version section one collection per version', () => {
    const generated = resolveGeneratedSections(
      [{ path: 'docs', refs: ['main', 'v1.x'], generated: [section] }],
      {},
      types({ versioning: 'per-version' })
    );

    expect(generated.map((entry) => entry.prefix)).toEqual([
      '/releases',
      '/v1.x/releases'
    ]);
    expect(generated.map((entry) => entry.version)).toEqual(['main', 'v1.x']);
  });

  it('builds an `original` section from the default locale alone', () => {
    const generated = resolveGeneratedSections(
      [{ path: 'docs', locales: ['en-GB', 'de'], generated: [section] }],
      {},
      types()
    );

    expect(generated).toHaveLength(1);
    expect(generated[0]!.locale).toBe('en-GB');
    expect(generated[0]!.isDefaultLocale).toBe(true);
  });

  it('follows the source languages when the type is per-locale', () => {
    const generated = resolveGeneratedSections(
      [
        {
          path: 'docs',
          locales: ['en-GB', 'de'],
          generated: [{ ...section, locales: { de: 'CHANGELOG.de.md' } }]
        }
      ],
      {},
      types({ localisation: 'per-locale' })
    );

    // Identical prefixes on purpose: the locale lives in front of the URL, not
    // in the content tree, so two languages behind one prefix is the design.
    expect(generated.map((entry) => entry.locale)).toEqual(['en-GB', 'de']);
    expect(generated.map((entry) => entry.prefix)).toEqual([
      '/releases',
      '/releases'
    ]);
    expect(generated.map((entry) => entry.collection)).toEqual([
      'docs_releases',
      'docs_de_releases'
    ]);
    // Each reads ITS OWN artefact — which is the whole reason a per-locale
    // type is per-locale rather than one collection copied per language.
    expect(generated.map((entry) => entry.path)).toEqual([
      'CHANGELOG.md',
      'CHANGELOG.de.md'
    ]);
  });

  it('builds nothing for a language that declares no artefact', () => {
    const generated = resolveGeneratedSections(
      [{ path: 'docs', locales: ['en-GB', 'de'], generated: [section] }],
      {},
      types({ localisation: 'per-locale' })
    );

    // The DEFAULT language only. A collection per language all reading the one
    // file would serve the original under a German URL with nothing saying so
    // — `sourcesForRoute` instead falls through to the default entry, and
    // `DuxtTranslationBanner` says the reader is looking at the original.
    expect(generated.map((entry) => entry.locale)).toEqual(['en-GB']);
  });

  it('lets a language answer for its regions', () => {
    const generated = resolveGeneratedSections(
      [
        {
          path: 'docs',
          locales: ['en-GB', 'pt-BR'],
          generated: [{ ...section, locales: { pt: 'CHANGELOG.pt.md' } }]
        }
      ],
      {},
      types({ localisation: 'per-locale' })
    );

    // One `pt` artefact serves `pt-PT` and `pt-BR`, exactly as one `pt` locale
    // FILE does.
    expect(generated.map((entry) => entry.path)).toEqual([
      'CHANGELOG.md',
      'CHANGELOG.pt.md'
    ]);
  });

  it('defaults the navbar entry to the second row', () => {
    const [only] = resolveGeneratedSections(
      [{ path: 'docs', generated: [section] }],
      {},
      types()
    );

    expect(only!.generated).toMatchObject({
      navigation: 'sections',
      type: 'stub',
      label: 'Releases',
      slug: 'releases',
      versioning: 'global',
      localisation: 'original'
    });
  });

  it('carries the placement and the icon a section declares', () => {
    const [only] = resolveGeneratedSections(
      [
        {
          path: 'docs',
          generated: [
            { ...section, navigation: 'navigation', icon: 'lucide:star' }
          ]
        }
      ],
      {},
      types({ icon: 'lucide:tag' })
    );

    expect(only!.generated).toMatchObject({
      navigation: 'navigation',
      icon: 'lucide:star'
    });
  });

  it('falls back to the type icon and layout', () => {
    const [only] = resolveGeneratedSections(
      [{ path: 'docs', generated: [section] }],
      {},
      types({ icon: 'lucide:tag', layout: 'changelog' })
    );

    expect(only!.generated).toMatchObject({
      icon: 'lucide:tag',
      layout: 'changelog'
    });
  });

  it('carries the declaration`s own options for the type to read', () => {
    const [only] = resolveGeneratedSections(
      [
        {
          path: 'docs',
          generated: [{ ...section, options: { granularity: 'flat' } }]
        }
      ],
      {},
      types()
    );

    expect(only!.generated!.options).toEqual({ granularity: 'flat' });
  });

  it('lets the type name a layout per those options', () => {
    // The knob a declaration turns can change what the pages ARE — a changelog
    // asked for as one file is an ordinary page and wants the docs chrome, the
    // same one split into releases is not. So the layout is resolved from the
    // options rather than fixed per type.
    const layout = (options: DuxtSectionOptions) =>
      options.granularity === 'flat' ? undefined : 'changelog';

    const [split] = resolveGeneratedSections(
      [{ path: 'docs', generated: [section] }],
      {},
      types({ layout })
    );

    const [flat] = resolveGeneratedSections(
      [
        {
          path: 'docs',
          generated: [{ ...section, options: { granularity: 'flat' } }]
        }
      ],
      {},
      types({ layout })
    );

    expect(split!.generated!.layout).toBe('changelog');
    expect(flat!.generated!.layout).toBeUndefined();
  });

  it('tells the entries of one declaration from those of another', () => {
    // WHICH DECLARATION an entry came from is known here and nowhere after, so
    // it is recorded rather than reconstructed downstream: the navbar puts one
    // link in the row per declaration, and it used to guess the grouping from
    // (slug, repository) — a pair the resolver never promised was unique.
    const generated = resolveGeneratedSections(
      [
        {
          path: 'docs',
          refs: ['main', 'v1.x'],
          // One artefact declared twice, as `www` declares its own changelog.
          generated: [section, { ...section, slug: 'changelog' }]
        },
        { path: 'other', slug: 'other', generated: [section] }
      ],
      { showRepo: true },
      types({ versioning: 'per-version' })
    );

    expect(
      generated.map((entry) => [entry.prefix, entry.generated!.declaration])
    ).toEqual([
      ['/docs/releases', 0],
      ['/docs/v1.x/releases', 0],
      ['/docs/changelog', 1],
      ['/docs/v1.x/changelog', 1],
      ['/other/releases', 2]
    ]);
  });

  it('marks a downloaded source as remote and a local one as not', () => {
    const generated = resolveGeneratedSections(
      [
        { path: 'docs', generated: [section] },
        {
          path: 'docs',
          repo: 'kirchDev/workflows',
          generated: [{ ...section, slug: 'other' }]
        }
      ],
      {},
      types()
    );

    expect(generated.map((entry) => entry.generated!.remote)).toEqual([
      false,
      true
    ]);
  });

  it('rejects a type no registry answers to', () => {
    expect(() =>
      resolveGeneratedSections(
        [{ path: 'docs', generated: [{ ...section, type: 'openapi' }] }],
        {},
        types()
      )
    ).toThrow(/openapi/);
  });

  it('rejects a section colliding with the documentation', () => {
    expect(() =>
      resolveGeneratedSections(
        [
          { path: 'docs', repo: 'kirchDev/duxt', generated: [section] },
          // Slugged to the segment the section above claims.
          { path: 'docs', repo: 'kirchDev/other', slug: 'releases' }
        ],
        { showRepo: false },
        types()
      )
    ).toThrow(/already claims|same URL prefix/);
  });

  it('rejects two sections claiming one segment', () => {
    expect(() =>
      resolveGeneratedSections(
        [{ path: 'docs', generated: [section, { ...section }] }],
        {},
        types()
      )
    ).toThrow(/already claims/);
  });
});

describe('duxtManifest', () => {
  it('appends the sections after the documentation', () => {
    const manifest = duxtManifest(
      [{ path: 'docs', generated: [section] }],
      {},
      types()
    );

    expect(manifest.map((entry) => entry.prefix)).toEqual(['', '/releases']);
    expect(manifest[0]!.generated).toBeUndefined();
  });

  it('is the source manifest exactly when nothing is declared', () => {
    expect(duxtManifest([{ path: 'docs' }])).toHaveLength(1);
  });
});

describe('duxtSectionTypes', () => {
  it('ships the layer`s own types and lets a consumer add to it', () => {
    const registry = duxtSectionTypes({ stub: stub() });

    expect(Object.keys(registry).sort()).toEqual([
      'changelog',
      'openapi',
      'stub'
    ]);
  });

  it('lets a consumer replace a type the layer ships', () => {
    const own = stub({ versioning: 'per-version' });

    expect(duxtSectionTypes({ changelog: own }).changelog).toBe(own);
  });
});

describe('generatedSectionRef', () => {
  it('gives a tag back as a tag and a branch back as a branch', () => {
    const base = {
      collection: 'docs',
      prefix: '',
      isDefault: true,
      isDefaultLocale: true,
      path: 'docs',
      status: 'current' as const,
      history: false
    };

    expect(
      generatedSectionRef({ ...base, ref: 'v1.0.0', refKind: 'tag' })
    ).toEqual({ tag: 'v1.0.0' });
    expect(
      generatedSectionRef({ ...base, ref: 'main', refKind: 'branch' })
    ).toEqual({ branch: 'main' });
    expect(generatedSectionRef(base)).toBeUndefined();
  });
});

describe('the severity of a section that produces nothing', () => {
  const entry = (
    over: Partial<DuxtResolvedSource['generated']> = {}
  ): DuxtResolvedSource => ({
    collection: 'docs_releases',
    prefix: '/releases',
    path: 'CHANGELOG.md',
    isDefault: true,
    isDefaultLocale: true,
    status: 'current',
    history: false,
    repository: 'kirchDev/duxt',
    ref: 'v1.0.0',
    refKind: 'tag',
    generated: {
      type: 'stub',
      label: 'Releases',
      slug: 'releases',
      navigation: 'sections',
      versioning: 'global',
      localisation: 'original',
      remote: false,
      ...over
    }
  });

  it('fails the build when a LOCAL source declares a file it has not', () => {
    // The site's own configuration, so a path that does not exist is a mistake
    // in it — the rule `modules/validate.ts` states, applied here.
    expect(() => missingSectionArtefact(entry(), '/repo/CHANGELOG.md')).toThrow(
      /which this repository does not have/
    );
  });

  it('records and builds nothing when a REMOTE source has not the file', () => {
    // A remote source can go stale between releases without that being this
    // build's fault, so it carries on — and the finding goes into the report
    // rather than onto the console, which is what puts it in the same list as
    // every other finding this layer produces.
    const source = entry({ remote: true });

    expect(missingSectionArtefact(source, '/cache/CHANGELOG.md')).toEqual([]);
    expect(source.generated!.report).toEqual({
      pages: 0,
      warnings: [],
      missing: true
    });
  });

  it('records the missing artefact for a LOCAL source before it throws', () => {
    // The throw is the severity; the report is what a reader sees if anything
    // catches it. Both, in that order.
    const source = entry();

    expect(() =>
      missingSectionArtefact(source, '/repo/CHANGELOG.md')
    ).toThrow();
    expect(source.generated!.report?.missing).toBe(true);
  });

  it('hands the type the label, the prefix and the declared options', () => {
    // The context is the whole of what a parser is told: everything else it
    // needs about the section is a knob the site turned.
    const parse = vi.fn(() => [{ file: 'index.md', body: '' }]);

    sectionPages(
      entry({ options: { granularity: 'flat' } }),
      stub({ parse }),
      'anything'
    );

    expect(parse).toHaveBeenCalledWith('anything', {
      label: 'Releases',
      prefix: '/releases',
      options: { granularity: 'flat' },
      warn: expect.any(Function)
    });
  });

  it('hands a type that was given no options an empty set', () => {
    const parse = vi.fn(() => [{ file: 'index.md', body: '' }]);

    sectionPages(entry(), stub({ parse }), 'anything');

    expect(parse).toHaveBeenCalledWith(
      'anything',
      expect.objectContaining({ options: {} })
    );
  });

  it('treats a type that read nothing as the same finding', () => {
    // An empty collection is a 404 on every URL the section claims, with
    // nothing said about why — the same outcome as a file that is not there.
    const empty = stub({ parse: () => [] });
    const remote = entry({ remote: true });

    expect(() => sectionPages(entry(), empty, 'anything')).toThrow(
      /holds nothing the "stub" type can read/
    );
    expect(sectionPages(remote, empty, 'anything')).toEqual([]);
    expect(remote.generated!.report).toEqual({ pages: 0, warnings: [] });
  });

  it('collects what the type warned about, once per message', () => {
    // Deduplicated in the scaffold rather than in each type: one unresolvable
    // `$ref` is reached from every operation that uses it.
    const source = entry();

    sectionPages(
      source,
      stub({
        parse: (_artefact, context) => {
          context.warn?.('the reference "#/x" points at nothing.');
          context.warn?.('the reference "#/x" points at nothing.');
          return [{ file: 'index.md', body: '' }];
        }
      }),
      'anything'
    );

    expect(source.generated!.report).toEqual({
      pages: 1,
      warnings: ['the reference "#/x" points at nothing.']
    });
  });
});

describe('which generated entry claims to be the default version', () => {
  const source = (type: string) => ({
    path: 'docs',
    repo: 'acme/sdk',
    refs: [
      { branch: 'main', label: 'v2' },
      { tag: 'v1.9.4', label: 'v1.9' }
    ],
    generated: [{ type, path: 'artefact', label: 'Section' }]
  });

  it('follows the version it was read at, for a per-version type', () => {
    // Hard-wired to `true`, the deprecated reference claimed to be the default
    // as loudly as the current one — which kept it in the sitemap and put a
    // second "default" in the version switcher.
    const entries = duxtManifest([source('openapi')], {}).filter(
      (entry) => entry.generated
    );

    expect(entries.map((entry) => [entry.version, entry.isDefault])).toEqual([
      ['v2', true],
      ['v1.9', false]
    ]);
  });

  it('stays the default for a version-neutral type', () => {
    // One entry, served at a URL with no version in it — there is nothing else
    // for it to be.
    const entries = duxtManifest([source('changelog')], {}).filter(
      (entry) => entry.generated
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]!.isDefault).toBe(true);
    expect(entries[0]!.version).toBeUndefined();
  });
});
