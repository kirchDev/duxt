import { expect, it } from 'vitest';
import { resolveSources } from '../build/sources/sources-resolve';
import { duxtPageMarkdown } from '../server/utils/page-markdown';

it('keeps authored text by default and permits one request-bound output formatter without mutating rawbody', async () => {
  const source = resolveSources([{ path: 'docs' }])[0]!;
  const input = {
    rawbody: '---\ntitle: Authored\n---\n\n[[Target]]',
    path: '/guide',
    source,
    locale: 'en'
  };
  expect(await duxtPageMarkdown({ context: {} } as never, input)).toBe(
    '[[Target]]'
  );
  const event = {
    context: {
      duxtMarkdown: async (page: { markdown: string; path: string }) =>
        page.path === '/guide' && page.markdown === '[[Target]]'
          ? '[Target](/target)'
          : 'Wrong page'
    }
  };
  expect(await duxtPageMarkdown(event as never, input)).toBe(
    '[Target](/target)'
  );
  expect(input.rawbody).toBe('---\ntitle: Authored\n---\n\n[[Target]]');
});
