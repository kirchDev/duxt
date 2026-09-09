import { describe, expect, it } from 'vitest';
import {
  duxtPackageManagers,
  packageCommand,
  packageCommandIssues
} from '../app/utils/package-command';

/**
 * The translation table, checked against the four CLIs it claims to speak for.
 *
 * Every expectation in here was read off `--help` rather than remembered —
 * pnpm 12.3.4, npm 11.6.2, yarn 4.10.3 (Berry), bun 1.3.14 — because three of
 * them contradicted the obvious guess, and a table nobody can check is a table
 * that drifts back to the guess.
 */
describe('packageCommand', () => {
  it('spells add the way each manager spells it', () => {
    expect(packageCommand('pnpm', 'add -D pkg')).toBe('pnpm add -D pkg');
    expect(packageCommand('npm', 'add -D pkg')).toBe('npm install -D pkg');
    expect(packageCommand('yarn', 'add -D pkg')).toBe('yarn add -D pkg');
    expect(packageCommand('bun', 'add -D pkg')).toBe('bun add -D pkg');
  });

  /** `dlx` swaps the binary, not the verb — the one row that cannot be a row. */
  it('swaps the binary for dlx', () => {
    expect(packageCommand('pnpm', 'dlx pkg')).toBe('pnpm dlx pkg');
    expect(packageCommand('npm', 'dlx pkg')).toBe('npx pkg');
    expect(packageCommand('yarn', 'dlx pkg')).toBe('yarn dlx pkg');
    expect(packageCommand('bun', 'dlx pkg')).toBe('bunx pkg');
  });

  it('uses npm uninstall for remove', () => {
    expect(packageCommand('npm', 'remove pkg')).toBe('npm uninstall pkg');
    expect(packageCommand('pnpm', 'remove pkg')).toBe('pnpm remove pkg');
  });

  /** Berry: `yarn up`, and audit lives under the `npm` namespace. */
  it('knows what berry renamed', () => {
    expect(packageCommand('yarn', 'update')).toBe('yarn up');
    expect(packageCommand('yarn', 'audit')).toBe('yarn npm audit');
    expect(packageCommand('npm', 'update')).toBe('npm update');
    expect(packageCommand('bun', 'update')).toBe('bun update');
  });

  /**
   * The two holes, asserted as holes.
   *
   * Berry has no `outdated` — `upgrade-interactive` upgrades where `outdated`
   * only reports — and npm has no `patch` in any spelling. A future edit that
   * fills either cell with the nearest relative would make the block print a
   * command that quietly does a different job, and this is the test that stops
   * it.
   */
  it('reports no equivalent rather than approximating one', () => {
    expect(packageCommand('yarn', 'outdated')).toBeUndefined();
    expect(packageCommand('npm', 'patch pkg')).toBeUndefined();

    expect(packageCommand('pnpm', 'outdated')).toBe('pnpm outdated');
    expect(packageCommand('bun', 'outdated')).toBe('bun outdated');
    expect(packageCommand('pnpm', 'patch pkg')).toBe('pnpm patch pkg');
    expect(packageCommand('yarn', 'patch pkg')).toBe('yarn patch pkg');
  });

  /** Berry removed global installs; `yarn global add` is Yarn 1. */
  it('has no global install for berry', () => {
    expect(packageCommand('yarn', 'add -g pkg')).toBeUndefined();
    expect(packageCommand('yarn', 'add --global pkg')).toBeUndefined();
    expect(packageCommand('npm', 'add -g pkg')).toBe('npm install -g pkg');
    expect(packageCommand('bun', 'add -g pkg')).toBe('bun add -g pkg');
  });

  /** `-g` inside a package name is not a global install. */
  it('does not mistake a name for the global flag', () => {
    expect(packageCommand('yarn', 'add eslint-config-g')).toBe(
      'yarn add eslint-config-g'
    );
  });

  it('folds the aliases a manager itself accepts', () => {
    expect(packageCommand('yarn', 'up')).toBe('yarn up');
    expect(packageCommand('npm', 'uninstall pkg')).toBe('npm uninstall pkg');
    expect(packageCommand('npm', 'rm pkg')).toBe('npm uninstall pkg');
  });

  /**
   * An unknown verb is printed, not dropped. A manager grows subcommands faster
   * than this table does, and a block that refuses `pnpm deploy` because the
   * table has not heard of it would be the worse failure.
   */
  it('passes an unknown verb through', () => {
    for (const manager of duxtPackageManagers) {
      expect(packageCommand(manager, 'deploy --yes')).toBe(
        `${manager} deploy --yes`
      );
    }
  });

  it('takes a verb with no arguments', () => {
    expect(packageCommand('pnpm', 'install')).toBe('pnpm install');
    expect(packageCommand('yarn', 'install')).toBe('yarn install');
  });

  /** The commands this project's own documentation writes. */
  it('handles what the docs actually use', () => {
    for (const manager of duxtPackageManagers) {
      expect(packageCommand(manager, 'run generate')).toBe(
        `${manager} run generate`
      );
      expect(packageCommand(manager, 'add -D @kirchdev/duxt')).toBeDefined();
    }
  });
});

describe('packageCommandIssues', () => {
  it('names the managers that cannot express the command', () => {
    expect(packageCommandIssues('outdated')).toEqual({
      unknownVerb: undefined,
      unavailable: ['yarn']
    });
    expect(packageCommandIssues('patch pkg')).toEqual({
      unknownVerb: undefined,
      unavailable: ['npm']
    });
  });

  it('names an unknown verb without calling it unavailable', () => {
    expect(packageCommandIssues('deploy --yes')).toEqual({
      unknownVerb: 'deploy',
      unavailable: []
    });
  });

  it('finds nothing wrong with an ordinary command', () => {
    expect(packageCommandIssues('add -D pkg')).toEqual({
      unknownVerb: undefined,
      unavailable: []
    });
  });
});
