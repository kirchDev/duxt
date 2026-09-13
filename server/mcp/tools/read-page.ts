import { queryCollection } from '@nuxt/content/nitro';
import { z } from 'zod';
import { splitLocalePath } from '../../../app/utils/locale-path';
import { sourcesForRoute } from '../../../sources-resolve';
import {
  duxtAuthoredMarkdown,
  duxtFrontmatter,
  duxtLocaleSetup,
  duxtMcpEvent,
  duxtPublicPath,
  duxtSources
} from '../../utils/mcp-docs';

/**
 * One page, as the author wrote it.
 *
 * ONE response shape, and it is Markdown: duxt's own YAML frontmatter over the
 * authored body with the author's frontmatter removed. Before this the tool
 * returned a title, a description and `JSON.stringify(page.body)` — Content's
 * parsed AST, which is longer than the page, harder to read than the page, and
 * not what any other machine-readable surface of this site hands over.
 *
 * The frontmatter is duxt's because the author's is gone: it says which
 * version and which language this text is, which is precisely what a model
 * holding one page out of four editions cannot otherwise know. `title` rides
 * along for the same reason — the authored frontmatter carried it, the body
 * usually has no heading of its own, and stripping one without the other hands
 * over an untitled page.
 *
 * The path is the PUBLIC one, the same string `list_pages` printed, so a round
 * trip through the two tools needs no translation. A locale segment on it
 * selects the language, exactly as it does in a browser.
 */
export default defineMcpTool({
  name: 'read_page',
  title: 'Read a documentation page',
  description:
    'One page as Markdown, with duxt frontmatter naming its version, language ' +
    'and lifecycle status. Paths come from `list_pages`.',
  annotations: { readOnlyHint: true },

  inputSchema: {
    path: z
      .string()
      .describe('Page path from `list_pages`, for example /app/deploying')
  },

  async handler({ path }) {
    const event = duxtMcpEvent();
    const setup = duxtLocaleSetup(event);
    const sources = duxtSources();
    const { locale, path: wanted } = splitLocalePath(path, setup.codes);

    // The same chain the rendered page takes: the requested language, its
    // siblings, the configured fallback, then the untranslated original.
    const chain = sourcesForRoute(
      wanted,
      locale ?? setup.defaultLocale,
      sources,
      setup.fallbackLocale
    );

    for (const source of chain) {
      const page = (await queryCollection(
        event,
        source.collection as Parameters<typeof queryCollection>[1]
      )
        .path(wanted)
        .select('title', 'description', 'rawbody')
        .first()) as unknown as
        | { title?: string; description?: string; rawbody?: string }
        | undefined;

      if (!page) continue;

      const frontmatter = duxtFrontmatter({
        path: duxtPublicPath(wanted, locale, setup),
        prefix: duxtPublicPath(source.prefix, locale, setup),
        title: page.title,
        description: page.description,
        version: source.version,
        ref: source.ref,
        refKind: source.refKind,
        locale: source.locale,
        status: source.status
      });

      return {
        content: [
          {
            type: 'text',
            text: `${frontmatter}\n\n${duxtAuthoredMarkdown(page.rawbody)}`
          }
        ]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text:
            `No page at ${path}. ` +
            'Use `list_pages` for valid paths, or `list_versions` to pick a ' +
            'version first.'
        }
      ],
      isError: true
    };
  }
});
