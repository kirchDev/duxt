import type { Nuxt } from 'nuxt/schema';
import { readContentCache } from '@kirchdev/duxt/unstable';
import { collectWikiMetadata, wikiPage } from './metadata';
import { wikiCategoryCycles } from './queries';

export default function duxtWiki(_options: unknown, nuxt: Nuxt) {
  nuxt.hook('content:file:afterParse', (context) => {
    if (context.collection.type === 'page')
      collectWikiMetadata(context.content);
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
