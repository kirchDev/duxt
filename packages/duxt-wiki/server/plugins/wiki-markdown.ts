import { queryCollection } from '@nuxt/content/nitro';
import type { DuxtMarkdownPage } from '@duxt/../server/utils/page-markdown';
import {
  duxtLocaleSetup,
  duxtPublicPath
} from '@duxt/../server/utils/mcp-docs';
import { queryWikiPages } from '../utils/wiki';
import type { WikiPage } from '../../metadata';
import { formatWikiMarkdown, wikiBodyTokens } from '../../wikilinks';
import {
  resolveWikiLink,
  wikiLinkCollections
} from '../../wikilink-resolution';

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('request', (event) => {
    const rows = new Map<string, Promise<WikiPage[]>>();
    event.context.duxtMarkdown = async (page: DuxtMarkdownPage) => {
      if (!page.markdown.includes('[[')) return page.markdown;
      const sources =
        (useAppConfig().duxt as DuxtConfig | undefined)?.resolvedSources ?? [];
      if (
        !['article', 'category', 'disambiguation'].includes(
          page.pageType ?? page.source.pageType ?? 'docs'
        )
      )
        return page.markdown;
      const stored = await queryCollection(
        event,
        page.source.collection as Parameters<typeof queryCollection>[1]
      )
        .path(page.path)
        .select('body')
        .first();
      const body = (stored as { body?: unknown } | null)?.body;
      const tokens = wikiBodyTokens(body);
      if (!tokens.length) return page.markdown;
      const setup = duxtLocaleSetup(event);
      const context = {
        source: page.source,
        sources,
        locale: page.locale ?? setup.defaultLocale,
        fallbackLocale: setup.fallbackLocale
      };
      const pages = (
        await Promise.all(
          wikiLinkCollections(tokens, context).map((collection) => {
            if (!rows.has(collection))
              rows.set(collection, queryWikiPages(event, [collection]));
            return rows.get(collection)!;
          })
        )
      ).flat();
      return formatWikiMarkdown(
        page.markdown,
        (token) => {
          const result = resolveWikiLink(pages, token, context);
          return result.wanted
            ? undefined
            : duxtPublicPath(result.href, page.locale, setup);
        },
        body
      );
    };
  });
});
