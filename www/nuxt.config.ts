import { defineNuxtConfig } from 'nuxt/config';

// Consumes the layer exactly as a downstream repo does. Modules, the Content
// driver and the theme all arrive with the extend.
export default defineNuxtConfig({
  // By name, not by path: this is what a consumer writes, so the package's
  // exports map and files allowlist are exercised by the development site.
  extends: ['@kirchdev/duxt'],
  compatibilityDate: '2026-09-02',

  // Dev over a public tunnel: the HMR client otherwise dials ws://localhost,
  // which a phone on the other side of the tunnel cannot reach — the page
  // loads and then never updates. Only when the variable is set, so a normal
  // `nuxt dev` is untouched.
  vite: process.env.DUXT_TUNNEL
    ? { server: { hmr: { protocol: 'wss', clientPort: 443 } } }
    : undefined
});
