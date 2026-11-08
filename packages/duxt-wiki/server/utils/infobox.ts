import { queryCollection } from '@nuxt/content/server';
import type { H3Event } from 'h3';
import { INFOBOX_FIELDS, loadInfoboxPages } from '../../query-infobox';

export function queryInfoboxPages(event: H3Event, collections: string[]) {
  return loadInfoboxPages(
    async (collection, offset, limit) =>
      await queryCollection(
        event,
        collection as Parameters<typeof queryCollection>[1]
      )
        .select(...INFOBOX_FIELDS)
        .order('path', 'ASC')
        .limit(limit)
        .skip(offset)
        .all(),
    collections
  );
}
