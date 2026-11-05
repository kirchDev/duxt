import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  defineNitroPlugin,
  useRuntimeConfig,
  useStorage,
  getRouteRules
} from 'nitropack/runtime';
import type { H3Event } from 'h3';
import {
  eventHandler,
  setHeader,
  setHeaders,
  sendRedirect,
  serveStatic
} from 'h3';
import { checksums, checksumsStructure, tables } from '#content/manifest';
import artifact from '#duxt/content-bundle-compat';
import type { createContentBundleRuntime } from './runtime';

export default defineNitroPlugin((nitro) => {
  const config = useRuntimeConfig();
  const bundles = (
    config.duxt as
      | {
          contentBundles?: {
            dir?: string;
            statusRoute?: boolean;
            pollSeconds?: number;
          };
        }
      | undefined
  )?.contentBundles;
  const directory = process.env.DUXT_CONTENT_BUNDLE_DIR || bundles?.dir;
  let runtime: ReturnType<typeof createContentBundleRuntime>;
  if (import.meta.prerender) return;
  const overrides =
    (config.duxt as { redirectOverrides?: string[] })?.redirectOverrides ?? [];
  const fallback = (
    config.duxt as {
      imageRedirects?: Record<
        string,
        { redirect: { to: string; statusCode: 301 } }
      >;
    }
  )?.imageRedirects;
  nitro.h3App.stack.unshift({
    route: '/',
    handler: eventHandler(async (event) => {
      const rules = getRouteRules(event);
      if (rules.redirect) return;
      const path = event.path.split('?')[0]!;
      if (overrides.includes(path)) return;
      const redirect =
        directory && runtime?.status().active
          ? runtime.redirect(path)
          : fallback?.[path]?.redirect;
      if (redirect) {
        if (rules.headers) setHeaders(event, rules.headers);
        let target = redirect.to;
        if (event.path.includes('?')) {
          const url = new URL(target, 'http://duxt.invalid');
          const query = new URLSearchParams(
            event.path.slice(event.path.indexOf('?') + 1)
          );
          // Nitro merges incoming keys over the target and keeps repeated values.
          for (const key of new Set(query.keys())) {
            url.searchParams.delete(key);
            for (const value of query.getAll(key))
              url.searchParams.append(key, value);
          }
          target = url.pathname + url.search + url.hash;
        }
        return sendRedirect(event, target, redirect.statusCode);
      }
    })
  });
  if (!directory) return;
  const database = config.content.database as {
    type: string;
    filename: string;
  };
  if (database.type !== 'sqlite' || database.filename === ':memory:') {
    console.warn(
      '[duxt] content bundle ' +
        JSON.stringify({
          id: null,
          commit: null,
          reason: 'Content bundles require a file-backed Node SQLite database.'
        })
    );
    return;
  }
  const warnings: string[] = [];
  const readers = new Set<Promise<void>>();
  const release = new WeakMap<H3Event, () => void>();
  const settled = new Promise<void>((resolve) => setImmediate(resolve)).then(
    async () => {
      // Nitro's dependent plugin chunks run before its entry initializes this URL.
      // Wait one event-loop turn: resolving it synchronously captures file:///_entry.js.
      // Content uses the initialized Nitro-wide URL for the same relative filename.
      const base = (
        globalThis as typeof globalThis & { _importMeta_: { url: string } }
      )._importMeta_.url;
      let filename = isAbsolute(database.filename)
        ? database.filename
        : new URL(database.filename, base).pathname;
      if (process.platform === 'win32' && filename.startsWith('/'))
        filename = filename.slice(1);
      const mediaPath = resolve(directory, 'active/media');
      const configured = (
        config.ipx as { fs?: { dir?: string | string[] } } | undefined
      )?.fs?.dir;
      const entry =
        (globalThis as typeof globalThis & { __nitro_main__?: string })
          .__nitro_main__ ?? base;
      const roots = (
        Array.isArray(configured) ? configured : configured ? [configured] : []
      ).map((path) =>
        isAbsolute(path) ? resolve(path) : fileURLToPath(new URL(path, entry))
      );
      if (!roots.some((root) => resolve(root) === mediaPath)) {
        const reason =
          'NUXT_IPX_FS_DIR must include ' +
          mediaPath +
          ' alongside the ordinary image roots before process start.';
        warnings.push(reason);
        console.warn(
          '[duxt] content bundle ' +
            JSON.stringify({ id: null, commit: null, reason })
        );
      }
      const [
        { createContentBundleRuntime },
        imageDumps,
        { clearOgPayloads },
        { clearDuxtMcpPaths }
      ] = await Promise.all([
        import('./runtime'),
        import('#content/dump'),
        import('#duxt/content-bundle-caches'),
        import('../../../server/utils/mcp-docs')
      ]);
      runtime = createContentBundleRuntime({
        directory,
        filename,
        artifact,
        compat: {
          databaseVersion: config.content.databaseVersion,
          checksumsStructure,
          tables
        },
        checksums,
        imageDumps,
        pollSeconds: bundles?.pollSeconds,
        beforeActivate: async () => {
          await Promise.all(readers);
        },
        onActivate: async () => {
          clearDuxtMcpPaths();
          delete (nitro as typeof nitro & { _ogImagePublishedImages?: unknown })
            ._ogImagePublishedImages;
          const og = config['nuxt-og-image'] as
            | { baseCacheKey?: string | false; publish?: { storage?: string } }
            | undefined;
          // clear(prefix) only visits mounted drivers, so a nested prefix in
          // Nitro's ordinary cache driver otherwise retains every old entry.
          const remove = async (prefix: string) => {
            const storage = useStorage(prefix);
            await Promise.all(
              (await storage.getKeys()).map((key) => storage.removeItem(key))
            );
          };
          await Promise.all([
            remove('sitemap'),
            ...(og?.baseCacheKey ? [remove(og.baseCacheKey)] : []),
            ...(og?.publish?.storage
              ? [remove(og.publish.storage + ':manifest')]
              : []),
            clearOgPayloads()
          ]);
        }
      });
      await runtime.activateCurrent();
      const stop = runtime.startPolling();
      nitro.hooks.hook('close', stop);
    }
  );
  nitro.hooks.hook('request', async (event) => {
    await settled;
    // Nitro's local fetches have no remote socket. Let a running render finish
    // its nested lookups while new HTTP requests wait outside the activation.
    if (!event.node.req.socket.remoteAddress) return;
    await runtime.settled();
    // This request holds one activation until its response and background work finish.
    event.context.duxtContentBundleChecksums = { ...checksums };
    if (
      event.method !== 'GET' ||
      event.headers.get('accept')?.includes('text/event-stream')
    )
      return;
    let done!: () => void;
    const reading = new Promise<void>((resolve) => {
      done = resolve;
    });
    readers.add(reading);
    release.set(event, () => {
      readers.delete(reading);
      done();
    });
  });
  nitro.hooks.hook('afterResponse', async (event) => {
    try {
      // Sitemap SWR writes run in waitUntil after the response body is ready.
      const pending = event.context.nitro?._waitUntilPromises;
      let consumed = 0;
      while (pending && consumed < pending.length) {
        const batch = pending.slice(consumed);
        consumed = pending.length;
        await Promise.allSettled(batch);
      }
    } finally {
      release.get(event)?.();
      release.delete(event);
    }
  });
  nitro.h3App.stack.unshift({
    route: '/',
    handler: eventHandler(async (event) => {
      await settled;
      const path = event.path.split('?')[0];
      if (
        event.method === 'GET' &&
        bundles?.statusRoute === true &&
        path === '/__duxt/content-bundle'
      )
        return { ...runtime.status(), warnings };
      if (runtime.status().active && path?.startsWith('/_duxt/media/')) {
        const rules = getRouteRules(event);
        if (rules.redirect) return;
        if (rules.headers) setHeaders(event, rules.headers);
        return serveStatic(event, {
          getMeta: (id) => {
            const media = runtime.media(id);
            return media
              ? { size: media.bytes.length, type: media.type, etag: media.etag }
              : undefined;
          },
          getContents: (id) => runtime.media(id)?.bytes
        });
      }
      const collection =
        /^\/__nuxt_content\/([A-Za-z0-9_-]+)\/sql_dump\.txt$/.exec(path!)?.[1];
      if (event.method === 'GET' && collection) {
        const dump = runtime.dump(collection);
        if (dump !== undefined) {
          setHeader(event, 'content-type', 'text/plain; charset=utf-8');
          return dump;
        }
      }
    })
  });
});
