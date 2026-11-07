import type { DuxtBuildContribution } from '@kirchdev/duxt/unstable';

export default {
  sectionTypes: {
    'fixture-section': {
      versioning: 'per-version',
      localisation: 'per-locale',
      parse: () => [
        {
          file: 'index.md',
          body: '# Layer section must be overridden\n\nDUXT_FIXTURE_PARSER_BUILD_ONLY'
        }
      ]
    }
  },
  sourceFlavors: {
    'fixture-flavor': {
      normalise(page) {
        page.title = 'Layer source flavor';
        page.extensionFixture = 'flavor-from-layer';
      }
    }
  },
  pageSchema: (z) => ({ extensionFixture: z.string().optional() })
} satisfies DuxtBuildContribution;
