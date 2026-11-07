import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface HistorySource {
  collection: string;
  path: string;
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

const repository = (url: string) =>
  url.replace(/\/?$/, '').replace(/\.git$/, '');

/** Content's own cache identifies the downloaded repository; Git identifies its ref. */
function remoteDirectory(
  source: HistorySource,
  cache: string
): string | undefined {
  let folders: string[];
  try {
    folders = readdirSync(cache);
  } catch {
    return;
  }
  for (const folder of folders) {
    const directory = join(cache, folder);
    try {
      const metadata = JSON.parse(
        readFileSync(join(directory, '.content.cache.json'), 'utf8')
      ) as { url?: string };
      if (
        !metadata.url ||
        repository(metadata.url) !== repository(source.repositoryUrl ?? '')
      )
        continue;
      const ref = `refs/${source.refKind === 'tag' ? 'tags' : 'heads'}/${source.ref ?? 'main'}`;
      git(directory, 'rev-parse', '--verify', ref);
      return directory;
    } catch {
      // Other versions and non-repository cache entries are not this source.
    }
  }
}

/** Runs independently of afterParse, including packs that reuse every cached page. */
export function sourceHistoryProblems(
  sources: HistorySource[],
  root: string,
  remoteRoot: string
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
    const directory = source.remote
      ? remoteDirectory(source, join(remoteRoot, '.data/content'))
      : join(root, source.path);
    if (!directory) {
      problems.push(
        `${source.collection}: no downloaded Git checkout was found`
      );
      continue;
    }
    let key = directory;
    try {
      key = git(directory, 'rev-parse', '--show-toplevel');
    } catch {
      /* The diagnostic below names this source. */
    }
    if (!checked.has(key))
      checked.set(key, sourceHistoryProblem(directory, source.remote));
    const problem = checked.get(key);
    if (problem) problems.push(`${source.collection}: ${problem}`);
  }
  return problems;
}
