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
 * The page's link and this file's name are composed from the same two halves —
 * `DUXT_BRUNO_ASSETS` and `brunoZipName` — so they cannot drift: two agreeing by
 * coincidence is how a download 404s after somebody renames one.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Nuxt } from '@nuxt/schema';
import {
  DUXT_BRUNO_ASSETS,
  brunoZipEntries,
  brunoZipName,
  zipStore
} from '../bruno-zip';
import { readDuxtBuildConfig } from '../duxt-app-config';
import { duxtManifest, duxtSectionTypes } from '../sections-resolve';
import { diskSectionInput, sectionArtefactExists } from '../section-input';
import { repositoryRoot } from '../repository-root';
import { resolveLatestRefs } from '../sources-git';

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

  // BUILT ONCE, HELD AS BYTES. Both writes below come from this array rather
  // than one of them reading the other's directory back: `buildDir` is not the
  // same path at module setup and at the end of the Nitro build, and a hook
  // that re-read it found nothing there — an empty asset directory and a 404
  // behind the one control the overview is built around.
  const archives = entries.flatMap((entry) => {
    const source = join(repositoryRoot(), entry.path);

    // Silently skipped rather than thrown on: a declared path that is not there
    // already fails the build where the collection is declared, with a message
    // naming the section. Throwing a second, worse one from here would only
    // decide which of the two a reader sees.
    if (!sectionArtefactExists(source, 'directory')) return [];

    return [
      {
        name: brunoZipName(entry.collection),
        data: zipStore(
          brunoZipEntries(diskSectionInput(source, entry.path, 'directory'))
        )
      }
    ];
  });

  if (!archives.length) return;

  const dir = join(nuxt.options.buildDir, 'duxt-bruno');

  write(dir, archives);

  // TWO REGISTRATIONS, because dev and build ask different questions.
  //
  // `publicAssets` is what the DEV server reads: it serves the directory off
  // disk, and it is also what teaches Nitro that `/_duxt/bruno/` is a public
  // URL rather than a route.
  nuxt.hook('nitro:config', (nitro) => {
    nitro.publicAssets ??= [];
    nitro.publicAssets.push({ dir, baseURL: DUXT_BRUNO_ASSETS, maxAge: 0 });
  });

  // The BUILD is the other half, and it is not the same thing said twice:
  // Nitro's own copy pass does not carry a directory inside `.nuxt` into
  // `.output/public`, so registering alone produced a site that knew the URL
  // was an asset and had no file behind it — a 404 on the one control the
  // overview is built around. Copied here, after that pass has run, which is
  // what this hook exists for.
  nuxt.hook('nitro:build:public-assets', (nitro) => {
    write(
      join(nitro.options.output.publicDir, ...DUXT_BRUNO_ASSETS.split('/')),
      archives
    );
  });
}

/** The archives, into one directory. */
function write(dir: string, archives: { name: string; data: Uint8Array }[]) {
  mkdirSync(dir, { recursive: true });

  for (const archive of archives) {
    writeFileSync(join(dir, archive.name), archive.data);
  }
}
