import { fileURLToPath } from 'node:url';
import { useNuxt } from 'nuxt/kit';
import {
  wantedTitleQueryPattern,
  collectionWantedPrefixes
} from './wanted-routes';
const layer = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineNuxtConfig({
  hooks: {
    'module:before': (module) => {
      if (module.name !== 'nuxt-link-checker') return;
      const nuxt = useNuxt();
      const sources =
        (
          nuxt.options.appConfig.duxt as
            | {
                resolvedSources?: {
                  prefix: string;
                  pageType?: string;
                  generated?: unknown;
                }[];
              }
            | undefined
        )?.resolvedSources ?? [];
      const i18n = nuxt.options.i18n as
        | {
            locales?: (string | { code: string })[];
            strategy?: string;
            defaultLocale?: string;
          }
        | undefined;
      const locales = i18n?.locales ?? [];
      const pattern = wantedTitleQueryPattern(
        collectionWantedPrefixes(sources),
        locales.map((locale) =>
          typeof locale === 'string' ? locale : locale.code
        ),
        { strategy: i18n?.strategy, defaultLocale: i18n?.defaultLocale }
      );
      if (!pattern) return;
      const options = nuxt.options as unknown as {
        linkChecker?: false | { excludeLinks?: (string | RegExp)[] };
      };
      if (options.linkChecker === false) return;
      options.linkChecker = {
        ...options.linkChecker,
        excludeLinks: [...(options.linkChecker?.excludeLinks ?? []), pattern]
      };
    }
  },
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
