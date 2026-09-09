/**
 * One command, spelled the way each package manager spells it.
 *
 * A `::package-managers` block is written ONCE, without the manager — `add -D
 * pkg`, `run build` — and this turns it into what each of the four would
 * actually type. It used to live inside the component and translate two things
 * (npm's `install`, each manager's `dlx`), which was enough for the two commands
 * this project's own documentation happens to write and a trap for every other.
 * Out here it is testable, which is the point: the table below is the whole
 * feature, and a table is exactly the kind of thing that rots unnoticed.
 *
 * YARN MEANS BERRY (≥ 2). The old code already assumed it — `yarn dlx` exists
 * nowhere else — without saying so. Berry is also why two cells are empty rather
 * than approximated, see below.
 *
 * EVERY SPELLING HERE WAS READ OFF THE CLI, not remembered: pnpm 12.3.4,
 * npm 11.6.2, yarn 4.10.3, bun 1.3.14. Three of them contradicted the obvious
 * guess — Berry audits with `yarn npm audit`, updates with `yarn up`, and has no
 * `outdated` at all.
 */

// `satisfies` rather than a second definition: `DuxtPackageManager` is declared
// in `app/types/duxt.d.ts`, which owns the config key this list is the default
// for, and this checks the list against it in the one direction the type cannot
// check itself. The other direction is covered by `dlx` below, which maps every
// member of the union.
export const duxtPackageManagers = [
  'pnpm',
  'npm',
  'yarn',
  'bun'
] as const satisfies readonly DuxtPackageManager[];

/**
 * The verb, per manager. A manager missing from a row HAS NO EQUIVALENT, and
 * that is a deliberate hole rather than an unfinished cell.
 *
 * Berry dropped `outdated`; its nearest relative, `upgrade-interactive`, does
 * something else — it upgrades, where `outdated` only reports — and npm has no
 * `patch` in any spelling. Printing the nearest thing would hand a reader a
 * command that quietly does the wrong job, so the block drops that manager's tab
 * instead and the build validator says which page asked for it.
 */
const verbs: Record<string, Partial<Record<DuxtPackageManager, string>>> = {
  add: { pnpm: 'add', npm: 'install', yarn: 'add', bun: 'add' },
  install: { pnpm: 'install', npm: 'install', yarn: 'install', bun: 'install' },
  remove: { pnpm: 'remove', npm: 'uninstall', yarn: 'remove', bun: 'remove' },
  run: { pnpm: 'run', npm: 'run', yarn: 'run', bun: 'run' },
  exec: { pnpm: 'exec', npm: 'exec', yarn: 'exec', bun: 'exec' },
  create: { pnpm: 'create', npm: 'create', yarn: 'create', bun: 'create' },
  update: { pnpm: 'update', npm: 'update', yarn: 'up', bun: 'update' },
  outdated: { pnpm: 'outdated', npm: 'outdated', bun: 'outdated' },
  audit: { pnpm: 'audit', npm: 'audit', yarn: 'npm audit', bun: 'audit' },
  link: { pnpm: 'link', npm: 'link', yarn: 'link', bun: 'link' },
  why: { pnpm: 'why', npm: 'why', yarn: 'why', bun: 'why' },
  patch: { pnpm: 'patch', yarn: 'patch', bun: 'patch' }
};

/**
 * Spellings a writer may reasonably reach for, folded onto the row that holds
 * them. Kept short on purpose: this is for the words a manager itself accepts
 * (`pnpm up`, `npm uninstall`), not a thesaurus.
 */
const verbAliases: Record<string, string> = {
  i: 'install',
  rm: 'remove',
  uninstall: 'remove',
  un: 'remove',
  up: 'update',
  upgrade: 'update'
};

/**
 * `dlx` replaces the BINARY, not the verb — `npx pkg`, `bunx pkg` — so it cannot
 * live in the table above, which only ever swaps the word after the manager.
 */
const dlx: Record<DuxtPackageManager, string> = {
  pnpm: 'pnpm dlx',
  npm: 'npx',
  yarn: 'yarn dlx',
  bun: 'bunx'
};

/** A global install, which Berry has no command for at all. */
const globalFlag = /(?:^|\s)(?:-g|--global)(?:\s|$)/;

interface Parsed {
  /** The row in the table, once aliases are folded. Undefined when unknown. */
  verb?: string;
  /** Everything after the verb, untouched — flags, names, versions. */
  rest: string;
  /** True where the command asks for a global install. */
  global: boolean;
}

function parse(command: string): Parsed {
  const trimmed = command.trim();
  const space = trimmed.indexOf(' ');
  const head = space === -1 ? trimmed : trimmed.slice(0, space);
  const rest = space === -1 ? '' : trimmed.slice(space + 1).trim();
  const verb = verbAliases[head] ?? head;

  return {
    verb: verb in verbs || verb === 'dlx' ? verb : undefined,
    rest,
    global: globalFlag.test(` ${rest} `)
  };
}

/**
 * The command as `manager` would type it, or `undefined` where that manager has
 * no way to say it.
 *
 * An UNKNOWN verb is passed through rather than dropped: a manager grows
 * subcommands faster than this table does, and refusing `pnpm deploy` because
 * the table has not heard of it would be worse than printing it. The build
 * validator reports the unknown word, so the author finds out either way.
 */
export function packageCommand(
  manager: DuxtPackageManager,
  command: string
): string | undefined {
  const { verb, rest, global } = parse(command);

  // A bare `dlx` is a writing mistake, but not one to answer with an empty
  // block: returning `undefined` for every manager would draw a card with no
  // tabs at all, which tells the author nothing about what went wrong.
  if (verb === 'dlx') return rest ? `${dlx[manager]} ${rest}` : dlx[manager];

  // Berry has no global install. Not approximated: `yarn global add` is Yarn 1,
  // and a Berry user running it gets an unknown command.
  if (global && manager === 'yarn') return undefined;

  if (!verb) return `${manager} ${command.trim()}`;

  const spelling = verbs[verb]?.[manager];
  if (!spelling) return undefined;

  return rest ? `${manager} ${spelling} ${rest}` : `${manager} ${spelling}`;
}

/**
 * What is wrong with a command, for the build validator to report.
 *
 * Two different faults, and they earn different words. `unknownVerb` is a word
 * this table has never heard of — probably fine, possibly a typo, printed for
 * every manager as written. `unavailable` names managers that genuinely cannot
 * express the command, whose tabs the block therefore does not draw.
 */
export function packageCommandIssues(command: string): {
  unknownVerb?: string;
  unavailable: DuxtPackageManager[];
} {
  const { verb } = parse(command);

  return {
    unknownVerb: verb ? undefined : command.trim().split(' ')[0],
    unavailable: duxtPackageManagers.filter(
      (manager) => packageCommand(manager, command) === undefined
    )
  };
}
