import { queryCollection } from '@nuxt/content/nitro';
import { z } from 'zod';

/**
 * Search, so a model does not have to read every page to find one.
 *
 * A LIKE over title and description rather than the FTS index the browser
 * uses: that index is built client-side from the collection dump, and a server
 * tool has the database itself.
 */
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

    const pages = await queryCollection(extra.event, 'docs')
      .select('path', 'title', 'description')
      .where('title', 'LIKE', term)
      .orWhere((group) => group.where('description', 'LIKE', term))
      .all();

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
