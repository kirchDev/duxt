import type { DuxtBuildContribution } from '@kirchdev/duxt/unstable';

export default {
  pageTypes: {
    'fixture-article': {
      layout: 'fixture-page',
      template: 'FixtureArticlePage'
    },
    'fixture-category': {
      layout: 'fixture-category',
      template: 'FixtureCategoryPage'
    }
  },
  sectionTypes: {
    'inherited-section': {
      versioning: 'per-version',
      localisation: 'per-locale',
      parse: (input) => {
        if (!input.text().includes('site overrides'))
          throw new Error('DUXT_FIXTURE_PARSER_BUILD_ONLY');
        return [
          {
            file: 'index.md',
            body: '---\nlayerFixture: generated-layer-field\n---\n# Inherited layer section\n\nGenerated prose from the unoverridden layer parser.'
          }
        ];
      }
    },
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
  pageSchema: (z) => ({
    extensionFixture: z.literal('layer-schema-must-be-overridden').optional(),
    layerFixture: z
      .enum(['authored-layer-field', 'generated-layer-field'])
      .optional()
  })
} satisfies DuxtBuildContribution;
