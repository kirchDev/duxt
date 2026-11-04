import { isAbsolute } from 'node:path';
import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime';
import { eventHandler, setHeader } from 'h3';
import { checksums, checksumsStructure, tables } from '#content/manifest';
import artifact from '#duxt/content-bundle-compat';
import type { createContentBundleRuntime } from './runtime';

export default defineNitroPlugin((nitro) => {
  const config = useRuntimeConfig();
  const bundles = (
    config.duxt as
      | { contentBundles?: { dir?: string; statusRoute?: boolean } }
      | undefined
  )?.contentBundles;
  const directory = process.env.DUXT_CONTENT_BUNDLE_DIR || bundles?.dir;
  if (!directory || import.meta.prerender) return;
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
  let runtime: ReturnType<typeof createContentBundleRuntime>;
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
      const [{ createContentBundleRuntime }, imageDumps] = await Promise.all([
        import('./runtime'),
        import('#content/dump')
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
        imageDumps
      });
      await runtime.activateCurrent();
    }
  );
  nitro.hooks.hook('request', () => settled);
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
        return runtime.status();
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
