import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';
import type { DuxtResolvedSource } from '@kirchdev/duxt/sources-resolve';
import { loadWikiPages, WIKI_FIELDS } from '../queries';
import { renderWikiBody, wikiTokens } from '../wikilinks';
import { resolveWikiLink } from '../wikilink-resolution';

it('keeps repeated explicit links through real GFM parsing, metadata and a render copy', async () => {
  const wiki = fileURLToPath(new URL('..', import.meta.url));
  const core = fileURLToPath(new URL('../../duxt', import.meta.url));
  const root = mkdtempSync(join(wiki, '.wiki-generated-test-'));
  const write = (path: string, value: string) =>
    writeFileSync(join(root, path), value);
  const authored =
    '---\ntitle: Article\n---\n\n[[~/demo/api/List shipments|First]] · **prose** [ordinary](/wiki) · [[~/demo/api/endpoints/listshipments|Second]]\n\n[[~/demo/api/List shipments|Good before]] and \\[[~/fake]]\n\n\\[[~/fake]] and [[~/demo/api/List shipments|Good after]]\n\n~ordinary and [[~/demo/api/List shipments|Good ordinary]]\n\n\\[[~/demo/api/List shipments|Twin]] and [[~/demo/api/List shipments|Twin]]\n\n[[~/demo/api/List shipments|Twin]] and \\[[~/demo/api/List shipments|Twin]]\n\n~~[[~/demo/api/List shipments|In strike]]~~\n\n~~Real strike~~ and `[[~/demo/api/Inline]]`\n\n```md\n[[~/demo/api/Fenced]]\n```\n';
  try {
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'docs'));
    mkdirSync(join(root, 'demo'));
    write('package.json', '{"type":"module"}');
    write(
      'nuxt.config.ts',
      `import {writeFileSync} from 'node:fs'; export default defineNuxtConfig({extends:${JSON.stringify([core, wiki])},site:{url:'https://example.com'},nitro:{prerender:{routes:[],crawlLinks:false}},modules:[(_o,nuxt)=>{nuxt.hook('app:templates',()=>writeFileSync(new URL('./sources.json',import.meta.url),JSON.stringify(nuxt.options.appConfig.duxt.resolvedSources)));nuxt.hook('components:extend',components=>writeFileSync(new URL('./components.json',import.meta.url),JSON.stringify(components.map(component=>component.pascalName))))}]})`
    );
    write(
      'app.config.ts',
      `export default defineAppConfig({duxt:{title:'Wiki test',sourceOptions:{defaultLocale:'en-GB'},sources:[{path:'docs',slug:'wiki',pageType:'article',history:false},{path:'demo',slug:'demo',history:false,generated:[{type:'openapi',path:'api.json',label:'API',slug:'api'}]}]}})`
    );
    write('docs/article.md', authored);
    write('demo/index.md', '---\ntitle: Demo\n---\nDemo.');
    write(
      'api.json',
      JSON.stringify({
        openapi: '3.0.3',
        info: { title: 'API', version: '1' },
        paths: {
          '/shipments': {
            get: {
              operationId: 'listShipments',
              summary: 'List shipments',
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      })
    );
    const pack = (expected?: string) =>
      promisify(execFile)(
        process.execPath,
        [
          join(core, 'bin/duxt.mjs'),
          'content',
          'pack',
          '--publish',
          join(root, 'bundles'),
          ...(expected ? ['--expect', expected] : [])
        ],
        { cwd: root, timeout: 120_000, maxBuffer: 16 * 1024 * 1024 }
      );
    await pack();
    const sources = JSON.parse(
      readFileSync(join(root, 'sources.json'), 'utf8')
    ) as DuxtResolvedSource[];
    const id = readFileSync(join(root, 'bundles/current'), 'utf8').trim();
    const bundle = JSON.parse(
      readFileSync(join(root, 'bundles', id, 'bundle.json'), 'utf8')
    );
    const expected = join(root, 'expected.json');
    write(
      'expected.json',
      JSON.stringify({
        compatHash: bundle.compatHash,
        availableComponents: JSON.parse(
          readFileSync(join(root, 'components.json'), 'utf8')
        )
      })
    );
    await pack(expected);
    const database = new DatabaseSync(':memory:');
    try {
      const dumps = join(root, 'bundles', id, 'dumps');
      for (const file of readdirSync(dumps).filter((file) =>
        file.endsWith('.txt')
      ))
        for (const sql of JSON.parse(
          gunzipSync(
            Buffer.from(readFileSync(join(dumps, file), 'utf8'), 'base64')
          ).toString()
        ))
          database.exec(sql);
      const source = sources.find((source) => source.prefix === '/wiki')!;
      const stored = database
        .prepare(
          `SELECT rawbody, body, links FROM "_content_${source.collection}" WHERE path = '/wiki/article'`
        )
        .get()!;
      const body = JSON.parse(String(stored.body));
      const before = JSON.stringify(body);
      expect(stored.rawbody).toBe(authored);
      expect(
        JSON.parse(String(stored.links))
          .filter((link: { kind: string }) => link.kind === 'wiki')
          .map((link: { target: string }) => link.target)
      ).toEqual([
        '~/demo/api/List shipments',
        '~/demo/api/endpoints/listshipments'
      ]);
      const pages = await loadWikiPages(
        async (collection, offset, limit) =>
          database
            .prepare(
              `SELECT ${WIKI_FIELDS.map((field) => '"' + field + '"').join(',')} FROM "_content_${collection}" ORDER BY path LIMIT ? OFFSET ?`
            )
            .all(limit, offset)
            .map((row) => ({
              ...row,
              links: JSON.parse(String(row.links)),
              aliases: JSON.parse(String(row.aliases)),
              categories: JSON.parse(String(row.categories))
            })),
        sources.map((source) => source.collection)
      );
      const context = { source, sources, locale: 'en-GB' };
      const resolved: string[] = [];
      const rendered = renderWikiBody(
        body,
        (token) => {
          resolved.push(token.label);
          return resolveWikiLink(pages, token, context);
        },
        authored
      );
      const text = JSON.stringify(rendered);
      expect(text).toContain(
        '["a",{"href":"~/demo/api/endpoints/listshipments"},"First"]'
      );
      expect(text).toContain(
        '["a",{"href":"~/demo/api/endpoints/listshipments"},"Second"]'
      );
      expect(text).toContain('["del",{},"Real strike"]');
      expect(text).toContain('["strong",{},"prose"]');
      expect(text).toContain('["a",{"href":"/wiki"},"ordinary"]');
      expect(text).toContain('[[~/demo/api/Inline]]');
      expect(text).toContain('[[~/demo/api/Fenced]]');
      expect(resolved).toEqual([
        'First',
        'Second',
        'Good before',
        'Good after',
        'Good ordinary',
        'Twin',
        'Twin',
        'In strike'
      ]);
      expect(text.match(/\[\[~\/fake\]\]/g)).toHaveLength(2);
      expect(
        text.match(/\[\[~\/demo\/api\/List shipments\|Twin\]\]/g)
      ).toHaveLength(2);
      expect(JSON.stringify(body)).toBe(before);
      expect(wikiTokens(authored)).toHaveLength(8);
      const accepted = readFileSync(join(root, 'bundles/current'), 'utf8');
      write(
        'docs/article.md',
        authored + '\n::unshipped-wiki-widget\nUnavailable.\n::\n'
      );
      await expect(pack(expected)).rejects.toThrow(
        /unavailable MDC components:.*UnshippedWikiWidget/
      );
      expect(readFileSync(join(root, 'bundles/current'), 'utf8')).toBe(
        accepted
      );
    } finally {
      database.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 180_000);
