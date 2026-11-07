import { queryCollection } from '@nuxt/content/server';
export default defineEventHandler(async (event) => ({
  page: await queryCollection(event, 'docs_extension_fixture').first(),
  generated: await queryCollection(
    event,
    'docs_extension_fixture_fixture_section'
  ).first()
}));
