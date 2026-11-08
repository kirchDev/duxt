import { expect, it } from 'vitest';
import { formatWikiMarkdown, renderWikiBody, wikiTokens } from '../wikilinks';

it('formats the public wiki syntax while preserving fenced and inline literals', () => {
  const authored =
    '[[Target]] [[Fast|Label]] [[guide/page#Part]] [[Missing]]\n\n`[[Target]]`\n\n```md\n[[Target]]\n```';
  expect(
    wikiTokens(authored).map(({ target, label, section }) => ({
      target,
      label,
      section
    }))
  ).toEqual([
    { target: 'Target', label: 'Target', section: '' },
    { target: 'Fast', label: 'Label', section: '' },
    { target: 'guide/page', label: 'guide/page#Part', section: 'Part' },
    { target: 'Missing', label: 'Missing', section: '' }
  ]);
  expect(
    formatWikiMarkdown(authored, ({ target, section }) =>
      target === 'Missing' ? undefined : `/wiki/target${section ? '#part' : ''}`
    )
  ).toBe(
    '[Target](/wiki/target) [Label](/wiki/target) [guide/page#Part](/wiki/target#part) Missing\n\n`[[Target]]`\n\n```md\n[[Target]]\n```'
  );
});

it('renders ordinary anchors in a copy, retaining authored labels and literal code', () => {
  const body = {
    type: 'minimal',
    value: [
      ['p', {}, 'Before [[Fast|A label]] and [[Missing]].'],
      ['pre', {}, ['code', {}, '[[Fast]]']]
    ]
  };
  const before = JSON.stringify(body);
  expect(
    renderWikiBody(body, (token) => ({
      href:
        token.target === 'Missing'
          ? '/wiki/wanted?title=Missing'
          : '/wiki/target',
      wanted: token.target === 'Missing'
    }))
  ).toEqual({
    type: 'minimal',
    value: [
      [
        'p',
        {},
        'Before ',
        ['a', { href: '~/wiki/target' }, 'A label'],
        ' and ',
        [
          'a',
          {
            href: '~/wiki/wanted?title=Missing',
            class: 'wiki-red-link',
            rel: 'nofollow',
            'data-wiki-red-link': ''
          },
          'Missing'
        ],
        '.'
      ],
      ['pre', {}, ['code', {}, '[[Fast]]']]
    ]
  });
  expect(JSON.stringify(body)).toBe(before);
});
