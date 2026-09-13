import { realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';

/**
 * A build run from inside a `.git` directory, refused where it is still cheap.
 *
 * TWO UPSTREAM TOOLS TREAT `.git` AS A PLACE SOURCE CANNOT LIVE, and both are
 * right about the ordinary case and wrong about a git worktree, which is a
 * perfectly normal checkout that merely happens to sit there:
 *
 *   - nitropack's imports resolver seeds `imports.exclude` with
 *     `/[/\\]\.git[/\\]/` whenever the option is still empty, and unimport's
 *     unplugin matches that against each module's ABSOLUTE path. Every server
 *     file of a checkout under `.git/` matches, so no auto-import is ever
 *     injected into any of them and the build dies in the prerender pass as
 *     `defineMcpTool is not defined` — a real symbol, in a real file, that
 *     nothing has broken.
 *   - Vite's `server.fs.deny` defaults to `['**\/.git/**', …]`, so vitest
 *     cannot load a test file from such a checkout either: `tests/…` comes back
 *     as `Cannot find module`, 0 tests collected.
 *
 * Neither is duxt's to fix, and neither can be turned off from here without
 * pushing a weakened default onto every site that extends this layer. What is
 * affordable is saying so at the start rather than letting it surface as a
 * missing auto-import ten minutes later: three separate runs met that failure
 * and two of them concluded, reasonably and wrongly, that the branch was
 * broken. See https://github.com/kirchDev/duxt/issues/87.
 *
 * IT MATTERS BECAUSE NOBODY CHOOSES THIS LOCATION BY HAND. Agent worktrees land
 * under `.git/tituskirch-skills/work/…`, so it is on the path any parallel
 * implement or review run takes.
 */

/** The escape hatch, for the day upstream stops excluding `.git`. */
const OVERRIDE = 'DUXT_ALLOW_GIT_DIR';

/**
 * Does this path have a `.git` directory as one of its segments?
 *
 * Segment equality, not a substring: `.github/`, `my.git/` and a file called
 * `.gitignore` are not git directories, and neither upstream pattern matches
 * them either — nitro's regex demands a separator straight after `.git`, and
 * Vite's `**\/.git/**` is a whole-segment glob. Matching more loosely here
 * would refuse builds that work.
 */
export function underGitDirectory(path: string): boolean {
  return resolve(path).split(sep).includes('.git');
}

/**
 * Refuse, naming the reason, when `root` resolves underneath a `.git`
 * directory.
 *
 * The real path, because a symlink from a sane location into `.git/` is the
 * same trap: what the tools above match is the absolute path each file resolves
 * to, not the one that was typed. An unresolvable path is left to whatever
 * reads it next — this guard exists to explain one specific failure, not to
 * become a second source of them.
 */
export function refuseGitDirectory(root: string, command: string): void {
  if (process.env[OVERRIDE]) return;

  let real: string;
  try {
    real = realpathSync(resolve(root));
  } catch {
    return;
  }
  if (!underGitDirectory(real)) return;

  throw new Error(
    `Cannot run ${command} from inside a .git directory:\n` +
      `  ${real}\n\n` +
      'Nitro excludes every path containing a `.git` segment from auto-import ' +
      'injection, and Vite refuses to serve one, so this build would fail ' +
      'later and misleadingly — `defineMcpTool is not defined` out of the ' +
      'prerender chunk, and `Cannot find module` for the jsdom test suite. ' +
      'Nothing is wrong with the branch.\n\n' +
      'Create the worktree outside the repository instead, e.g. ' +
      '`git worktree add ../duxt-<branch>`. See ' +
      `https://github.com/kirchDev/duxt/issues/87. Set ${OVERRIDE}=1 to run ` +
      'anyway.'
  );
}
