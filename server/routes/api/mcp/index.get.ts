import { queryCollection } from '@nuxt/content/nitro';

/**
 * A machine-readable index of the documentation.
 *
 * Deliberately a plain JSON endpoint rather than a streaming MCP server: MCP
 * transports are a moving target, and a docs site should not carry a protocol
 * implementation that outdates it. What a model needs from a docs site is the
 * list and the text; both are here, and an MCP server wrapping this endpoint
 * is a few lines that can live wherever the model runs.
 */
export default defineEventHandler(async (event) => {
  const pages = await queryCollection(event, 'docs')
    .select('path', 'title', 'description')
    .all();

  const origin = getRequestURL(event).origin;

  return {
    version: 1,
    page: `${origin}/api/mcp/page?path=`,
    pages: pages
      .filter((page) => page.path)
      .sort((a, b) => a.path!.localeCompare(b.path!))
      .map((page) => ({
        path: page.path,
        url: `${origin}${page.path}`,
        title: page.title,
        description: page.description
      }))
  };
});
