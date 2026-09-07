import { defineNuxtConfig } from 'nuxt/config';

// Consumes the layer exactly as a downstream repo does. Modules, the Content
// driver and the theme all arrive with the extend.
export default defineNuxtConfig({
  // By name, not by path: this is what a consumer writes, so the package's
  // exports map and files allowlist are exercised by the development site.
  extends: ['@kirchdev/duxt'],
  compatibilityDate: '2026-09-02',

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
