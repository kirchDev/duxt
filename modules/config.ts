import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Nuxt } from '@nuxt/schema';
import { enableWriteAheadLog } from '../content-cache';
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
  // FIRST, and before anything else touches the file: this is the earliest of
  // duxt's modules, so it is the only one that runs while Content's cache
  // database is still closed — and the journal mode can only be changed then.
  // See `enableWriteAheadLog`.
  enableWriteAheadLog(nuxt);

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
    ...layerIdentity(layerDir),
    resolvedSources
  } as typeof nuxt.options.appConfig.duxt;

  checkSourceLocales(nuxt, config, resolvedSources);
  restrictLocales(nuxt, config?.locales);
  shareSiteUrl(nuxt);
  nameMcpServer(nuxt, config?.title);
  excludeOldVersionsFromSitemap(nuxt, resolvedSources);
}

/**
 * The two ways a translated source can be configured into silence.
 *
 * NEITHER is caught by anything else. `content.config.ts` has no access to the
 * Nuxt config — it is loaded by c12 in Content's own pass — so it resolves the
 * default locale from `sourceOptions.defaultLocale` alone, and if that
 * disagrees with `i18n.defaultLocale` the collections are named for one
 * language while the theme queries for another. The result is not an error but
 * an empty page, which is the failure mode this layer exists to stop.
 *
 * So the value is NOT injected from i18n here — injecting it would fix the
 * manifest and leave `content.config.ts` computing the other answer, which is
 * the same bug one layer deeper. It is checked instead.
 */
function checkSourceLocales(
  nuxt: Nuxt,
  config:
    | { locales?: string[]; sourceOptions?: { defaultLocale?: string } }
    | undefined,
  resolved: ReturnType<typeof duxtSourceManifest>
) {
  const translated = resolved.filter((source) => source.locale);
  if (!translated.length) return;

  const defaultLocale = nuxt.options.i18n?.defaultLocale;
  const assumed = resolved.find((source) => source.isDefaultLocale)?.locale;

  if (defaultLocale && assumed && assumed !== defaultLocale) {
    throw new Error(
      `duxt: sources treat "${assumed}" as the untranslated original, but ` +
        `i18n.defaultLocale is "${defaultLocale}". Content declares the ` +
        'collections without access to the Nuxt config, so the two must agree: ' +
        `set duxt.sourceOptions.defaultLocale to "${defaultLocale}".`
    );
  }

  // A translation nobody can reach is a folder parsed, stored and served to no
  // one — worth a message rather than a silently larger build.
  const served = config?.locales;
  if (!served?.length) return;

  const stranded = [
    ...new Set(
      translated
        .filter((source) => source.locale && !served.includes(source.locale))
        .map((source) => source.locale!)
    )
  ];

  if (stranded.length) {
    console.warn(
      `[duxt] sources are translated into ${stranded.join(', ')}, which ` +
        `duxt.locales does not serve (${served.join(', ')}). Those ` +
        'collections are built and never read.'
    );
  }
}

/**
 * The layer's own version and repository, for the footer line.
 *
 * Read out of the layer's `package.json` rather than written anywhere: the
 * version is bumped by release-please, and a second copy of it is a copy that
 * goes stale on the first release. Both are absent rather than guessed if the
 * file cannot be read — the footer then draws nothing.
 */
function layerIdentity(layerDir: string) {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL('package.json', `file://${layerDir}`), 'utf8')
    ) as { version?: string; repository?: { url?: string } };

    return {
      layerVersion: pkg.version,
      layerRepository: pkg.repository?.url
        ?.replace(/^git\+/, '')
        .replace(/\.git$/, '')
    };
  } catch {
    return {};
  }
}

/**
 * One origin, stated once.
 *
 * `i18n.baseUrl` is where a Nuxt site already has to say what domain it is
 * served from — hreflang is not valid relative — and robots, the sitemap and
 * the OG images each want the same answer under a different key. Copying it
 * here means a consumer sets one value; an explicit `site.url` still wins,
 * because a human wrote it.
 */
function shareSiteUrl(nuxt: Nuxt) {
  const baseUrl = (nuxt.options as { i18n?: { baseUrl?: string } }).i18n
    ?.baseUrl;

  if (!baseUrl || typeof baseUrl !== 'string') return;

  const site = (nuxt.options as { site?: { url?: string } }).site ?? {};
  if (site.url) return;

  (nuxt.options as { site?: { url?: string } }).site = {
    ...site,
    url: baseUrl
  };
}

/**
 * The MCP server's name, from the site's own title.
 *
 * `mcp.name` is a nuxt.config key, not an app.config one, so it is the single
 * duxt-facing option a consumer cannot set beside the others. Left as a literal
 * it published duxt's own name from every downstream site. Derived here
 * instead: the title a consumer already writes in `app.config.ts` names the
 * server too, and anyone wanting a different one still writes `mcp: { name }`
 * in `nuxt.config.ts`, which defu keeps ahead of this.
 *
 * A record is resolved against `i18n.defaultLocale`, because the server has one
 * name and no request to read a language from. A consumer who wrote an i18n KEY
 * as their title gets that key — the build has no translator, which is why a
 * literal or a record is the documented form.
 *
 * The module's own default is the empty string, so this must always answer.
 */
function nameMcpServer(
  nuxt: Nuxt,
  title: string | Record<string, string> | undefined
) {
  const options = nuxt.options as {
    mcp?: { name?: string };
    i18n?: { defaultLocale?: string };
  };
  if (!options.mcp || options.mcp.name) return;

  const locale = options.i18n?.defaultLocale;
  const name =
    typeof title === 'string'
      ? title
      : title
        ? ((locale && title[locale]) ?? Object.values(title)[0])
        : undefined;

  options.mcp.name = name ? `${name} documentation` : 'Documentation';
}

/**
 * Keep the versions the page tells a crawler to ignore out of the sitemap.
 *
 * A non-default version carries `noindex` and a canonical pointing at the
 * current one; an `eol` version is gone whether or not it is the default.
 * Listing either in the sitemap asks a crawler to fetch exactly what the page
 * then tells it to drop — the two halves have to agree, so both are derived
 * from the same manifest.
 *
 * Four patterns per prefix because the locale segment sits in front of it:
 * `/workflows/v0.7.0` and `/de-DE/workflows/v0.7.0` are the same page.
 */
function excludeOldVersionsFromSitemap(
  nuxt: Nuxt,
  sources: ReturnType<typeof duxtSourceManifest>
) {
  const hidden = sources.filter(
    (source) => source.prefix && (!source.isDefault || source.status === 'eol')
  );

  if (!hidden.length) return;

  const options = nuxt.options as {
    sitemap?: { exclude?: string[] };
  };

  const exclude = options.sitemap?.exclude ?? [];

  for (const source of hidden) {
    exclude.push(
      source.prefix,
      `${source.prefix}/**`,
      `/*${source.prefix}`,
      `/*${source.prefix}/**`
    );
  }

  options.sitemap = { ...options.sitemap, exclude: [...new Set(exclude)] };
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

  /**
   * The same question, asked of the OTHER fallback — the one that decides where
   * a visitor landing on `/` is sent.
   *
   * `detectBrowserLanguage.fallbackLocale` is nested, and defu merges nested
   * objects key by key: a consumer setting `i18n: { defaultLocale: 'de-DE' }`
   * does NOT displace the layer's `en-GB` here. Narrow `duxt.locales` to
   * exclude it and the site stops serving that language while still redirecting
   * root visitors to it — nothing throws, and the page is empty. Exactly the
   * class of silent failure the check above exists to stop, one key over.
   */
  const browserFallback = (
    nuxt.options.i18n as { detectBrowserLanguage?: { fallbackLocale?: string } }
  )?.detectBrowserLanguage?.fallbackLocale;

  if (browserFallback && !wanted.includes(browserFallback)) {
    throw new Error(
      `duxt: i18n.detectBrowserLanguage.fallbackLocale is "${browserFallback}", ` +
        `which app.config duxt.locales does not list (${wanted.join(', ')}). ` +
        'Set it to one of them, or widen duxt.locales.'
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
