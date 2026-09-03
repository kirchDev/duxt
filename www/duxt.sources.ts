import type {
  DuxtSource,
  DuxtSourcesOptions
} from '@kirchdev/duxt/sources-resolve';

/**
 * The development site's sources — deliberately the awkward case.
 *
 * Two repositories and two refs, so every branch of the resolver is exercised
 * by the site the layer is built against: a repository segment appears because
 * there is more than one repository, a version segment because `workflows` is
 * published at two refs. A consumer with one unversioned folder gets none of
 * that, and that case is covered by the layer's own content.config.
 */
export const sources: DuxtSource[] = [
  // This repository's own documentation.
  { path: 'docs', slug: 'duxt' },

  // Another repository, at a branch and at a tag. kirchDev/workflows is used
  // because it has a real docs/ tree and a real tag to read from.
  {
    repo: 'kirchDev/workflows',
    path: 'docs',
    refs: ['main', { tag: 'v0.7.0' }]
  }
];

export const sourceOptions: DuxtSourcesOptions = { defaultRef: 'main' };
