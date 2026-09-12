/**
 * Generated sections, as Content collections.
 *
 * The build-time half of `sections-resolve.ts`, split from it for the reason
 * `sources.ts` is split from `sources-resolve.ts`: this file imports
 * `@nuxt/content` and reads files off disk, and the bundler refuses to follow
 * either out of app code.
 *
 * A section is an ORDINARY collection — nothing here mounts a route, adds a
 * hook or reaches into the renderer. What makes that possible is Content's
 * custom collection source: `getKeys` and `getItem` hand it a list of files and
 * their contents, so a type's parser can turn one artefact into as many pages as
 * it has releases, endpoints or records, and Content parses them exactly as it
 * parses Markdown on disk.
 *
 * Reading a file is all that is left here. What a finding MEANS — a missing
 * artefact, a type that read nothing out of one — is the severity policy, and
 * it lives in the pure half where a test can reach it.
 */
import { join } from 'node:path';
import { defineCollection, defineCollectionSource } from '@nuxt/content';
import type {
  DuxtResolvedSource,
  DuxtSource,
  DuxtSourcesOptions
} from './sources-resolve';
import type {
  DuxtSectionPage,
  DuxtSectionType,
  DuxtSectionTypes
} from './sections-resolve';
import {
  duxtSectionTypes,
  generatedSectionRef,
  missingSectionArtefact,
  resolveGeneratedSections,
  sectionPages
} from './sections-resolve';
import {
  diskSectionInput,
  sectionArtefactExists,
  sectionInputKind
} from './section-input';
import { resolveLatestRefs } from './sources-git';
import { pageSchema, repositoryRoot } from './sources';

/**
 * One collection per declared section.
 *
 * Composed beside `duxtSources` rather than inside it: both read the same
 * source list, and keeping them apart is what lets `duxtSources` walk its own
 * result index-for-index against `expandSources`.
 */
export function duxtGeneratedCollections(
  input: DuxtSource[],
  options: DuxtSourcesOptions = {},
  types: DuxtSectionTypes = duxtSectionTypes()
) {
  // The same `latest` resolution both other entry points do. Cached per
  // repository for the life of the process, so asking again is free and cannot
  // straddle a release.
  const sources = resolveLatestRefs(input);
  const collections: Record<string, ReturnType<typeof defineCollection>> = {};

  for (const entry of resolveGeneratedSections(sources, options, types)) {
    const type = types[entry.generated!.type]!;

    collections[entry.collection] = entry.generated!.remote
      ? remoteCollection(entry, type)
      : localCollection(entry, type);
  }

  return collections;
}

/**
 * A section whose artefact is in the repository being built.
 *
 * Read and parsed HERE, while the config is being loaded, rather than lazily:
 * the file is on disk already, and a missing one is an error this build must
 * fail on — see `missingSectionArtefact`. Failing at config load says which
 * section and which path, where the same throw from inside the parse pass says
 * neither.
 */
function localCollection(entry: DuxtResolvedSource, type: DuxtSectionType) {
  // The checkout goes with the handle, which is what lets the release history
  // read the commits between two tags. Only here: `remoteCollection` below has
  // a `--depth 1` clone and deliberately passes none.
  const root = repositoryRoot();
  const file = join(root, entry.path);
  const kind = sectionInputKind(type);

  const pages = sectionArtefactExists(file, kind)
    ? sectionPages(entry, type, diskSectionInput(file, entry.path, kind, root))
    : missingSectionArtefact(entry, file);

  const source = defineCollectionSource({
    getKeys: async () => pages.map((page) => page.file),
    getItem: async (key) => body(pages, key)
  });

  // The URL these pages are served at. Content builds a page's path from its
  // key with the source's prefix in front, which is the whole reason a section
  // needs no route of its own.
  source.prefix = entry.prefix;

  return defineCollection({ type: 'page', schema: pageSchema, source });
}

/**
 * A section whose artefact is in a repository Content downloads.
 *
 * The download is Content's, not this layer's: the collection is declared with
 * the ordinary `repository` source, and only `getKeys`/`getItem` are replaced.
 * That is deliberate — where the checkout lands under `.data/content/` is
 * Content's own hash-cached answer, and a second implementation of it would be
 * a directory name that drifts on the first release.
 *
 * Lazy, because the checkout does not exist until Content has run `prepare`.
 */
function remoteCollection(entry: DuxtResolvedSource, type: DuxtSectionType) {
  const ref = generatedSectionRef(entry);
  const url = entry.repositoryUrl!;

  const collection = defineCollection({
    type: 'page',
    schema: pageSchema,
    source: {
      repository: ref
        ? 'tag' in ref
          ? { url, tag: ref.tag }
          : { url, branch: ref.branch }
        : url,
      include: entry.path
    }
  });

  const source = collection.source![0]!;
  source.prefix = entry.prefix;

  let pages: DuxtSectionPage[] | undefined;

  const read = () => {
    if (pages) return pages;

    // `cwd` is where Content put the checkout, filled in by the `prepare` it
    // installed on this source and run before the first `getKeys`.
    const file = join(source.cwd, entry.path);
    const kind = sectionInputKind(type);

    pages = sectionArtefactExists(file, kind)
      ? sectionPages(entry, type, diskSectionInput(file, entry.path, kind))
      : missingSectionArtefact(entry, file);

    return pages;
  };

  source.getKeys = async () => read().map((page) => page.file);
  source.getItem = async (key) => body(read(), key);

  return collection;
}

/** One page's file, by name. */
function body(pages: DuxtSectionPage[], key: string): string {
  return pages.find((page) => page.file === key)?.body ?? '';
}
