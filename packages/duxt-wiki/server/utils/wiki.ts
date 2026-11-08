import { queryCollection } from '@nuxt/content/server';
import type { H3Event } from 'h3';
import { loadWikiPages, WIKI_FIELDS } from '../../queries';

/** Request-local metadata, shared by all link/category lookups for one page. */
export async function queryWikiPages(event: H3Event, collections: string[]) {
  return loadWikiPages(
    async (collection, offset, limit) =>
      await queryCollection(
        event,
        collection as Parameters<typeof queryCollection>[1]
      )
        .select(...WIKI_FIELDS)
        .order('path', 'ASC')
        .limit(limit)
        .skip(offset)
        .all(),
    collections
  );
}
