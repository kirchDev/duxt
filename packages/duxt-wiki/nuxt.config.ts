import { fileURLToPath } from 'node:url';
const layer = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineNuxtConfig({
  css: [layer('./app/assets/css/wiki.css')],
  alias: { '@duxt-wiki': layer('./app') },
  components: [
    {
      path: layer('./app/components/content'),
      pathPrefix: false,
      global: true
    },
    {
      path: layer('./app/components'),
      ignore: ['content/**'],
      pathPrefix: false
    }
  ],
  imports: { dirs: [layer('./app/composables')] },
  modules: [layer('./module.ts')]
});
