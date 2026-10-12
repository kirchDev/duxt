import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import duxtDocumentationMedia from '../modules/documentation-media';
import type { Nuxt } from '@nuxt/schema';
import { duxtSources } from '../build/sources/sources';
import { documentationImageUrl } from '../build/sources/documentation-media';
import type { DocumentationMedia } from '../build/sources/documentation-media';

vi.mock('@nuxt/content', async (importOriginal) => {
  const content = await importOriginal<typeof import('@nuxt/content')>();
  return {
    ...content,
    defineCollection: (
      collection: Parameters<typeof content.defineCollection>[0]
    ) => content.defineCollection({ ...collection, schema: undefined })
  };
});
vi.mock('@nuxtjs/sitemap/content', () => ({
  defineSitemapSchema: ({ z }: { z: typeof import('@nuxt/content').z }) =>
    z.object({})
}));

it('loads remote tags and shared/localized images from their own checkout despite colliding filenames', async () => {
  const root = mkdtempSync(join(tmpdir(), 'duxt-remote-media-'));
  const cwd = process.cwd();
  const checkout = join(root, 'checkout');
  const remotes = join(root, 'remotes');
  mkdirSync(checkout);
  mkdirSync(join(remotes, 'acme'), { recursive: true });
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', checkout, ...args], { stdio: 'pipe' });
  const server = createServer((request, response) => {
    const url = new URL(request.url!, 'http://localhost');
    const child = spawn('git', ['http-backend'], {
      env: {
        ...process.env,
        GIT_PROJECT_ROOT: remotes,
        GIT_HTTP_EXPORT_ALL: '1',
        PATH_INFO: url.pathname,
        QUERY_STRING: url.search.slice(1),
        REQUEST_METHOD: request.method,
        CONTENT_TYPE: request.headers['content-type'] ?? ''
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    request.pipe(child.stdin);
    let headers = Buffer.alloc(0);
    let sent = false;
    child.stdout.on('data', (chunk: Buffer) => {
      if (sent) {
        response.write(chunk);
        return;
      }
      headers = Buffer.concat([headers, chunk]);
      const end = headers.indexOf('\r\n\r\n');
      if (end < 0) return;
      for (const line of headers.subarray(0, end).toString().split('\r\n')) {
        const colon = line.indexOf(':');
        const key = line.slice(0, colon);
        const value = line.slice(colon + 1).trim();
        if (key === 'Status') response.statusCode = Number(value.split(' ')[0]);
        else response.setHeader(key, value);
      }
      sent = true;
      response.write(headers.subarray(end + 4));
    });
    child.on('close', () => response.end());
    child.stderr.resume();
  });
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Media fixture');
    git('config', 'user.email', 'fixture@example.invalid');
    for (const directory of [
      'docs/_assets',
      'docs/de/_assets',
      'docs/_partials',
      'docs/de/_partials'
    ])
      mkdirSync(join(checkout, directory), { recursive: true });
    writeFileSync(
      join(checkout, 'docs/_partials/capture.md'),
      '![Media](../_assets/demo.gif)'
    );
    writeFileSync(
      join(checkout, 'docs/de/_partials/capture-de.md'),
      '![Media](../_assets/demo.gif)'
    );
    writeFileSync(join(checkout, 'docs/index.md'), '# Docs');
    writeFileSync(join(checkout, 'docs/de/index.md'), '# Dokumentation');
    writeFileSync(join(checkout, 'docs/_assets/demo.tape'), 'private source');
    for (const version of ['v1', 'v2']) {
      writeFileSync(
        join(checkout, 'docs/_assets/demo.gif'),
        `${version} shared`
      );
      writeFileSync(
        join(checkout, 'docs/de/_assets/demo.gif'),
        `${version} German`
      );
      git('add', '.');
      git('commit', '-m', version);
      git('tag', version);
    }
    execFileSync(
      'git',
      ['clone', '--bare', checkout, join(remotes, 'acme/docs.git')],
      { stdio: 'pipe' }
    );
    execFileSync(
      'git',
      ['clone', '--bare', checkout, join(remotes, 'acme/other.git')],
      { stdio: 'pipe' }
    );
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve)
    );
    const address = server.address() as { port: number };
    process.chdir(checkout);
    const hooks = new Map<string, (context: never) => void>();
    duxtDocumentationMedia({}, {
      options: { rootDir: checkout },
      hook: (name, handler) => hooks.set(name, handler)
    } as unknown as Nuxt);
    const collections = duxtSources([
      {
        repo: `http://127.0.0.1:${address.port}/acme/docs.git`,
        path: 'docs',
        slug: 'docs',
        refs: [{ tag: 'v1' }, { tag: 'v2' }],
        locales: ['en', 'de']
      },
      {
        repo: `http://127.0.0.1:${address.port}/acme/other.git`,
        path: 'docs',
        slug: 'other',
        refs: [{ tag: 'v1' }]
      }
    ]);
    const urls = new Set<string>();
    for (const [name, collection] of Object.entries(collections)) {
      if (name.startsWith('duxt_partials')) {
        const localized = name.endsWith('_de');
        for (const partialSource of collection.source!) {
          await partialSource.prepare!({ rootDir: root });
          expect(await partialSource.getKeys!()).toContain(
            localized ? '_partials/capture-de.md' : '_partials/capture.md'
          );
        }
        const partialUrls = new Set<string>();
        for (const partialSource of collection.source!) {
          const content = {
            body: { value: [['img', { src: '../_assets/demo.gif' }]] }
          };
          const file = join(
            partialSource.cwd,
            localized
              ? 'docs/de/_partials/capture-de.md'
              : 'docs/_partials/capture.md'
          );
          hooks.get('content:file:afterParse')!({
            file: { path: file },
            collection,
            content
          } as never);
          const url = (content.body.value[0]![1] as { src: string }).src;
          expect(url).toMatch(/^\/_duxt\/media\/[^/]+\//);
          expect(
            readFileSync(join(checkout, '.data/duxt-media/public', url), 'utf8')
          ).toBe(localized ? 'v2 German' : 'v2 shared');
          partialUrls.add(url);
        }
        expect(partialUrls.size).toBe(collection.source!.length);
        continue;
      }
      const source = collection.source![0]!;
      await source.prepare!({ rootDir: root });
      const keys = await source.getKeys!();
      expect(keys).toContain('index.md');
      expect(keys.some((key) => key.includes('_assets'))).toBe(false);
      const media = (source as unknown as { duxtMedia: DocumentationMedia })
        .duxtMedia;
      const localized = name.endsWith('_de');
      const file = join(
        source.cwd,
        localized ? 'docs/de/index.md' : 'docs/index.md'
      );
      const shared = documentationImageUrl(
        localized ? '../_assets/demo.gif' : '_assets/demo.gif',
        file,
        media
      );
      const version = name.includes('v2') ? 'v2' : 'v1';
      expect(
        readFileSync(join(checkout, '.data/duxt-media/public', shared), 'utf8')
      ).toBe(`${version} shared`);
      if (localized) {
        const translated = documentationImageUrl(
          '_assets/demo.gif',
          file,
          media
        );
        expect(
          readFileSync(
            join(checkout, '.data/duxt-media/public', translated),
            'utf8'
          )
        ).toBe(`${version} German`);
        expect(translated).not.toBe(shared);
      } else urls.add(shared);
    }
    expect(urls.size).toBe(3);
  } finally {
    process.chdir(cwd);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(root, { recursive: true, force: true });
  }
}, 30_000);
