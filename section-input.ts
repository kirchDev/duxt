/**
 * A generated section's artefact, read off disk.
 *
 * The disk half of `DuxtSectionInput`, split out of `sections.ts` for the one
 * reason that file is split from `sections-resolve.ts`: two callers need it and
 * only one of them is allowed to import `@nuxt/content`. `sections.ts` builds
 * the collections, `section-reports.ts` reads the same artefacts again for the
 * manifest the modules hold, and both want the same handle over the same path.
 *
 * Nothing here knows what an artefact MEANS. It opens a file or walks a tree
 * and hands the result to the type, which is the seam `DuxtSectionInput`
 * documents: a resolver that understood a Bruno collection would have to
 * understand the next type's tree as well.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { DuxtSectionInput, DuxtSectionType } from './sections-resolve';

/**
 * Directories a walk never descends into.
 *
 * Not a taste call: `bruno.json`'s own `ignore` key defaults to exactly these
 * two, and a docs repository that happens to have installed dependencies beside
 * its collection would otherwise be read file by file into a section.
 */
const SKIP = new Set(['.git', 'node_modules']);

/** What a type's `input` policy says the declared path is. */
export function sectionInputKind(type: DuxtSectionType): 'file' | 'directory' {
  return type.input ?? 'file';
}

/**
 * Whether the declared artefact is there, AS THE TYPE EXPECTS IT.
 *
 * A directory where a file was declared is as missing as nothing at all — the
 * type would read it and find nothing — and saying so here is what lets
 * `missingSectionArtefact` keep one message for both.
 */
export function sectionArtefactExists(
  absolute: string,
  kind: 'file' | 'directory'
): boolean {
  if (!existsSync(absolute)) return false;

  const stats = statSync(absolute);

  return kind === 'directory' ? stats.isDirectory() : stats.isFile();
}

/**
 * The artefact at `absolute`, as the type reads it.
 *
 * LAZY: nothing is opened until the type asks. A directory's listing is walked
 * once and kept, because a type reads it more than once — a Bruno collection
 * asks for `bruno.json`, then for every `folder.bru`, then for every request —
 * and a second walk between two of those could see a different tree.
 */
export function diskSectionInput(
  absolute: string,
  path: string,
  kind: 'file' | 'directory'
): DuxtSectionInput {
  if (kind === 'file') {
    return {
      path,
      kind,
      text: () => readFileSync(absolute, 'utf8'),
      files: () => [],
      read: () => ''
    };
  }

  let listing: string[] | undefined;

  const files = () => (listing ??= walk(absolute));

  return {
    path,
    kind,
    text: () => {
      throw new Error(
        `duxt: "${path}" is a directory, and this type asked it for a file.`
      );
    },
    files,
    read: (file) => {
      // Read through the LISTING rather than straight off the path handed in:
      // a type composing a name out of its own parsing could otherwise walk out
      // of the section with `../`, and a documentation build that reads an
      // arbitrary file off the machine it runs on is not a thing to leave open.
      if (!files().includes(file)) return '';

      return readFileSync(join(absolute, ...file.split('/')), 'utf8');
    }
  };
}

/**
 * Every file under a directory, as `/`-separated relative paths, sorted.
 *
 * Sorted because a directory listing is not ordered: a section whose page order
 * came from `readdir` would reorder itself on a different filesystem, and the
 * URLs with it.
 *
 * Symlinks are not followed — `withFileTypes` reports one as neither a file nor
 * a directory once `isSymbolicLink` is asked first — for the reason `read`
 * checks its listing: a link out of the collection is a file this build has no
 * business opening.
 */
function walk(root: string): string[] {
  const out: string[] = [];

  const descend = (dir: string) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      if (item.isSymbolicLink()) continue;

      const full = join(dir, item.name);

      if (item.isDirectory()) {
        if (SKIP.has(item.name)) continue;
        descend(full);
        continue;
      }

      if (item.isFile()) out.push(relative(root, full).split(sep).join('/'));
    }
  };

  descend(root);

  return out.sort();
}
