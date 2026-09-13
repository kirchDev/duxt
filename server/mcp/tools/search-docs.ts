import { z } from 'zod';
import {
  DUXT_PAGE_MAX,
  DUXT_PAGE_SIZE,
  duxtBadCursor,
  duxtCursorPage,
  duxtExcerpt,
  duxtLocaleSetup,
  duxtMcpEvent,
  duxtPageLine,
  duxtScope,
  duxtScopedPages,
  duxtSources,
  duxtUnknownScope,
  duxtValidCursor
} from '../../utils/mcp-docs';
import { duxtPageSearchable } from '../../../app/utils/page-controls';

/**
 * Search, so a model does not have to read every page to find one.
 *
 * THE BODY, not only the title and the description. A LIKE over those two
 * found "Deploying" and missed every page that merely explains deployment,
 * which is most of them — a search matching only what is already in the table
 * of contents tells an agent nothing `list_pages` had not.
 *
 * Matched in JavaScript rather than in SQL, and that is the trade written
 * down: SQLite's LIKE is case-insensitive for ASCII ONLY, so a German page
 * searched for "übersicht" matched nothing at all, and the excerpt needs the
 * body in hand regardless. The scope is what keeps the cost bounded — an agent
 * that names a version pays for that version.
 */
export default defineMcpTool({
  name: 'search_docs',
  title: 'Search the documentation',
  description:
    'Find pages whose title, description or Markdown contains a term, with an ' +
    'excerpt around the first match. Scope with a prefix from `list_versions`.',
  annotations: { readOnlyHint: true },

  inputSchema: {
    query: z.string().min(1).describe('What to look for'),
    prefix: z
      .string()
      .optional()
      .describe(
        'URL prefix from `list_versions`, for example /app or /de/app. ' +
          'Omit to search every version in the default language.'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(DUXT_PAGE_MAX)
      .default(DUXT_PAGE_SIZE)
      .describe(`How many results to return, at most ${DUXT_PAGE_MAX}`),
    cursor: z
      .string()
      .optional()
      .describe('`nextCursor` from a previous call, to continue the results')
  },

  async handler({ query, prefix, limit, cursor }) {
    if (cursor && !duxtValidCursor(cursor)) return duxtBadCursor(cursor);

    const event = duxtMcpEvent();
    const setup = duxtLocaleSetup(event);
    const scope = duxtScope(prefix, duxtSources(), setup);
    if (!scope) return duxtUnknownScope(prefix!);

    const term = query.toLowerCase();
    const holds = (value: string | undefined) =>
      Boolean(value?.toLowerCase().includes(term));

    // `search: false` is applied HERE rather than in `duxtScopedPages`, which
    // also feeds `list_pages` and `list_versions`: the opt-out makes a page
    // un-findable, not unpublished, so the tree and the page itself are left
    // alone. Same predicate the client search and the llms indexes use.
    const matches = (await duxtScopedPages(event, scope, setup, true)).filter(
      (page) =>
        duxtPageSearchable(page) &&
        (holds(page.title) || holds(page.description) || holds(page.rawbody))
    );

    if (!matches.length)
      return {
        content: [
          {
            type: 'text',
            text: `Nothing matches "${query}" under ${scope.prefix}.`
          }
        ]
      };

    const { items, nextCursor } = duxtCursorPage(matches, limit, cursor);
    const listing = items.flatMap((page) => {
      const excerpt = duxtExcerpt(page.rawbody, query);

      return excerpt
        ? [duxtPageLine(page), `  ${excerpt}`]
        : [duxtPageLine(page)];
    });

    if (nextCursor) listing.push('', `nextCursor: ${nextCursor}`);

    return { content: [{ type: 'text', text: listing.join('\n') }] };
  }
});
