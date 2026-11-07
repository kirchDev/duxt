import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import type { Nuxt } from '@nuxt/schema';

export interface HistorySource {
  collection: string;
  path: string;
  prefix?: string;
  remote: boolean;
  repositoryUrl?: string;
  ref?: string;
  refKind?: 'branch' | 'tag';
}

const git = (directory: string, ...args: string[]) =>
  execFileSync('git', ['-C', directory, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();

/** A shallow history is never used as if its tip had authored every page. */
export function sourceHistoryProblem(
  directory: string,
  remote = false
): string | undefined {
  try {
    git(directory, 'rev-parse', '--show-toplevel');
    git(directory, 'rev-parse', '--verify', 'HEAD');
    if (git(directory, 'rev-parse', '--is-shallow-repository') !== 'true')
      return;
    if (remote) {
      try {
        git(directory, 'fetch', '--unshallow', '--quiet');
        if (git(directory, 'rev-parse', '--is-shallow-repository') !== 'true')
          return;
      } catch {
        return 'the checkout is shallow and its history could not be fetched';
      }
    }
    return 'the Git checkout is shallow';
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT'
      ? 'git is unavailable'
      : 'no Git checkout with a readable history was found';
  }
}

export interface HistoryDirectory {
  directory: string;
  prefix: string;
}

/** The same prepared source objects Content used, not a guessed clone/ref path. */
export function historySourceDirectories(
  nuxt: Nuxt,
  sources: HistorySource[],
  root: string
): Map<string, HistoryDirectory[]> {
  const template = nuxt.options.build?.templates?.find(
    (entry) =>
      typeof entry !== 'string' && entry.filename === 'content/types.d.ts'
  );
  const collections =
    typeof template === 'object'
      ? (
          template.options as
            | {
                collections?: {
                  name: string;
                  source?: {
                    cwd?: string;
                    include?: string;
                    prefix?: string;
                  }[];
                }[];
              }
            | undefined
        )?.collections
      : undefined;
  const directories = new Map<string, HistoryDirectory[]>();
  for (const source of sources) {
    if (!collections) {
      if (source.remote)
        throw new Error(
          'Content no longer exposes its prepared source directories.'
        );
      directories.set(source.collection, [
        { directory: join(root, source.path), prefix: source.prefix ?? '' }
      ]);
      continue;
    }
    const collection = collections.find(
      (entry) => entry.name === source.collection
    );
    const prepared = (collection?.source ?? []).flatMap((entry) => {
      if (!entry.cwd || typeof entry.include !== 'string') return [];
      const fixed = entry.include.includes('*')
        ? entry.include.split('*')[0]!
        : '';
      return [
        { directory: join(entry.cwd, fixed), prefix: entry.prefix ?? '' }
      ];
    });
    directories.set(source.collection, prepared);
  }
  return directories;
}

/** Runs independently of afterParse, including packs that reuse every cached page. */
export function sourceHistoryProblems(
  sources: HistorySource[],
  directories: ReadonlyMap<string, HistoryDirectory[]>,
  fetchHistory = false
): string[] {
  if (!sources.length) return [];
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
  } catch {
    return ['git is unavailable for sources that read history'];
  }
  const checked = new Map<string, string | undefined>();
  const problems: string[] = [];
  for (const source of sources) {
    const entries = directories.get(source.collection) ?? [];
    if (!entries.length)
      problems.push(`${source.collection}: no prepared Git checkout was found`);
    for (const { directory } of entries) {
      let key = directory;
      try {
        key = git(directory, 'rev-parse', '--show-toplevel');
      } catch {
        /* The diagnostic below names the source. */
      }
      if (!checked.has(key))
        checked.set(
          key,
          sourceHistoryProblem(directory, fetchHistory && source.remote)
        );
      const problem = checked.get(key);
      if (problem) problems.push(`${source.collection}: ${problem}`);
    }
  }
  return problems;
}
