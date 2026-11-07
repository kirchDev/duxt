import type { DuxtBuildContribution } from '@kirchdev/duxt/unstable';

// A same-name site contribution proves precedence over the fixture layer.
export default {
  sectionTypes: {
    'fixture-section': {
      versioning: 'per-version',
      localisation: 'per-locale',
      parse: (input) => {
        if (!input.text().includes('site overrides'))
          throw new Error('DUXT_FIXTURE_PARSER_BUILD_ONLY');
        return [
          {
            file: 'index.md',
            body: '---\nextensionFixture: generated-schema-field\n---\n# Site section override\n\nGenerated fixture prose from the site override.'
          }
        ];
      }
    }
  },
  pageSchema: (z) => ({
    extensionFixture: z
      .enum(['flavor-from-layer', 'generated-schema-field'])
      .optional()
  })
} satisfies DuxtBuildContribution;
