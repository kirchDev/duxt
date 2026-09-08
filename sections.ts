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
 */
import { existsSync, readFileSync } from 'node:fs';
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
  resolveGeneratedSections
} from './sections-resolve';
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
 * fail on — see `missing`. Failing at config load says which section and which
 * path, where the same throw from inside the parse pass says neither.
 */
function localCollection(entry: DuxtResolvedSource, type: DuxtSectionType) {
  const file = join(repositoryRoot(), entry.path);

  const pages = existsSync(file)
    ? parse(entry, type, readFileSync(file, 'utf8'))
    : missing(entry, file);

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

    pages = existsSync(file)
      ? parse(entry, type, readFileSync(file, 'utf8'))
      : missing(entry, file);

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

/**
 * The artefact, as the type reads it.
 *
 * A type that produces nothing out of a file that exists is the same finding as
 * a file that is not there, and carries the same severity — the section would
 * otherwise be an empty collection, which is a 404 on every URL it claims and
 * nothing said about why.
 */
function parse(
  entry: DuxtResolvedSource,
  type: DuxtSectionType,
  artefact: string
): DuxtSectionPage[] {
  const pages = type.parse(artefact, {
    label: entry.generated!.label,
    prefix: entry.prefix
  });

  if (!pages.length) {
    const problem =
      `holds nothing the "${entry.generated!.type}" type can read, so the ` +
      `section "${entry.generated!.label}" has no pages`;

    if (entry.generated!.remote) {
      console.warn(`[duxt] ${entry.path} in ${where(entry)} ${problem}.`);
    } else {
      throw new Error(`duxt: ${entry.path} ${problem}.`);
    }
  }

  return pages;
}

/**
 * A declared artefact that is not there.
 *
 * The severity is not uniform, and follows the rule `modules/validate.ts`
 * already states. A LOCAL source is the site's own configuration, so a path
 * that does not exist is a mistake in it and fails the build. A REMOTE one may
 * legitimately not have had the file at an older tag — a remote source can go
 * stale between releases without that being this build's fault — so it warns,
 * names the source and the ref, and the section is simply not built.
 *
 * Returns the pages a caller should carry on with, which for the warning case
 * is none — so the two severities read as one expression at both call sites.
 */
function missing(entry: DuxtResolvedSource, file: string): DuxtSectionPage[] {
  if (entry.generated!.remote) {
    console.warn(
      `[duxt] the generated section "${entry.generated!.label}" declares ` +
        `${entry.path}, which ${where(entry)} does not have. ` +
        'The section is not built.'
    );
    return [];
  }

  throw new Error(
    `duxt: the generated section "${entry.generated!.label}" declares ` +
      `${entry.path}, which this repository does not have (looked in ${file}). ` +
      "A generated section resolves its path against the source's own root."
  );
}

/** The repository and ref an artefact was looked for in. */
function where(entry: DuxtResolvedSource): string {
  return `${entry.repository ?? entry.repositoryUrl ?? 'the source'}${
    entry.ref ? `@${entry.ref}` : ''
  }`;
}
