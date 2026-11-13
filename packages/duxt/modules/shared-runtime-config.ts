import { fileURLToPath } from 'node:url';
import type { Nuxt } from '@nuxt/schema';

/**
 * Puts the shared-runtime-config plugin FIRST among Nitro's plugins.
 *
 * Its `request` hook has to run before @nuxtjs/i18n's, which clones the
 * runtime config for every request it sees; hooks run in the order their
 * plugins registered them, and a layer's `server/plugins` come after every
 * module's. See `runtime/shared-runtime-config/plugin.ts` for what it saves.
 */
export default function duxtSharedRuntimeConfig(_options: unknown, nuxt: Nuxt) {
  if (nuxt.options.dev) return;

  nuxt.hook('nitro:config', (nitro) => {
    nitro.plugins = [
      fileURLToPath(
        new URL('./runtime/shared-runtime-config/plugin.ts', import.meta.url)
      ),
      ...(nitro.plugins ?? [])
    ];
  });
}
