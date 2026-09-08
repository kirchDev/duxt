import { describe, expect, it } from 'vitest';
import type { DuxtSectionType } from '../sections-resolve';
import {
  duxtManifest,
  duxtSectionTypes,
  generatedSectionRef,
  resolveGeneratedSections
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
      [{ path: 'docs', locales: ['en-GB', 'de'], generated: [section] }],
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
  it('ships changelog and lets a consumer add to it', () => {
    const registry = duxtSectionTypes({ stub: stub() });

    expect(Object.keys(registry).sort()).toEqual(['changelog', 'stub']);
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
