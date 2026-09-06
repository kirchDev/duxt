import { queryCollection } from '@nuxt/content/nitro';

/**
 * The documentation's table of contents, for a model.
 *
 * Built on @nuxtjs/mcp-toolkit rather than a JSON endpoint of our own: it
 * speaks the actual protocol through the official SDK, so a client connects to
 * `/mcp` instead of someone writing a server around our shape.
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
  name: 'list_pages',
  title: 'List documentation pages',
  description:
    'Every page of this documentation with its path, title and description. ' +
    'Start here, then read a page with `read_page`.',
  annotations: { readOnlyHint: true },

  // A tool without an `inputSchema` is called with ONE argument: the SDK hands
  // the handler `extra` directly rather than `(args, extra)`. Written the other
  // way round, `extra` was undefined and every call failed on `extra.event`.
  async handler(extra) {
    const pages = (
      await Promise.all(
        duxtCollections().map((name) =>
          queryCollection(extra.event, name)
            .select('path', 'title', 'description')
            .all()
        )
      )
    ).flat();

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
