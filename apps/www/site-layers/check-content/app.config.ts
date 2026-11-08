import { siteSources } from '../../app/site-sources';

export default defineAppConfig({
  duxt: {
    sources: [
      ...siteSources,
      {
        path: 'apps/www/fixtures/wiki-fixture/docs',
        slug: 'wiki',
        pageType: 'article',
        origin: { repo: 'kirchDev/duxt', ref: 'dev' },
        history: false,
        locales: [
          'en-GB',
          { locale: 'de', path: 'apps/www/fixtures/wiki-fixture/de' }
        ]
      },
      {
        path: 'apps/www/fixtures/build-extension/page-types',
        slug: 'page-types',
        pageType: 'fixture-article',
        history: false,
        locales: ['en-GB']
      },
      {
        path: 'apps/www/fixtures/build-extension/docs',
        slug: 'extension-fixture',
        history: false,
        flavor: 'fixture-flavor',
        locales: ['en-GB'],
        generated: [
          {
            type: 'fixture-section',
            path: 'apps/www/fixtures/build-extension/fixture.txt',
            label: 'Fixture section'
          },
          {
            type: 'inherited-section',
            path: 'apps/www/fixtures/build-extension/fixture.txt',
            label: 'Inherited layer section'
          }
        ]
      }
    ]
  }
});
