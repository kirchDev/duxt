import { queryCollection } from '@nuxt/content/nitro';
import { z } from 'zod';

/**
 * Search, so a model does not have to read every page to find one.
 *
 * A LIKE over title and description rather than the FTS index the browser
 * uses: that index is built client-side from the collection dump, and a server
 * tool has the database itself.
 */
/** Every collection the manifest names — a versioned site has none called `docs`. */
function duxtCollections(): 'docs'[] {
  const { duxt } = useAppConfig() as { duxt?: Partial<DuxtConfig> };
  const names = duxt?.sources?.length
    ? duxt.sources.map((source) => source.collection)
    : ['docs'];
  return names as 'docs'[];
}

export default defineMcpTool({
  name: 'search_docs',
  title: 'Search the documentation',
  description: 'Find pages whose title or description matches a term.',
  annotations: { readOnlyHint: true },

  inputSchema: {
    query: z.string().describe('What to look for')
  },

  async handler({ query }, extra) {
    const term = `%${query}%`;

    // Both conditions in ONE group. Content joins the query's top-level
    // conditions with AND regardless of how each was added, so a `where()`
    // followed by an `orWhere()` asks for a term in the title AND in the
    // description — which matched nothing at all. Inside a group the operator
    // is the one the group was opened with, so `orWhere` gives title OR
    // description.
    const pages = (
      await Promise.all(
        duxtCollections().map((name) =>
          queryCollection(extra.event, name)
            .select('path', 'title', 'description')
            .orWhere((group) =>
              group
                .where('title', 'LIKE', term)
                .where('description', 'LIKE', term)
            )
            .all()
        )
      )
    ).flat();

    if (!pages.length) {
      return {
        content: [{ type: 'text', text: `Nothing matches "${query}".` }]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: pages
            .map(
              (page) =>
                `- ${page.path} — ${page.title}${page.description ? `: ${page.description}` : ''}`
            )
            .join('\n')
        }
      ]
    };
  }
});
