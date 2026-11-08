import { spawnSync } from 'node:child_process';
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

it.each([
  ['[[First]][[Second]]', ['First', 'Second']],
  ['[[  Élite#part?x=1 | Display|extra ]]', ['Élite#part?x=1']],
  ['[[outer[[inner]]', ['outer[[inner']],
  ['[[[Inner]]]', ['[Inner']],
  ['[[Broken] then [[Good]]', ['Good']],
  ['[[Broken\n[[Good]]', ['Good']],
  ['[[With\rReturn]]', ['With\rReturn']],
  ['\\[[Escaped]]', ['Escaped']],
  ['[[]] [[|Label]] [[  ]] [[unterminated', []]
])('preserves stored wikilink targets in %j', (text, targets) => {
  const page: Record<string, unknown> = {
    body: { value: [['callout', {}, text]] }
  };
  collectWikiMetadata(page);
  expect(page.links).toEqual(
    targets.map((target) => ({ target, kind: 'wiki' }))
  );
});

it('finishes repeated unmatched openers and adjacent valid links', () => {
  // A child timeout bounds a synchronous parser regression without hanging Vitest.
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `
        import { collectWikiMetadata } from ${JSON.stringify(new URL('../metadata.ts', import.meta.url).href)};
        const text = '[[' + String.fromCharCode(91, 91, 92, 92).repeat(500_000);
        const page = { body: { value: [text + '\\n[[After|Label]]'] } };
        collectWikiMetadata(page);
        const adjacent = { body: { value: ['[[Repeated]]'.repeat(200_000)] } };
        collectWikiMetadata(adjacent);
        process.stdout.write(JSON.stringify([page.links, adjacent.links]));
      `
    ],
    { encoding: 'utf8', timeout: 5_000 }
  );
  expect(result.error, result.stderr).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual([
    [{ target: 'After', kind: 'wiki' }],
    [{ target: 'Repeated', kind: 'wiki' }]
  ]);
}, 10_000);
