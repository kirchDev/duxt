import { expect, it } from 'vitest';
import { loadInfoboxPages, selectInfoboxPages } from '../query-infobox';

it('filters text after locale overlay, keeping translated keys stable and the first collection authoritative', async () => {
  const data: Record<string, unknown[]> = {
    de: [
      {
        path: '/wiki/sprint',
        title: 'Sprint DE',
        infobox: {
          type: 'mode',
          values: { status: 'Available', version: '01' }
        }
      },
      { path: '/wiki/hidden', title: 'Versteckt', infobox: null }
    ],
    en: [
      {
        path: '/wiki/sprint',
        title: 'Sprint EN',
        infobox: { type: 'mode', values: { status: 'Unavailable' } }
      },
      {
        path: '/wiki/hidden',
        title: 'Hidden',
        infobox: { type: 'mode', values: { status: 'Available' } }
      },
      {
        path: '/wiki/other',
        title: 'Other',
        infobox: { type: 'mode', values: { status: 'Available', version: '1' } }
      },
      {
        path: '/wiki/tool',
        title: 'Tool',
        infobox: { type: 'tool', values: { status: 'Available' } }
      }
    ]
  };
  const pages = await loadInfoboxPages(
    async (collection, offset, limit) =>
      data[collection]!.slice(offset, offset + limit),
    ['de', 'en']
  );
  expect(
    selectInfoboxPages(pages, 'mode', 'status=Available').map(
      (row) => row.title
    )
  ).toEqual(['Sprint DE', 'Other']);
  expect(
    selectInfoboxPages(pages, 'mode', 'version=01').map((row) => row.path)
  ).toEqual(['/wiki/sprint']);
  expect(selectInfoboxPages(pages, 'mode', 'status=Missing')).toEqual([]);
  expect(selectInfoboxPages(pages, 'mode', 'not-a-comparison')).toEqual([]);
});
