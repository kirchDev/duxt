import { fileURLToPath } from 'node:url';
import type { Nuxt } from 'nuxt/schema';
import { readContentCache } from '@kirchdev/duxt/unstable';
import { collectWikiMetadata, wikiPage } from './metadata';
import { wikiCategoryCycles } from './queries';

export default function duxtWiki(_options: unknown, nuxt: Nuxt) {
  nuxt.hook('content:file:afterParse', (context) => {
    if (context.collection.type === 'page')
      collectWikiMetadata(context.content);
  });
  nuxt.hook('pages:extend', (pages) => {
    const sources =
      (
        nuxt.options.appConfig.duxt as
          | { resolvedSources?: { prefix: string; pageType?: string }[] }
          | undefined
      )?.resolvedSources ?? [];
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
  });
  const warned = new Set<string>();
  // Template preparation follows Content's modules:done parsing in builds and packs.
  nuxt.hook('app:templates', () => {
    const sources =
      (
        nuxt.options.appConfig.duxt as
          | { resolvedSources?: { collection: string }[] }
          | undefined
      )?.resolvedSources ?? [];
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
  });
}
