import { fileURLToPath } from 'node:url';
import type { Nuxt } from '@nuxt/schema';
import { readDuxtBuildConfig } from '../duxt-app-config';
import { duxtSourceManifest } from '../sources-resolve';
import { resolveLatestRefs } from '../sources-git';
import { readContentCache } from '../content-cache';
import type { PageRecord } from '../validate-report';
import { report, walk } from '../validate-report';

/**
 * Catch the silent failures.
 *
 * Every bug this layer actually had was quiet: a collection Content dropped
 * because its name was not an identifier, a page that 404ed because a link had
 * gone stale, a navigation that came back empty. None of the three said
 * anything — the build was green and the site was wrong.
 *
 * All four checks read ONE thing: the parse cache, through
 * `readContentCache`. See that file for why the parse hook is the wrong seam.
 *
 * Severity is not uniform, on purpose:
 *
 *  - a URL collision or an empty collection is an ERROR, because the page it
 *    costs is unreachable and no amount of reading the site would say why;
 *  - a broken link or a missing `title` is a WARNING naming the file, because
 *    the page still renders and a remote source can go stale between releases
 *    without that being this build's fault;
 *  - what each language carries, and what has stood still behind its original,
 *    is a NOTE — a state of the site rather than a defect in it. It is here
 *    because nothing else in the layer ever says it out loud, and a translation
 *    that quietly stopped moving is the failure this whole file is about.
 */

export default function duxtValidate(_options: unknown, nuxt: Nuxt) {
  const layerDir = fileURLToPath(new URL('..', import.meta.url));

  const dirs = [
    ...nuxt.options._layers.flatMap((entry) => [
      entry.config.rootDir,
      entry.config.srcDir
    ]),
    layerDir
  ].filter(Boolean) as string[];

  const config = readDuxtBuildConfig(dirs);
  const sources = duxtSourceManifest(
    resolveLatestRefs(config?.sources ?? [{ path: 'docs' }]),
    config?.sourceOptions ?? {}
  );

  // `build:done` rather than `modules:done`: Content fills the cache in a
  // `modules:done` listener of its own, and this module is registered before
  // Content so its listener would run first and read the previous build's
  // answer.
  nuxt.hook('build:done', () => {
    const cached = readContentCache(
      nuxt,
      sources.map((source) => source.collection)
    );

    if (!cached) return;

    const pages: PageRecord[] = cached.map((entry) => {
      const anchors = new Set<string>();
      const links: { href: string }[] = [];
      walk(entry.content.body, anchors, links);

      return {
        collection: entry.collection,
        path: entry.path,
        file: entry.file,
        title:
          typeof entry.content.title === 'string'
            ? entry.content.title
            : undefined,
        description:
          typeof entry.content.description === 'string'
            ? entry.content.description
            : undefined,
        anchors,
        links,
        lastUpdated:
          typeof entry.content.lastUpdated === 'string'
            ? entry.content.lastUpdated
            : undefined
      };
    });

    const problems = report(sources, pages);

    // The translation report is INFORMATION, not a finding: an untranslated
    // page is a state of the site rather than a defect in it, and printing it
    // as a warning would train everyone to ignore the warnings.
    if (problems.notes.length) {
      console.info('[duxt] translations');
      for (const note of problems.notes) console.info(`[duxt]   ${note}`);
    }

    for (const warning of problems.warnings) {
      console.warn(`[duxt] ${warning}`);
    }

    if (problems.errors.length) {
      throw new Error(
        `duxt: the documentation did not validate.\n  - ${problems.errors.join('\n  - ')}`
      );
    }
  });
}
