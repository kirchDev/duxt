import { defineCommand, renderUsage } from 'citty';
import type { ArgsDef, CommandDef } from 'citty';
import { duxtReportOutput } from './report';
import type { DuxtReport, DuxtReportFormat, DuxtReportOptions } from './report';

/**
 * The `duxt` command line, as a function of its arguments.
 *
 * NOT citty's `runMain`, and that is the design rather than an oversight. Its
 * entry point reads `process.argv`, prints to the console and exits the
 * process, which makes every question worth asking here — what did it print,
 * what did it exit with, did it touch the site at all — unaskable from a test.
 * So citty is used for the two things it is genuinely good at, holding the
 * command tree and rendering usage out of it, and the dispatch is ours.
 *
 * The other half of the design is that NOTHING here reads the site. The report
 * arrives through a loader the caller passes in, so every path that prints
 * usage answers before a config or a parse cache is touched — which is the
 * point of a `--help` on a command whose reader has, by definition, not got a
 * working site yet.
 */
export interface DuxtCliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** How the command gets its data — a seam, so help never needs a built site. */
export type DuxtReportLoader = (options?: DuxtReportOptions) => DuxtReport;

/**
 * `2` is the command line, `1` is the documentation.
 *
 * Conflating them is what makes a report command unusable in CI: a pipeline
 * that treats every non-zero exit as "the docs are broken" reports a typo in
 * its own script as a documentation failure, and the person who wrote the
 * script is not the person who gets paged.
 */
const USAGE_ERROR = 2;

/* -------------------------------------------------------------------------- */
/* The command tree                                                            */
/* -------------------------------------------------------------------------- */

const help = {
  type: 'boolean',
  alias: 'h',
  description: 'Show this help.'
} as const;

const reportCommand = defineCommand({
  meta: {
    name: 'report',
    description:
      'Print what your sources became, and what is wrong with them, as Markdown.'
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Print the same data unrendered, as JSON.'
    },
    help
  }
});

const rootCommand = defineCommand({
  meta: {
    name: 'duxt',
    description: 'The duxt documentation layer, from the command line.'
  },
  args: { help },
  subCommands: { report: reportCommand }
});

/**
 * What the usage citty renders from the tree above cannot say.
 *
 * citty renders a command's arguments; it has no section for the two facts
 * that actually stop somebody — what an exit code meant, and why the report is
 * empty on a site nobody has built. Both are the reason this command grew a
 * `--help` at all, so they are appended here rather than left to the README,
 * which is exactly where the reader of this text has already failed to look.
 */
const REPORT_NOTES = `EXIT CODES

  0  the documentation has no errors — warnings and translation notes
     are what a source going stale looks like, and do not fail
  1  the report found errors in the documentation
  2  the command line could not be understood

THE PARSE CACHE

  The pages come from Content's parse cache, so the site has to have been
  parsed once: run \`nuxt build\` or \`nuxt dev\` first. Without it the sources,
  the collections and the redirects are still printed, and everything that
  needs pages is reported as missing rather than as empty.
`;

const usage = async (command: CommandDef, notes = ''): Promise<string> => {
  const rendered = await renderUsage(
    command,
    command === rootCommand ? undefined : rootCommand
  );

  return notes ? `${rendered}\n\n${notes}` : rendered;
};

/* -------------------------------------------------------------------------- */
/* Reading the command line                                                    */
/* -------------------------------------------------------------------------- */

const toArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * Every spelling a command accepts, mapped to the one it means.
 *
 * Read off the command tree rather than written out a second time: the usage
 * a reader is shown and the options the parser accepts are then the same list
 * by construction, and cannot drift into a flag that is documented but refused
 * or — the worse direction — accepted but undocumented.
 */
function spellings(command: CommandDef): Map<string, string> {
  const declared = (command.args ?? {}) as ArgsDef;
  const found = new Map<string, string>();

  for (const [name, definition] of Object.entries(declared)) {
    found.set(`--${name}`, name);
    for (const alias of toArray(
      (definition as { alias?: string | string[] }).alias
    )) {
      found.set(`-${alias}`, name);
    }
  }

  return found;
}

/**
 * The flags an invocation set, or the first thing wrong with it.
 *
 * Strict on purpose, and the strictness is the feature: citty — like every
 * other argument parser in this family — collects what it does not recognise
 * rather than refusing it, so `--jsno` parsed, was ignored, and the command
 * printed a confident Markdown report that was not the one that had been asked
 * for. An option that does nothing has to say so.
 */
function readOptions(
  tokens: string[],
  command: CommandDef
): { flags: Set<string> } | { diagnostic: string } {
  const accepted = spellings(command);
  const flags = new Set<string>();

  for (const token of tokens) {
    if (!token.startsWith('-') || token === '-') {
      return { diagnostic: `Unexpected argument '${token}'.` };
    }

    // `--json=true` on a flag that carries no value is not a spelling of
    // `--json`; it is somebody expecting a different option to exist.
    const [spelling, ...value] = token.split('=');
    const name = accepted.get(spelling!);

    if (!name) return { diagnostic: `Unknown option '${spelling}'.` };
    if (value.length) {
      return { diagnostic: `Option '${spelling}' takes no value.` };
    }
    if (flags.has(name)) {
      return { diagnostic: `Duplicate option '${spelling}'.` };
    }

    flags.add(name);
  }

  return { flags };
}

const refuse = async (
  diagnostic: string,
  command: CommandDef
): Promise<DuxtCliResult> => {
  const name = command === rootCommand ? 'duxt' : 'duxt report';

  return {
    stdout: '',
    // The diagnostic, not the usage. A wall of text under a one-line mistake
    // buries the line that says what the mistake was, and the reader is one
    // documented keystroke away from the wall if they want it.
    stderr: `${diagnostic}\nRun \`${name} --help\` to see what it takes.`,
    exitCode: USAGE_ERROR
  };
};

/* -------------------------------------------------------------------------- */
/* The command                                                                 */
/* -------------------------------------------------------------------------- */

export async function runDuxtCli(
  argv: string[],
  load: DuxtReportLoader
): Promise<DuxtCliResult> {
  const [name] = argv;

  if (name !== undefined && !name.startsWith('-') && name !== 'report') {
    return refuse(`Unknown command '${name}'.`, rootCommand);
  }

  const command = name === 'report' ? reportCommand : rootCommand;
  const read = readOptions(name === 'report' ? argv.slice(1) : argv, command);

  if ('diagnostic' in read) return refuse(read.diagnostic, command);

  // Before `--help` is acted on rather than after: an invocation has to be
  // well formed before anything is done with it, and `--json --help` asks for
  // two different outputs at once. Silently dropping one of them is the
  // behaviour this command was reported for.
  if (read.flags.has('help') && read.flags.size > 1) {
    return refuse(`'--help' cannot be combined with another option.`, command);
  }

  if (command === rootCommand) {
    // Bare `duxt` prints usage rather than an error: a command run with no
    // arguments at all is somebody asking what it does.
    return { stdout: await usage(rootCommand), stderr: '', exitCode: 0 };
  }

  if (read.flags.has('help')) {
    return {
      stdout: await usage(reportCommand, REPORT_NOTES),
      stderr: '',
      exitCode: 0
    };
  }

  const format: DuxtReportFormat = read.flags.has('json') ? 'json' : 'markdown';
  const { output, exitCode } = duxtReportOutput(load(), format);

  return { stdout: output, stderr: '', exitCode };
}
