import { z } from 'zod';
import {
  DUXT_PAGE_MAX,
  DUXT_PAGE_SIZE,
  duxtBadCursor,
  duxtCursorPage,
  duxtLocaleSetup,
  duxtPageLine,
  duxtScope,
  duxtScopedPages,
  duxtSources,
  duxtUnknownScope,
  duxtValidCursor
} from '../../utils/mcp-docs';

/**
 * The documentation's table of contents, for a model.
 *
 * Built on @nuxtjs/mcp-toolkit rather than a JSON endpoint of our own: it
 * speaks the actual protocol through the official SDK, so a client connects to
 * `/mcp` instead of someone writing a server around our shape.
 *
 * BOUNDED AND SCOPED, where it used to return every page of every version and
 * every language in one unlabelled block. A prefix from `list_versions` picks
 * the edition; `limit` and `cursor` keep one call's answer readable. Omitting
 * the prefix still lists the whole site — in its default language, because the
 * locale is part of the prefix rather than an axis of its own.
 */
export default defineMcpTool({
  name: 'list_pages',
  title: 'List documentation pages',
  description:
    'The pages of this documentation with their path, title and description. ' +
    'Scope with a prefix from `list_versions`, or omit it for every version. ' +
    'Then read a page with `read_page`.',
  annotations: { readOnlyHint: true },

  inputSchema: {
    prefix: z
      .string()
      .optional()
      .describe(
        'URL prefix from `list_versions`, for example /app or /de/app. ' +
          'Omit for every version in the default language.'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(DUXT_PAGE_MAX)
      .default(DUXT_PAGE_SIZE)
      .describe(`How many pages to return, at most ${DUXT_PAGE_MAX}`),
    cursor: z
      .string()
      .optional()
      .describe('`nextCursor` from a previous call, to continue the listing')
  },

  async handler({ prefix, limit, cursor }, extra) {
    if (cursor && !duxtValidCursor(cursor)) return duxtBadCursor(cursor);

    const setup = duxtLocaleSetup(extra.event);
    const scope = duxtScope(prefix, duxtSources(), setup);
    if (!scope) return duxtUnknownScope(prefix!);

    const pages = await duxtScopedPages(extra.event, scope, setup);
    const { items, nextCursor } = duxtCursorPage(pages, limit, cursor);

    if (!items.length)
      return {
        content: [
          {
            type: 'text',
            text: cursor
              ? `No further pages under ${scope.prefix}.`
              : `No pages are published under ${scope.prefix}.`
          }
        ]
      };

    const listing = [
      `${items.length} page(s) under ${scope.prefix}:`,
      ...items.map(duxtPageLine)
    ];
    // The cursor is stated rather than implied: a listing that simply stops at
    // the limit reads as complete, and an agent then documents half a site.
    if (nextCursor) listing.push('', `nextCursor: ${nextCursor}`);

    return { content: [{ type: 'text', text: listing.join('\n') }] };
  }
});
