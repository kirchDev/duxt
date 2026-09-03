import type { DuxtSource, DuxtSourcesOptions } from './sources-resolve';

/**
 * This repository's documentation sources.
 *
 * Declared here rather than inline in `content.config.ts` because both halves
 * of the layer need them: Content builds the collections from this list, and
 * the app reads the same list — through `app.config.ts` — to know which
 * collection serves the route it is on. One call site, no drift.
 */
export const sources: DuxtSource[] = [{ path: 'docs' }];

export const sourceOptions: DuxtSourcesOptions = {};
