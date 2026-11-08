import { queryWikiPages } from '@kirchdev/duxt-wiki/server';
import {
  resolveWikiTargets,
  wikiIncoming,
  wikiCategory
} from '@kirchdev/duxt-wiki/queries';

export default defineEventHandler(async (event) => {
  const pages = await queryWikiPages(event, ['docs_wiki']);
  const query = getQuery(event);
  const title = typeof query.title === 'string' ? query.title : 'ÉLITE_%';
  const path = typeof query.path === 'string' ? query.path : '/target';
  const resolved = resolveWikiTargets(pages, [title, 'FAST', path], '/wiki');
  const target = resolved[1]!.pages[0];
  return {
    pages,
    resolved,
    incoming: target ? wikiIncoming(pages, target, '/wiki') : [],
    category: wikiCategory(pages, 'Modes'),
    unpaged: wikiCategory(pages, 'Unpaged')
  };
});
