import { describe, expect, it } from 'vitest';
import { versionChoices } from '../app/utils/version-choices';

const base = {
  collection: 'docs',
  prefix: '',
  path: 'docs',
  isDefault: false,
  isDefaultLocale: true,
  status: 'current',
  history: true
} as DuxtResolvedSource;

const source = (over: Partial<DuxtResolvedSource> = {}): DuxtResolvedSource =>
  ({ ...base, ...over }) as DuxtResolvedSource;

const v2 = source({
  repo: 'duxt',
  version: '2.x',
  prefix: '',
  isDefault: true
});
const v1 = source({ repo: 'duxt', version: '1.x', prefix: '/1.x' });

describe('versionChoices', () => {
  it('offers the versions of the repository being read', () => {
    const other = source({ repo: 'other', version: '9.x', prefix: '/9.x' });

    expect(versionChoices([v2, v1, other], v2, undefined)).toEqual([
      { label: '2.x', to: '/', description: 'default' },
      { label: '1.x', to: '/1.x', description: undefined }
    ]);
  });

  it('captions a version by its lifecycle rather than its default-ness', () => {
    const eol = source({
      repo: 'duxt',
      version: '0.x',
      prefix: '/0.x',
      status: 'eol'
    });
    const [, , old] = versionChoices([v2, v1, eol], v2, undefined);

    expect(old?.description).toBe('duxt.version.status.eol');
  });

  it('says nothing where the version is current', () => {
    const [, older] = versionChoices([v2, v1], v2, undefined);

    expect(older?.description).toBeUndefined();
  });

  it('lets the config win, so a label may read differently from the URL', () => {
    const configured = [{ label: 'Latest', to: '/' }] as DuxtLink[];

    expect(versionChoices([v2, v1], v2, configured)).toEqual(configured);
  });

  it('offers nothing inside a version-neutral generated section', () => {
    const changelog = source({
      repo: 'duxt',
      prefix: '/releases',
      generated: { versioning: 'global' } as DuxtResolvedSource['generated']
    });

    expect(versionChoices([v2, v1, changelog], changelog, undefined)).toEqual(
      []
    );
    // Even where the consumer named them: the section serves one URL, and every
    // entry would move the reader off it.
    expect(
      versionChoices([v2, v1, changelog], changelog, [
        { label: 'Latest', to: '/' }
      ] as DuxtLink[])
    ).toEqual([]);
  });

  it('skips a source with no version of its own', () => {
    const flat = source({ repo: 'duxt' });

    expect(versionChoices([flat], flat, undefined)).toEqual([]);
  });

  it('survives having no current source', () => {
    expect(versionChoices([v2, v1], undefined, undefined)).toEqual([]);
  });
});
