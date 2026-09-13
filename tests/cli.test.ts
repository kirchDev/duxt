import { describe, expect, it } from 'vitest';
import { runDuxtCli } from '../cli';
import type { DuxtReport } from '../report';

/**
 * Usage is rendered with colour unless the environment says otherwise, and
 * whether it does is not what any of these tests are about.
 */
const plain = (text: string) => text.replaceAll(/\[\d+m/g, '');

/**
 * The report, as the thing that must NOT be reached.
 *
 * Help exists for somebody who does not yet have a built site, so every path
 * that prints usage has to answer before anything reads a config or a parse
 * cache. A loader that throws is the only way to assert that from the outside.
 */
const never = () => {
  throw new Error('the report was loaded');
};

const data = (over: Partial<DuxtReport> = {}): DuxtReport => ({
  rootDir: '/srv/site',
  sources: [
    {
      collection: 'docs',
      prefix: '',
      path: 'docs',
      isDefault: true,
      isDefaultLocale: true,
      status: 'current',
      history: true
    } as DuxtReport['sources'][number]
  ],
  pages: [
    {
      collection: 'docs',
      path: '/guide',
      file: 'docs/guide.md',
      title: 'Guide',
      description: 'A guide.',
      anchors: new Set<string>(['install']),
      links: [],
      commands: []
    }
  ],
  findings: { errors: [], warnings: [], notes: [] },
  redirects: [],
  locales: [],
  ...over
});

/** The loader as a spy — the report is built once, or not at all. */
const loading = (report = data()) => {
  let calls = 0;
  return {
    load: () => {
      calls += 1;
      return report;
    },
    get calls() {
      return calls;
    }
  };
};

describe('duxt', () => {
  it('prints usage for a bare invocation, without loading a report', async () => {
    const { stdout, exitCode } = await runDuxtCli([], never);

    expect(exitCode).toBe(0);
    // The subcommand is listed with a description beside it — which is the
    // whole of what "discoverable" means for a command nobody has been told
    // about.
    expect(plain(stdout)).toMatch(/^\s*report\s{2,}\S/m);
  });

  /**
   * The four things the help is FOR, asserted as four things.
   *
   * A user reaching for `--help` on a site that has never been built is the
   * case this command was missing: the report is empty for a reason that is
   * not in the report, and the help is the only place that reason fits.
   */
  it('documents the report command without loading a report', async () => {
    const { stdout, exitCode } = await runDuxtCli(['report', '--help'], never);
    const usage = plain(stdout);

    expect(exitCode).toBe(0);
    expect(usage).toContain('--json');
    expect(usage).toContain('Markdown');
    expect(usage).toContain('parse cache');
    expect(usage).toContain('nuxt build');

    // One row per exit code, without pinning the prose beside it.
    for (const code of ['0', '1', '2'])
      expect(usage).toMatch(new RegExp(String.raw`^\s*${code}\s{2,}\S`, 'm'));
  });
});

describe('duxt report', () => {
  it('renders Markdown when no format is asked for', async () => {
    const reports = loading();
    const { stdout, stderr, exitCode } = await runDuxtCli(
      ['report'],
      reports.load
    );

    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('# duxt report');
    expect(reports.calls).toBe(1);
  });

  it('prints the same data unrendered for --json', async () => {
    const { stdout, exitCode } = await runDuxtCli(
      ['report', '--json'],
      loading().load
    );
    const parsed = JSON.parse(stdout) as {
      rootDir: string;
      pages: { anchors: string[] }[];
    };

    expect(exitCode).toBe(0);
    expect(parsed.rootDir).toBe('/srv/site');
    // A Set stringifies as `{}`, which is a silently empty anchor list.
    expect(parsed.pages[0]!.anchors).toEqual(['install']);
  });

  it('exits 1 on an error and 0 on a warning', async () => {
    // Warnings are what somebody else's repository going stale looks like, and
    // a gate that cannot survive that is a gate that gets switched off.
    const warned = loading(
      data({ findings: { errors: [], warnings: ['something'], notes: [] } })
    );
    const failed = loading(
      data({ findings: { errors: ['something'], warnings: [], notes: [] } })
    );

    expect((await runDuxtCli(['report'], warned.load)).exitCode).toBe(0);
    expect((await runDuxtCli(['report'], failed.load)).exitCode).toBe(1);
  });
});

/**
 * The class of failure this command previously had no answer for.
 *
 * `duxt-report --jsno` printed a full, correct-looking report and exited 0 —
 * a typo that reads as a valid invocation is worse than one that fails, since
 * the only thing it changes is silent. Every shape of it exits 2, which is
 * distinct from the 1 a report with errors in it exits with: one says the
 * documentation is wrong, the other says the command line is.
 */
describe('an invocation that cannot be understood', () => {
  it('rejects an unknown command', async () => {
    const { stdout, stderr, exitCode } = await runDuxtCli(['reprot'], never);

    expect(exitCode).toBe(2);
    expect(stdout).toBe('');
    expect(plain(stderr)).toContain("Unknown command 'reprot'");
    expect(plain(stderr)).toContain('duxt --help');
  });

  it('rejects an unknown option on the root command', async () => {
    const { stderr, exitCode } = await runDuxtCli(['--json'], never);

    expect(exitCode).toBe(2);
    expect(plain(stderr)).toContain("Unknown option '--json'");
  });

  it('rejects an unknown option on the report command', async () => {
    const { stderr, exitCode } = await runDuxtCli(['report', '--jsno'], never);

    expect(exitCode).toBe(2);
    expect(plain(stderr)).toContain("Unknown option '--jsno'");
    expect(plain(stderr)).toContain('duxt report --help');
  });

  it('rejects an argument the report command takes no place for', async () => {
    const { stderr, exitCode } = await runDuxtCli(['report', 'docs'], never);

    expect(exitCode).toBe(2);
    expect(plain(stderr)).toContain("Unexpected argument 'docs'");
  });

  it('rejects a repeated option', async () => {
    const { stderr, exitCode } = await runDuxtCli(
      ['report', '--json', '--json'],
      never
    );

    expect(exitCode).toBe(2);
    expect(plain(stderr)).toContain("Duplicate option '--json'");
  });

  it('counts an alias as the option it is an alias for', async () => {
    // `--help -h` is one option twice, which a parser matching on spelling
    // reads as two.
    const { stderr, exitCode } = await runDuxtCli(
      ['report', '--help', '-h'],
      never
    );

    expect(exitCode).toBe(2);
    expect(plain(stderr)).toContain("Duplicate option '-h'");
  });

  it('rejects a value on a flag that carries none', async () => {
    const { stderr, exitCode } = await runDuxtCli(
      ['report', '--json=true'],
      never
    );

    expect(exitCode).toBe(2);
    expect(plain(stderr)).toContain("Option '--json' takes no value");
  });

  it('refuses to both print help and run a report', async () => {
    // Two outputs were asked for and one of them can only be dropped. Dropping
    // it quietly is the behaviour this command was reported for.
    const { stderr, exitCode } = await runDuxtCli(
      ['report', '--json', '--help'],
      never
    );

    expect(exitCode).toBe(2);
    expect(plain(stderr)).toContain("'--help' cannot be combined");
  });
});
