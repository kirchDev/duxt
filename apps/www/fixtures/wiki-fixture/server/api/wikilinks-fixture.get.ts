import { queryCollection } from '@nuxt/content/server';
export default defineEventHandler(async (event) => {
  const page = await queryCollection(event, 'docs_wiki')
    .path('/wiki/wikilinks')
    .select('rawbody', 'body')
    .first();
  return { rawbody: page?.rawbody, body: page?.body };
});
