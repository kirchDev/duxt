import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../..', import.meta.url));

function git(...args: string[]) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 300_000
  }).trim();
}

/**
 * A content pack refuses shallow history, and CI checks out one commit.
 *
 * The commit is named rather than left to the remote's refspec: a pull request
 * checks out a merge commit that no branch reaches, so a plain `--unshallow`
 * would leave its boundary in place. A full clone returns before touching the
 * network.
 */
export function ensureFullHistory() {
  if (git('rev-parse', '--is-shallow-repository') !== 'true') return;
  git('fetch', '--unshallow', 'origin', git('rev-parse', 'HEAD'));
}
