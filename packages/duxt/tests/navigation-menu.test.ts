import { describe, expect, it } from 'vitest';
import {
  megaCells,
  megaColumns,
  menuAnchor,
  menuDisplay,
  menuEntries,
  menuOwns,
  menuTargets
} from '../app/utils/navigation-menu';
import {
  currentSection,
  sectionsForPath,
  sectionsInEdition
} from '../app/utils/section-scope';

const tree = {
  label: 'Network',
  children: [
    { label: 'Forums', to: '/forums' },
    {
      label: 'Ranks',
      children: [{ label: 'VIP', to: '/ranks/vip' }]
    }
  ]
};

describe('navbar menus', () => {
  it('collects every destination at any depth', () => {
    expect(menuTargets(tree)).toEqual(['/forums', '/ranks/vip']);
    expect(menuAnchor(tree)).toBe('/forums');
  });

  it('owns a page anywhere inside the menu', () => {
    expect(menuOwns(tree, '/ranks/vip/perks')).toBe(true);
    expect(menuOwns(tree, '/ranks-old')).toBe(false);
  });

  it('keeps a menu that names a page from losing it', () => {
    const entries = menuEntries({
      label: 'Guides',
      to: '/guides',
      menu: 'mega',
      children: [{ label: 'One', to: '/guides/one' }]
    });

    expect(entries.map((entry) => entry.to)).toEqual([
      '/guides',
      '/guides/one'
    ]);
    expect(entries[0]?.children).toBeUndefined();
    expect(entries[0]?.menu).toBeUndefined();
  });

  it('lists only the children when there is no page to lead with', () => {
    expect(menuEntries(tree)).toEqual(tree.children);
  });

  it('leads a menu with a plain row, not with its column image', () => {
    const [lead] = menuEntries({
      label: 'Guides',
      to: '/guides',
      image: '/guides.png',
      display: 'feature',
      children: [{ label: 'One', to: '/guides/one' }]
    });

    expect(lead && menuDisplay(lead)).toBe('row');
  });

  it('draws an entry as asked, else as a card when it has an image', () => {
    expect(menuDisplay({ label: 'A' })).toBe('row');
    expect(menuDisplay({ label: 'A', image: '/a.png' })).toBe('card');
    expect(
      menuDisplay({ label: 'A', image: '/a.png', display: 'feature' })
    ).toBe('feature');
  });
});

describe('mega menu cells', () => {
  const cell = (label: string, extra: Partial<DuxtLink> = {}) => ({
    label,
    ...extra
  });

  it('counts columns from the spans, up to four, unless configured', () => {
    expect(
      megaColumns({ label: 'M', children: [cell('a', { span: 2 }), cell('b')] })
    ).toBe(3);
    expect(
      megaColumns({ label: 'M', children: Array(6).fill(cell('a')) })
    ).toBe(4);
    expect(megaColumns({ label: 'M', columns: 6, children: [] })).toBe(6);
  });

  it('draws no rule on the edge of a row', () => {
    const cells = megaCells({
      label: 'M',
      columns: 2,
      divided: true,
      children: [cell('a'), cell('b'), cell('c'), cell('d')]
    });

    expect(cells.map((placed) => placed.divided)).toEqual([
      false,
      true,
      false,
      true
    ]);
  });

  it('starts a new row for a cell that no longer fits', () => {
    const cells = megaCells({
      label: 'M',
      columns: 3,
      divided: true,
      children: [cell('a', { span: 2 }), cell('b', { span: 2 }), cell('c')]
    });

    expect(cells.map((placed) => placed.divided)).toEqual([false, false, true]);
  });

  it('lets a single cell ask for a rule, or refuse one', () => {
    const cells = megaCells({
      label: 'M',
      columns: 3,
      children: [cell('a'), cell('b', { divided: true }), cell('c')]
    });

    expect(cells.map((placed) => placed.divided)).toEqual([false, true, false]);
    expect(
      megaCells({
        label: 'M',
        columns: 2,
        divided: true,
        children: [cell('a'), cell('b', { divided: false })]
      })[1]?.divided
    ).toBe(false);
  });

  it('keeps a span within the panel', () => {
    expect(
      megaCells({
        label: 'M',
        columns: 2,
        children: [cell('a', { span: 9 })]
      })[0]?.span
    ).toBe(2);
  });
});

describe('sections with menus', () => {
  const sources = [
    { prefix: '/v1', repo: 'a', version: 'v1' },
    { prefix: '', repo: 'a', version: 'v2' }
  ];
  const sections = [
    {
      label: 'Reference',
      children: [
        { label: 'API', to: '/api' },
        { label: 'New', to: '/new' }
      ]
    }
  ];

  it('marks the entry whose menu holds the page', () => {
    expect(currentSection(sections, '/api/users')?.label).toBe('Reference');
    expect(currentSection(sections, '/other')).toBeUndefined();
  });

  it('moves nested links to the edition being read', () => {
    const [entry] = sectionsForPath(sections, sources, '/v1/api');

    expect(entry?.children?.map((child) => child.to)).toEqual([
      '/v1/api',
      '/v1/new'
    ]);
  });

  it('drops the nested links an edition does not have', () => {
    const moved = sectionsForPath(sections, sources, '/v1/api');
    const [entry] = sectionsInEdition(moved, sources, '/v1/api', [
      { path: '/v1/api' }
    ]);

    expect(entry?.children?.map((child) => child.to)).toEqual(['/v1/api']);
  });

  it('drops a menu with nothing left in it', () => {
    const moved = sectionsForPath(sections, sources, '/v1/api');

    expect(
      sectionsInEdition(moved, sources, '/v1/api', [{ path: '/v1/other' }])
    ).toEqual([]);
  });
});
