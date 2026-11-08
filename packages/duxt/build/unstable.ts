/**
 * @kirchdev/duxt/unstable — unstable until #129 confirms the extraction boundary.
 * Integration helpers. Monorepo packages may import this path while
 * the extraction boundary is evaluated; changes are not breaking changes yet.
 * Build-only: runtime UI uses Nuxt's component/composable surface and the
 * existing pure source resolver export, never this module.
 */
export type {
  DuxtBuildContribution,
  DuxtSourceFlavorDefinition
} from './config/duxt-contributions';
export { readDuxtBuildConfig } from './config/duxt-app-config';
export { frontmatterBlock } from './content/frontmatter';
export { firstLine, pageOrder, urlSegment } from './sections/section-markdown';
export type {
  DuxtSectionContext,
  DuxtSectionInput,
  DuxtSectionOptions,
  DuxtSectionPage,
  DuxtSectionType
} from './sections/sections-resolve';
export { duxtManifest, duxtSectionTypes } from './sections/sections-resolve';
export {
  diskSectionInput,
  sectionArtefactExists
} from './sections/section-input';
export { repositoryRoot } from './sources/repository-root';
export { resolveLatestRefs } from './sources/sources-git';
export { readContentCache } from './content/content-cache';
export { writeReportNotes } from './cli/report-notes';
export { linkWarnings, walk } from './cli/validate-report';
