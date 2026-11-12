import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime';

/**
 * Content's internal queries reuse the runtime config the process already has.
 *
 * Content answers every `queryCollection()` on the server through an internal
 * request to `/__nuxt_content/<collection>/query`, and Nitro treats each one as
 * a request of its own. @nuxtjs/i18n initialises its context on every request
 * through `useRuntimeConfig(event)`, and the first such call per request clones
 * the whole runtime config and derives an environment variable name for every
 * key. A docs page on duxt.app made 26 of those queries: 27 copies of about
 * 1,300 keys per rendered page, roughly a third of its render time, in the
 * prerender as at runtime.
 *
 * The internal request reads the same configuration the page around it does.
 * Where the environment is the process's own — a Node server or the prerender
 * — the config Nitro resolved once at startup IS that answer, so the internal
 * request is handed it before any hook clones another. A Worker can carry
 * per-request bindings, so a request with a Cloudflare context keeps Nitro's
 * own behaviour.
 *
 * Registered first among the Nitro plugins by `modules/shared-runtime-config`,
 * so it runs before the i18n hook that would make the copy.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    if (!event.path.startsWith('/__nuxt_content/')) return;
    if (event.context.cloudflare) return;

    const nitro = (event.context.nitro ??= { errors: [] }) as {
      runtimeConfig?: unknown;
    };
    nitro.runtimeConfig ??= useRuntimeConfig();
  });
});
