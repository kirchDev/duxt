import { expect, it } from 'vitest';
import { collectWikiMetadata } from '../metadata';

it('stores unresolved authored links and ignores code', () => {
  const page: Record<string, unknown> = {
    categories: [' Modes ', 'Modes', 'Élite'],
    aliases: ['Quick', ''],
    body: {
      value: [
        [
          'p',
          {},
          ['a', { href: '/target#part' }, 'Link'],
          ' [[Élite|Label]] and [[Missing#Section]]'
        ],
        ['pre', {}, ['code', {}, '[[Ignored]]']],
        ['p', {}, ['code', {}, '[[Inline]]']]
      ]
    }
  };
  collectWikiMetadata(page);
  expect(page.links).toEqual([
    { target: '/target#part', kind: 'markdown' },
    { target: 'Élite', kind: 'wiki' },
    { target: 'Missing#Section', kind: 'wiki' }
  ]);
  expect(page.categories).toEqual(['Modes', 'Élite']);
  expect(page.aliases).toEqual(['Quick']);
});
