import { queryCollection } from '@nuxt/content/nitro';
import { z } from 'zod';

/**
 * One page's prose. Returns the stored content rather than rendered HTML — a
 * model reading documentation wants the text, not the theme around it.
 */
/** Every collection the manifest names — a versioned site has none called `docs`. */
function duxtCollections(): 'docs'[] {
  const { duxt } = useAppConfig() as { duxt?: Partial<DuxtConfig> };
  const names = duxt?.resolvedSources?.length
    ? duxt.resolvedSources.map((source) => source.collection)
    : ['docs'];
  return names as 'docs'[];
}

export default defineMcpTool({
  name: 'read_page',
  title: 'Read a documentation page',
  description: 'The full content of one page. Paths come from `list_pages`.',
  annotations: { readOnlyHint: true },

  inputSchema: {
    path: z.string().describe('Page path, for example /guide/deploying')
  },

  async handler({ path }, extra) {
    // Try each collection: a path carries its own prefix, so at most one has it.
    const found = await Promise.all(
      duxtCollections().map((name) =>
        queryCollection(extra.event, name).path(path).first()
      )
    );
    const page = found.find(Boolean);

    if (!page) {
      return {
        content: [
          {
            type: 'text',
            text: `No page at ${path}. Use \`list_pages\` for valid paths.`
          }
        ],
        isError: true
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `# ${page.title}\n\n${page.description ?? ''}\n\n${JSON.stringify(page.body)}`
        }
      ]
    };
  }
});
