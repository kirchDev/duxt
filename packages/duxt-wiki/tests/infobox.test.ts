import { expect, it } from 'vitest';
import { collectInfobox } from '../infobox';

it('extracts one body-authored infobox as text with stable keys and preserves its Markdown', () => {
  const body = {
    type: 'minimal',
    value: [
      [
        'infobox',
        { title: 'Sprint', type: 'mode', image: '/mode.png' },
        [
          'infobox-row',
          { label: 'Status', key: 'status' },
          ['p', {}, ['strong', {}, 'Available']]
        ],
        [
          'infobox-group',
          { title: 'Facts' },
          [
            'infobox-row',
            { label: 'Version' },
            ['p', {}, '1.0 ', ['a', { href: '/release' }, 'release']]
          ],
          [
            'infobox-group',
            { title: 'More', collapsed: true },
            [
              'infobox-row',
              { label: 'Beschreibung', key: 'summary' },
              ['p', {}, 'A [[Target|linked value]] and [[Other]].']
            ]
          ]
        ]
      ]
    ]
  };
  const page: Record<string, unknown> = { type: 'article', body };
  const before = structuredClone(body);
  collectInfobox(page);
  expect(page.infobox).toEqual({
    type: 'mode',
    values: {
      status: 'Available',
      Version: '1.0 release',
      summary: 'A linked value and Other.'
    }
  });
  expect(page.type).toBe('article');
  expect(body).toEqual(before);
});

it('falls back to the visible label when an authored key is blank', () => {
  const page: Record<string, unknown> = {
    body: {
      value: [
        [
          'infobox',
          { type: 'mode' },
          [
            'infobox-row',
            { label: 'Status', key: '  ' },
            ['p', {}, 'Available']
          ]
        ]
      ]
    }
  };
  collectInfobox(page);
  expect(page.infobox).toEqual({
    type: 'mode',
    values: { Status: 'Available' }
  });
});
