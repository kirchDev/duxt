/**
 * The downloadable archive of every Bruno collection the site publishes.
 *
 * WHY A MODULE AND NOT A ROUTE. The `.bru` files exist at BUILD TIME and
 * nowhere else: a site deployed to a Worker has no filesystem, and one deployed
 * anywhere at all has prerendered its pages long before a reader clicks the
 * download. So the archive is written during the build and registered as a
 * public asset — a real file under `.output/public`, served by the assets
 * binding without the server being invoked, which is what every other
 * prerendered thing on these sites already is.
 *
 * LOCAL COLLECTIONS ONLY, and the limit is the one `section-reports.ts` already
 * states for the same reason: a remote artefact lives wherever Content's
 * hash-cached checkout put it, which is a directory known only inside the
 * collection that declared it, and recomputing it here is exactly the second
 * implementation `remoteCollection` refuses to write. `sections-bruno.ts` knows
 * this — a remote section's overview links no archive at all, so there is no
 * dead link rather than a link to a file this module never wrote.
 *
 * The two halves name the file the same way, through `brunoZipPath`, so they
 * cannot drift: one function, two callers.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Nuxt } from '@nuxt/schema';
import { brunoZipEntries, brunoZipPath, zipStore } from '../bruno-zip';
import { readDuxtBuildConfig } from '../duxt-app-config';
import { duxtManifest, duxtSectionTypes } from '../sections-resolve';
import { diskSectionInput, sectionArtefactExists } from '../section-input';
import { repositoryRoot } from '../repository-root';
import { resolveLatestRefs } from '../sources-git';

/** The directory the archives are served from — see `brunoZipPath`. */
const BASE = '/_duxt/bruno';

export default function duxtBruno(_options: unknown, nuxt: Nuxt) {
  const dirs = nuxt.options._layers
    .flatMap((entry) => [entry.config.rootDir, entry.config.srcDir])
    .filter(Boolean) as string[];

  const config = readDuxtBuildConfig(dirs);
  const types = duxtSectionTypes(config?.sectionTypes);

  const entries = duxtManifest(
    resolveLatestRefs(config?.sources ?? [{ path: 'docs' }]),
    config?.sourceOptions ?? {},
    types
  ).filter(
    (entry) => entry.generated?.type === 'bruno' && !entry.generated.remote
  );

  if (!entries.length) return;

  const dir = join(nuxt.options.buildDir, 'duxt-bruno');

  mkdirSync(dir, { recursive: true });

  for (const entry of entries) {
    const source = join(repositoryRoot(), entry.path);

    // Silently skipped rather than thrown on: a declared path that is not there
    // already fails the build where the collection is declared, with a message
    // naming the section. Throwing a second, worse one from here would only
    // decide which of the two a reader sees.
    if (!sectionArtefactExists(source, 'directory')) continue;

    const zip = zipStore(
      brunoZipEntries(diskSectionInput(source, entry.path, 'directory'))
    );

    writeFileSync(join(dir, `${entry.collection}.zip`), zip);
  }

  // Registered on Nitro rather than copied into the site's own `public/`: the
  // archives are build output, and a build that wrote into the source tree
  // would leave a stale one behind for every section ever renamed.
  nuxt.hook('nitro:config', (nitro) => {
    nitro.publicAssets ??= [];
    nitro.publicAssets.push({ dir, baseURL: BASE, maxAge: 0 });
  });
}

/** Where an archive is served, for anything that needs to say so. */
export { brunoZipPath };
