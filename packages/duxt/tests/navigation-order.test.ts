import { describe, expect, it } from 'vitest';
import { orderedNavigation } from '../app/utils/navigation-order';

describe('page navigation metadata', () => {
  it('inherits a folder rank from its lowest child, groups pages, and keeps ordinary order', () => {
    const tree = [
      { title: 'Later', path: '/later', navigationRank: 3 },
      {
        title: 'Folder',
        path: '/folder',
        page: false as const,
        children: [
          {
            title: 'Zulu',
            path: '/folder/z',
            navigationRank: 3,
            navigationGroup: 'People'
          },
          {
            title: 'Alpha',
            path: '/folder/a',
            navigationRank: 2,
            navigationGroup: 'People'
          },
          { title: 'Direct', path: '/folder/direct', navigationRank: 4 }
        ]
      },
      { title: 'First', path: '/first', navigationRank: 0 }
    ];
    const ordered = orderedNavigation(tree);
    expect(ordered.map((item) => item.path)).toEqual([
      '/first',
      '/folder',
      '/later'
    ]);
    expect(ordered[1]?.children?.map((item) => item.title)).toEqual([
      'Direct',
      'People'
    ]);
    expect(ordered[1]?.children?.[1]).toMatchObject({
      page: false,
      children: [{ title: 'Alpha' }, { title: 'Zulu' }]
    });
    const ordinary = [
      { title: 'Z', path: '/z' },
      { title: 'A', path: '/a' }
    ];
    expect(orderedNavigation(ordinary)).toEqual(ordinary);
  });
});
