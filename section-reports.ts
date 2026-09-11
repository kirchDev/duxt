import { join } from 'node:path';
import type { DuxtResolvedSource } from './sources-resolve';
import type { DuxtSectionTypes } from './sections-resolve';
import {
  duxtSectionTypes,
  missingSectionArtefact,
  sectionPages
} from './sections-resolve';
import {
  diskSectionInput,
  sectionArtefactExists,
  sectionInputKind
} from './section-input';
import { repositoryRoot } from './repository-root';

/**
 * Fill in what each LOCAL artefact had to say, for the manifest a module holds.
 *
 * The reports `sections.ts` produces while it declares the collections are
 * written onto the manifest `content.config.ts` built, and that is not the
 * manifest anything else reads:
 * a config file and a Nuxt module are loaded through two different loaders, so
 * the duxt modules build one of their own — see `duxtSectionTypes` for the same
 * problem stated about the registry. Rather than smuggle the first manifest
 * across, the artefacts are read again here: a file read and a parse, at build
 * time, over a file the build has already opened once.
 *
 * LOCAL ONLY, and the limit is real rather than chosen. A remote artefact lives
 * wherever Content's hash-cached checkout put it, which is a directory known
 * only inside the collection that declared it — recomputing it here is exactly
 * the second implementation `remoteCollection` refuses to write. A remote
 * section therefore reaches the report with no `report` at all, and
 * `sectionFindings` answers from the page count instead, saying less because
 * less is known.
 */
export function readSectionReports(
  entries: DuxtResolvedSource[],
  types: DuxtSectionTypes = duxtSectionTypes()
): DuxtResolvedSource[] {
  for (const entry of entries) {
    const type = entry.generated && types[entry.generated.type];

    if (!type || entry.generated!.remote) continue;

    const file = join(repositoryRoot(), entry.path);
    const kind = sectionInputKind(type);

    // Both calls record the report on the entry; the return value is the
    // collection's business, not this one's. A missing local artefact throws
    // here exactly as it throws while the collections are declared — the same
    // error, from whichever of the two runs first.
    if (sectionArtefactExists(file, kind)) {
      sectionPages(entry, type, diskSectionInput(file, entry.path, kind));
    } else {
      missingSectionArtefact(entry, file);
    }
  }

  return entries;
}
