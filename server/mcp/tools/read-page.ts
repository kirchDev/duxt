import { queryCollection } from '@nuxt/content/nitro';
import { z } from 'zod';

/**
 * One page's prose. Returns the stored content rather than rendered HTML — a
 * model reading documentation wants the text, not the theme around it.
 */
export default defineMcpTool({
  name: 'read_page',
  title: 'Read a documentation page',
  description: 'The full content of one page. Paths come from `list_pages`.',
  annotations: { readOnlyHint: true },

  inputSchema: {
    path: z.string().describe('Page path, for example /guide/deploying')
  },

  async handler({ path }, extra) {
    const page = await queryCollection(extra.event, 'docs').path(path).first();

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
