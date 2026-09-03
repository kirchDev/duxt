import { queryCollection } from '@nuxt/content/nitro';

/**
 * One page's content, for a model that followed the index.
 *
 * `?path=/guide/deploying`. Returns the stored body rather than rendered
 * HTML, because a model reading documentation wants the prose, not the theme
 * around it.
 */
export default defineEventHandler(async (event) => {
  const path = getQuery(event).path as string | undefined;

  if (!path) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A `path` query parameter is required'
    });
  }

  const page = await queryCollection(event, 'docs').path(path).first();

  if (!page) {
    throw createError({ statusCode: 404, statusMessage: `No page at ${path}` });
  }

  return {
    path: page.path,
    title: page.title,
    description: page.description,
    body: page.body
  };
});
