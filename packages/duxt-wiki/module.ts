import { fileURLToPath } from 'node:url';
import type { Nuxt } from 'nuxt/schema';
import {
  readContentCache,
  writeReportNotes,
  linkWarnings,
  walk
} from '@kirchdev/duxt/unstable';
import type { DuxtResolvedSource } from '@kirchdev/duxt/sources-resolve';
import { dirname } from 'node:path';
import { collectWikiMetadata, wikiPage } from './metadata';
import { wikiCategoryCycles } from './queries';
import { wikiMaintenance, wikiPageKey } from './wiki-maintenance';
import { collectionWantedRoute } from './wikilink-resolution';
import {
  collectionWantedPrefixes,
  collectionWantedPaths,
  isUnneededWantedRoute,
  wantedTitleQueryPattern
} from './wanted-routes';

export default function duxtWiki(_options: unknown, nuxt: Nuxt) {
  const neededWantedPrefixes = new Set<string>();
  const manifest = () =>
    (
      nuxt.options.appConfig.duxt as
        | { resolvedSources?: DuxtResolvedSource[] }
        | undefined
    )?.resolvedSources ?? [];
  const routing = () => {
    const i18n = nuxt.options.i18n as
      | {
          locales?: (string | { code: string })[];
          strategy?: string;
          defaultLocale?: string;
        }
      | undefined;
    return {
      locales: (i18n?.locales ?? []).map((locale) =>
        typeof locale === 'string' ? locale : locale.code
      ),
      strategy: i18n?.strategy,
      defaultLocale: i18n?.defaultLocale
    };
  };
  nuxt.hook('content:file:afterParse', (context) => {
    if (context.collection.type === 'page')
      collectWikiMetadata(context.content);
  });
  nuxt.hook('pages:extend', (pages) => {
    const sources = manifest();
    for (const prefix of new Set(
      sources
        .filter((source) => source.pageType === 'article')
        .map((source) => source.prefix)
    )) {
      pages.push({
        name: `wiki-category-${prefix.replace(/[^a-z0-9]/gi, '-')}`,
        path: `${prefix}/category/:category`,
        file: fileURLToPath(
          new URL('./app/routes/category.vue', import.meta.url)
        )
      });
    }
    for (const prefix of collectionWantedPrefixes(sources)) {
      pages.push({
        name: `wiki-wanted-${prefix.replace(/[^a-z0-9]/gi, '-')}`,
        path: collectionWantedRoute(prefix),
        file: fileURLToPath(
          new URL('./app/routes/wanted.vue', import.meta.url)
        ),
        meta: { sitemap: false }
      });
    }
  });
  nuxt.hook('nitro:config', (config) => {
    const routeOptions = routing();
    const prefixes = collectionWantedPrefixes(manifest());
    const paths = collectionWantedPaths(
      prefixes,
      routeOptions.locales,
      routeOptions
    );
    const query = wantedTitleQueryPattern(
      prefixes,
      routeOptions.locales,
      routeOptions
    );
    const seeds = collectionWantedPaths(
      [
        ...new Set(
          manifest()
            .filter((source) => source.pageType === 'article')
            .map((source) => source.prefix)
        )
      ],
      routeOptions.locales,
      routeOptions
    );
    config.prerender ??= {};
    config.prerender.routes = [
      ...new Set([...(config.prerender.routes ?? []), ...seeds])
    ];
    config.prerender.ignore = [
      ...(config.prerender.ignore ?? []),
      (route) => Boolean(query?.test(route)),
      (route) =>
        isUnneededWantedRoute(route, paths, [
          ...seeds,
          ...collectionWantedPaths(
            [...neededWantedPrefixes],
            routeOptions.locales,
            routeOptions
          )
        ])
    ];
    const options = nuxt.options as unknown as {
      sitemap?: { exclude?: string[] };
    };
    options.sitemap = {
      ...options.sitemap,
      exclude: [...new Set([...(options.sitemap?.exclude ?? []), ...paths])]
    };
  });
  nuxt.hook('nitro:build:before', (nitro) => {
    const routeOptions = routing();
    const needed = collectionWantedPaths(
      [...neededWantedPrefixes],
      routeOptions.locales,
      routeOptions
    );
    nitro.options.prerender.routes = [
      ...new Set([...nitro.options.prerender.routes, ...needed])
    ];
  });
  const warned = new Set<string>();
  // Template preparation follows Content's modules:done parsing in builds and packs.
  nuxt.hook('app:templates', () => {
    const sources = manifest();
    const cached = readContentCache(
      nuxt,
      sources.map((source) => source.collection)
    );
    const pages = (cached ?? []).flatMap((entry) => {
      const page = wikiPage(
        { ...entry.content, path: entry.path },
        entry.collection
      );
      return page ? [page] : [];
    });
    for (const cycle of wikiCategoryCycles(pages)) {
      const message = `[duxt-wiki] category cycle: ${cycle.join(' → ')}`;
      if (!warned.has(message)) {
        console.warn(message);
        warned.add(message);
      }
    }
    if (!cached) return;
    const origins = pages.filter(
      (page) =>
        sources.find((source) => source.collection === page.collection)
          ?.pageType === 'article' ||
        ['article', 'category', 'disambiguation'].includes(page.type ?? '')
    );
    const findings = wikiMaintenance(pages, sources, origins);
    for (const wanted of findings.wanted) {
      const source = sources.find(
        (source) => source.collection === wanted.collection
      );
      if (source) neededWantedPrefixes.add(source.prefix);
    }
    const projected = cached.map((entry) => {
      const collected = {
        anchors: new Set<string>(),
        links: [] as { href: string }[],
        commands: [] as string[]
      };
      walk(entry.content.body, collected);
      return {
        collection: entry.collection,
        path: entry.path,
        file: entry.file,
        title: String(entry.content.title ?? ''),
        description: String(entry.content.description ?? ''),
        anchors: collected.anchors,
        links: findings.resolvedLinks
          .filter((link) => wikiPageKey(link.page) === wikiPageKey(entry))
          .map((link) => ({ href: link.href }))
      };
    });
    for (const { target } of findings.resolvedLinks) {
      if (!projected.some((page) => wikiPageKey(page) === wikiPageKey(target)))
        projected.push({
          collection: target.collection,
          path: target.path,
          file: target.path,
          title: target.title,
          description: target.title,
          anchors: new Set(),
          links: []
        });
    }
    const warnings = [
      ...new Set([...findings.warnings, ...linkWarnings(sources, projected)])
    ];
    for (const warning of warnings)
      if (!warned.has(warning)) {
        console.warn(`[duxt-wiki] ${warning}`);
        warned.add(warning);
      }
    const list = (rows: typeof pages) =>
      rows.map((page) => `${page.path} (${page.collection})`);
    writeReportNotes(
      nuxt.options.rootDir,
      dirname(fileURLToPath(import.meta.url)),
      cached,
      {
        sections: [
          {
            heading: 'Wiki wanted pages',
            lines: findings.wanted.map(
              (page) =>
                `${page.title} — ${page.linkers.length} linking pages (${page.collection})`
            )
          },
          { heading: 'Wiki orphaned pages', lines: list(findings.orphaned) },
          { heading: 'Wiki dead ends', lines: list(findings.deadEnds) },
          {
            heading: 'Wiki pages without a category',
            lines: list(findings.uncategorized)
          }
        ],
        warnings
      }
    );
  });
}
