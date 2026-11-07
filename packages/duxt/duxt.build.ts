import type { DuxtBuildContribution } from './build/config/duxt-contributions';
import { changelogSectionType } from './build/sections/sections-changelog';
import { openapiSectionType } from './build/openapi/section';
import { brunoSectionType } from './build/bruno/section';
import { normaliseTfplugindocsPage } from './build/tfplugindocs/flavor';

export default {
  sectionTypes: {
    changelog: changelogSectionType,
    openapi: openapiSectionType,
    bruno: brunoSectionType
  },
  sourceFlavors: { tfplugindocs: { normalise: normaliseTfplugindocsPage } },
  pageSchema: (z) => ({
    page_title: z.string().optional(),
    subcategory: z.string().optional(),
    category: z.string().optional()
  })
} satisfies DuxtBuildContribution;
