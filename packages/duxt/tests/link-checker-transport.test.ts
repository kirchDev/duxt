import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const checkerEntry = require.resolve('nuxt-link-checker');
const checkerRequire = createRequire(checkerEntry);
const { crawlFetch, getLinkResponse } = await import(
  new URL('./runtime/shared/crawl.js', pathToFileURL(checkerEntry)).href
);
const { createPrerenderFetch } = await import(
  pathToFileURL(checkerRequire.resolve('nuxtseo-shared/prerender')).href
);

// Match Nitro 2's actual module boundary. Both the checker and the prerender
// fetch adapter are the installed implementations, including ofetch's URL join.
let directory: string;
let client: ReturnType<typeof createPrerenderFetch>;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'duxt-link-checker-'));
  await writeFile(
    join(directory, 'index.mjs'),
    `export async function localFetch(path, options) {
      if (path === '/missing') return new Response(null, { status: 404 });
      if (path === '/headless' && options.method === 'HEAD') {
        return new Response(null, { status: 405 });
      }
      return new Response(null, {
        status: 200,
        headers: { 'x-local-path': path, 'x-local-method': options.method }
      });
    }`
  );
  client = createPrerenderFetch(
    { options: { builder: true, output: { serverDir: directory } } },
    2
  );
});
afterAll(async () => {
  await client?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

function local(path: string) {
  return getLinkResponse({
    link: path,
    fetchRemoteUrls: false,
    isInStorage: () => false,
    baseURL: 'https://unreachable.example.invalid',
    fetch: client.fetch,
    timeout: 1000
  });
}

describe('LinkChecker internal prerender transport', () => {
  it.each(['/demo/v1.x', '/de-DE/v0.11.0', '/guide?q=one%20two'])(
    'checks an uncached internal URL locally: %s',
    async (path) => {
      const response = await local(path);
      expect(response.status).toBe(200);
      expect(response.headers['x-local-path']).toBe(path);
    }
  );

  it('still reports a real missing page', async () => {
    expect((await local('/missing')).status).toBe(404);
  });

  it('keeps the GET fallback local when HEAD is unsupported', async () => {
    const response = await local('/headless');
    expect(response.status).toBe(200);
    expect(response.headers['x-local-method']).toBe('GET');
  });

  it('still resolves relative URLs against baseURL without a prerender client', async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'x-network-response': 'yes' });
      response.end();
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve)
    );
    try {
      const address = server.address();
      if (!address || typeof address === 'string')
        throw new Error('No test port');
      const response = await crawlFetch('/network', {
        baseURL: `http://127.0.0.1:${address.port}`,
        timeout: 1000
      });
      expect(response.status).toBe(200);
      expect(response.headers['x-network-response']).toBe('yes');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });
});
