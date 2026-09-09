import { describe, expect, it } from 'vitest';
import { buildSheetNavigation } from '../app/utils/sheet-navigation';

const sections = [
  { label: 'Guides', to: '/guides' },
  { label: 'ADR', to: '/adr' }
] as DuxtSection[];

describe('buildSheetNavigation', () => {
  it('hangs the sections under the entry that carries no `to`', () => {
    const { entries, sections: left } = buildSheetNavigation(
      [{ label: 'Docs' }, { label: 'Credits', to: '/credits' }] as DuxtLink[],
      sections
    );

    expect(entries[0]?.children).toEqual(sections);
    expect(entries[1]?.children).toBeUndefined();
    expect(left).toEqual([]);
  });

  it('leaves an entry that names a page alone', () => {
    const navigation = [{ label: 'Docs', to: '/docs' }] as DuxtLink[];
    const { entries, sections: left } = buildSheetNavigation(
      navigation,
      sections
    );

    expect(entries[0]?.children).toBeUndefined();
    expect(left).toEqual(sections);
  });

  it('leaves an entry that already has a menu of its own alone', () => {
    const navigation = [
      {
        label: 'Resources',
        children: [{ label: 'Nuxt', to: 'https://nuxt.com' }]
      }
    ] as DuxtLink[];
    const { entries, sections: left } = buildSheetNavigation(
      navigation,
      sections
    );

    expect(entries[0]?.children).toHaveLength(1);
    expect(left).toEqual(sections);
  });

  it('adopts into the first qualifying entry only', () => {
    const { entries } = buildSheetNavigation(
      [{ label: 'Docs' }, { label: 'Guides' }] as DuxtLink[],
      sections
    );

    expect(entries[0]?.children).toEqual(sections);
    expect(entries[1]?.children).toBeUndefined();
  });

  it('does not mutate the config it was handed', () => {
    const navigation = [{ label: 'Docs' }] as DuxtLink[];
    buildSheetNavigation(navigation, sections);

    expect(navigation[0]?.children).toBeUndefined();
  });

  it('hands back the sections when nothing can adopt them', () => {
    const { entries, sections: left } = buildSheetNavigation([], sections);

    expect(entries).toEqual([]);
    expect(left).toEqual(sections);
  });

  it('touches nothing when there are no sections', () => {
    const navigation = [{ label: 'Docs' }] as DuxtLink[];
    const { entries, sections: left } = buildSheetNavigation(navigation, []);

    expect(entries[0]?.children).toBeUndefined();
    expect(left).toEqual([]);
  });

  it('survives both sides being absent', () => {
    expect(buildSheetNavigation(undefined, undefined)).toEqual({
      entries: [],
      sections: []
    });
  });
});

describe('a second source', () => {
  const sources = [
    { prefix: '' },
    { prefix: '/demo' },
    { prefix: '/demo/api', generated: { type: 'openapi' } }
  ];

  const navigation = [
    { label: 'Docs' },
    { label: 'Demo API', to: '/demo' },
    { label: 'Credits', to: '/credits' }
  ];

  const sections = [
    { label: 'Guides', to: '/guides' },
    { label: 'Overview', to: '/demo' },
    { label: 'Reference', to: '/demo/api' }
  ];

  it('hangs each area under the entry that opens it', () => {
    const sheet = buildSheetNavigation(navigation, sections, sources);

    expect(sheet.entries[0]!.children?.map((child) => child.to)).toEqual([
      '/guides'
    ]);
    expect(sheet.entries[1]!.children?.map((child) => child.to)).toEqual([
      '/demo',
      '/demo/api'
    ]);
    expect(sheet.sections).toEqual([]);
  });

  it('leaves an area with no entry to hang on in the loose block', () => {
    const sheet = buildSheetNavigation([{ label: 'Docs' }], sections, sources);

    expect(sheet.sections.map((section) => section.to)).toEqual([
      '/demo',
      '/demo/api'
    ]);
  });

  it('ignores the areas entirely when no sources are handed in', () => {
    const sheet = buildSheetNavigation(navigation, sections);

    expect(sheet.entries[0]!.children).toHaveLength(3);
  });
});
