import { defineNuxtPlugin } from '#app';
import { checksums } from '#content/manifest';
import components from '#build/duxt-content-bundle-components';

export default defineNuxtPlugin({
  name: 'duxt-content-bundles',
  enforce: 'pre',
  setup(nuxtApp) {
    if (import.meta.server) {
      const snapshot =
        nuxtApp.ssrContext?.event.context.duxtContentBundleChecksums;
      if (snapshot) nuxtApp.payload.duxtContentBundleChecksums = snapshot;
    }
    const snapshot = nuxtApp.payload.duxtContentBundleChecksums as
      | Record<string, string>
      | undefined;
    if (!snapshot) return;
    if (import.meta.client) Object.assign(checksums, snapshot);
    for (const [name, component] of components)
      nuxtApp.vueApp.component(name, component);
  }
});
