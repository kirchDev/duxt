import { queryCollection } from '@nuxt/content/nitro';

/**
 * The documentation's table of contents, for a model.
 *
 * Built on @nuxtjs/mcp-toolkit rather than a JSON endpoint of our own: it
 * speaks the actual protocol through the official SDK, so a client connects to
 * `/mcp` instead of someone writing a server around our shape.
 */
export default defineMcpTool({
  name: 'list_pages',
  title: 'List documentation pages',
  description:
    'Every page of this documentation with its path, title and description. ' +
    'Start here, then read a page with `read_page`.',
  annotations: { readOnlyHint: true },

  async handler(_args, extra) {
    const pages = await queryCollection(extra.event, 'docs')
      .select('path', 'title', 'description')
      .all();

    const listing = pages
      .filter((page) => page.path)
      .sort((a, b) => a.path!.localeCompare(b.path!))
      .map(
        (page) =>
          `- ${page.path} — ${page.title}${page.description ? `: ${page.description}` : ''}`
      )
      .join('\n');

    return { content: [{ type: 'text', text: listing }] };
  }
});
