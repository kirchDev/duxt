import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect, test } from 'vitest';
import {
  linkWarnings,
  walk,
  type PageRecord,
  type SourceRecord
} from '../../../packages/duxt/build/cli/validate-report';

const site = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(
  new URL('../../../packages/duxt/package.json', import.meta.url)
);
const contentRequire = createRequire(require.resolve('@nuxt/content'));
const { parseMarkdown } = await import(
  pathToFileURL(
    join(dirname(contentRequire.resolve('@nuxtjs/mdc')), 'runtime/index.js')
  ).href
);

const { fromHast } = await import(
  pathToFileURL(contentRequire.resolve('minimark/hast')).href
);

async function page(
  file: string,
  collection: string,
  path: string
): Promise<PageRecord> {
  const body = await parseMarkdown(readFileSync(file, 'utf8'), {
    highlight: false
  });
  const collected = {
    anchors: new Set<string>(),
    links: [] as { href: string }[],
    commands: [] as string[]
  };
  walk(fromHast(body.body), collected);
  return { collection, path, file: relative(site, file), ...collected };
}

function markdown(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory()
      ? markdown(file)
      : entry.name.endsWith('.md')
        ? [file]
        : [];
  });
}

test('public wiki Markdown links stay valid without the internal fixture sources', async () => {
  const sources: SourceRecord[] = [
    {
      collection: 'wiki-demo',
      prefix: '/demo/wiki',
      locale: 'en-GB',
      isDefaultLocale: true
    },
    { collection: 'wiki-demo-de', prefix: '/demo/wiki', locale: 'de' }
  ];
  const pages: PageRecord[] = [];
  for (const [folder, collection] of [
    ['wiki', 'wiki-demo'],
    ['wiki-de', 'wiki-demo-de']
  ] as const) {
    const root = join(site, 'demo', folder);
    for (const file of markdown(root)) {
      const name = relative(root, file)
        .replace(/\.md$/, '')
        .replace(/(?:^|\/)index$/, '');
      pages.push(
        await page(file, collection, `/demo/wiki${name ? `/${name}` : ''}`)
      );
    }
  }
  for (const [index, prefix] of [
    '/demo',
    '/demo/main',
    '/demo/v2.x',
    '/demo/v1.x'
  ].entries()) {
    const collection = `infobox-scope-${index}`;
    sources.push({ collection, prefix, isDefaultLocale: true });
    const scope = await page(
      join(site, 'demo/docs/6.infobox-scope.md'),
      collection,
      `${prefix}/infobox-scope`
    );
    expect
      .soft(scope.links)
      .toContainEqual({ href: '~/demo/wiki/crown-light' });
    pages.push(scope);
  }
  expect(linkWarnings(sources, pages)).toEqual([]);
});
