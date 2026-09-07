import { readFileSync } from 'node:fs';
import { defineNuxtConfig } from 'nuxt/config';

/**
 * The version this site documents, read rather than typed.
 *
 * duxt's own `package.json`, one directory up — the file release-please bumps.
 * A number written into `app.config.ts` would be a second copy of it, wrong
 * from the first release onwards, which is the mistake the layer default
 * `version: 'v0.0.0'` made for every site that extended it.
 *
 * It goes through `appConfig` here rather than `app.config.ts` because that
 * file is a RUNTIME module — it is compiled for the browser and cannot read a
 * file. `nuxt.config.ts` is build code, so it can. The generated template
 * merges `appConfig` BEHIND `app.config.ts`, so this stands only as long as no
 * human writes a `version` there, which is the right way round.
 *
 * The `v` is added here: `package.json` holds `0.0.0`, and every place duxt
 * shows a version prefixes it — `DuxtFooter` does the same.
 */
const version = (() => {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    ) as { version?: string };

    return pkg.version ? `v${pkg.version}` : undefined;
  } catch {
    // Absent rather than guessed: the badge and the hero pill both draw
    // nothing without it, which beats a number nobody can trace.
    return undefined;
  }
})();

// Consumes the layer exactly as a downstream repo does. Modules, the Content
// driver and the theme all arrive with the extend.
export default defineNuxtConfig({
  // By name, not by path: this is what a consumer writes, so the package's
  // exports map and files allowlist are exercised by the development site.
  extends: ['@kirchdev/duxt'],
  compatibilityDate: '2026-09-02',

  appConfig: { duxt: { version } },

  // Appended to the layer's own entry, never replacing it: Nuxt concatenates
  // `css` with the extending app's last, which is exactly the order these
  // overrides need — same specificity, later wins.
  css: ['~/assets/css/brand.css'],

  // This site's own branding, not the layer's. The layer stays unbranded on
  // purpose — a consumer extending it wants their own mark in the tab, so the
  // icons live here in the consuming site rather than in the published package.
  //
  // The SVG carries the whole job: one file, sharp at every size, and its own
  // `prefers-color-scheme` rule inside so the mark lightens against a dark tab
  // strip. The PNG exists only because iOS ignores SVG icons.
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
    }
  },

  // Dev over a public tunnel: the HMR client otherwise dials ws://localhost,
  // which a phone on the other side of the tunnel cannot reach — the page
  // loads and then never updates. Only when the variable is set, so a normal
  // `nuxt dev` is untouched.
  vite: process.env.DUXT_TUNNEL
    ? { server: { hmr: { protocol: 'wss', clientPort: 443 } } }
    : undefined
});
