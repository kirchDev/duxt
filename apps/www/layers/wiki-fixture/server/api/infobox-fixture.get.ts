import { queryInfoboxPages } from '../../../../../../packages/duxt-wiki/server/utils/infobox';
import { selectInfoboxPages } from '../../../../../../packages/duxt-wiki/query-infobox';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const pages = await queryInfoboxPages(
    event,
    query.locale === 'de' ? ['docs_wiki_de', 'docs_wiki'] : ['docs_wiki']
  );
  return {
    pages,
    matches: selectInfoboxPages(
      pages,
      typeof query.type === 'string' ? query.type : 'mode',
      typeof query.where === 'string' ? query.where : 'status=Available'
    )
  };
});
