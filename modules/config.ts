import { fileURLToPath } from 'node:url';
import type { Nuxt } from '@nuxt/schema';
import { readDuxtBuildConfig } from '../duxt-app-config';
import { duxtSourceManifest } from '../sources-resolve';
import { resolveLatestRefs } from '../sources-git';

/**
 * The build-time half of duxt's config, read from the site's `app.config.ts`.
 *
 * Two jobs, one source of truth.
 *
 * RESOLVED SOURCES. `duxt.sources` in app.config is what a consumer WRITES —
 * folders, repositories, refs. What the theme reads is the resolved manifest:
 * which collection serves which URL prefix. Content settles that in a pass of
 * its own that the app never sees, so it is resolved here and written back into
 * the app config under `resolvedSources`. Separate key on purpose — one name
 * for two shapes is the next trap, not a convenience.
 *
 * LOCALES. i18n's own `locales` array MERGES across layers instead of
 * replacing, so a consumer declaring `['de-DE']` adds nothing and removes
 * nothing — the other six stay routed, indexed and announced in hreflang.
 * Measured, not assumed. Removing is the one thing i18n cannot say, so it is
 * the only thing duxt adds; `defaultLocale` merges as you would expect and
 * stays i18n's own key.
 */
export default function duxtConfig(_options: unknown, nuxt: Nuxt) {
  const layerDir = fileURLToPath(new URL('..', import.meta.url));

  const dirs = [
    ...nuxt.options._layers.flatMap((entry) => [
      entry.config.rootDir,
      entry.config.srcDir
    ]),
    layerDir
  ].filter(Boolean) as string[];

  const config = readDuxtBuildConfig(dirs);

  const resolvedSources = duxtSourceManifest(
    resolveLatestRefs(config?.sources ?? [{ path: 'docs' }]),
    config?.sourceOptions ?? {}
  );

  // Written into `appConfig`, which the generated template merges LAST — behind
  // every app.config.ts file. That is the right way round: a value the build
  // computes must not overwrite one a human wrote.
  // Cast because the appConfig type is GENERATED FROM THIS ASSIGNMENT: Nuxt
  // infers it from whatever was written last time, so the module cannot satisfy
  // a type it is itself the only source of.
  nuxt.options.appConfig.duxt = {
    ...nuxt.options.appConfig.duxt,
    resolvedSources
  } as typeof nuxt.options.appConfig.duxt;

  restrictLocales(nuxt, config?.locales);
}

function restrictLocales(nuxt: Nuxt, wanted: string[] | undefined) {
  if (!wanted?.length) return;

  const configs = nuxt.options._layers
    .map((entry) => (entry.config as { i18n?: { locales?: unknown[] } }).i18n)
    .filter((config): config is { locales?: unknown[] } =>
      Boolean(config?.locales)
    );

  const codeOf = (locale: unknown) =>
    typeof locale === 'string' ? locale : (locale as { code: string }).code;

  const available = [
    ...new Set(configs.flatMap((config) => config.locales!.map(codeOf)))
  ];

  const unknown = wanted.filter((code) => !available.includes(code));
  if (unknown.length) {
    // Rejected rather than silently dropped: a typo in a locale code would
    // otherwise present as a language simply missing from the site, with
    // nothing in the build connecting the two.
    throw new Error(
      `duxt: unknown locale${unknown.length > 1 ? 's' : ''} in app.config ` +
        `duxt.locales: ${unknown.join(', ')}. Available: ${available.join(', ')}. ` +
        'Declare it in i18n.locales to add a locale the layer does not ship.'
    );
  }

  /**
   * Filtered PER LAYER, not on the merged config: i18n collects `i18n.locales`
   * from every layer itself, so rewriting `nuxt.options.i18n` changes a copy
   * nothing reads. Found the hard way — the merged list said two locales and
   * the built site still served seven.
   */
  for (const config of configs) {
    config.locales = config.locales!.filter((locale) =>
      wanted.includes(codeOf(locale))
    );
  }

  const defaultLocale = nuxt.options.i18n?.defaultLocale;
  if (defaultLocale && !wanted.includes(defaultLocale)) {
    throw new Error(
      `duxt: i18n.defaultLocale is "${defaultLocale}", which app.config ` +
        `duxt.locales does not list (${wanted.join(', ')}). ` +
        'Set i18n.defaultLocale to one of them.'
    );
  }

  // The flags were derived from the full list at config time. Prune them too,
  // so a site serving two languages does not inline seven it never draws.
  const keep = new Set(
    wanted.map((code) => `flag:${code.split('-')[1]?.toLowerCase()}-4x3`)
  );

  for (const entry of nuxt.options._layers) {
    const icon = (
      entry.config as { icon?: { clientBundle?: { icons?: string[] } } }
    ).icon;

    if (icon?.clientBundle?.icons) {
      icon.clientBundle.icons = icon.clientBundle.icons.filter(
        (name) => !name.startsWith('flag:') || keep.has(name)
      );
    }
  }
}
