import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { localeDirection } from '../app/utils/direction';

/**
 * Which way round the interface is drawn, resolved from the locale list.
 *
 * `app.vue` and `error.vue` are two shells, and the error page replaces the app
 * rather than nesting inside it — so a direction computed inline in one of them
 * is a direction the other does not have. That is exactly the bug the issue
 * describes: `app.vue` set `dir`, `error.vue` set only `lang`, and the one page
 * a reader reaches by accident stayed LTR.
 *
 * One function, both shells, and the rule written down once.
 */
describe('localeDirection', () => {
  it('reads the direction the locale declares', () => {
    expect(localeDirection([{ code: 'ar', dir: 'rtl' }], 'ar')).toBe('rtl');
  });

  it('is left-to-right when the locale declares nothing', () => {
    expect(localeDirection([{ code: 'en-GB' }], 'en-GB')).toBe('ltr');
  });

  it('is left-to-right when the active locale is not in the list', () => {
    expect(localeDirection([{ code: 'en-GB', dir: 'ltr' }], 'he')).toBe('ltr');
  });

  it('picks the entry the active code names, not the first one', () => {
    expect(
      localeDirection(
        [{ code: 'en-GB' }, { code: 'he', dir: 'rtl' }, { code: 'de' }],
        'he'
      )
    ).toBe('rtl');
  });

  it('accepts a plain string locale, which can declare nothing', () => {
    expect(localeDirection(['en-GB', 'de'], 'de')).toBe('ltr');
  });

  /**
   * `auto` is a per-element CONTENT heuristic — the browser guessing a run of
   * text — not a layout direction. A theme cannot mirror its chrome on "it
   * depends", so it is treated as the left-to-right default rather than
   * forwarded into the mirroring decision.
   */
  it("treats 'auto' as left-to-right, because chrome cannot mirror on a guess", () => {
    expect(localeDirection([{ code: 'ur', dir: 'auto' }], 'ur')).toBe('ltr');
  });

  it('survives an empty locale list', () => {
    expect(localeDirection([], 'en-GB')).toBe('ltr');
  });
});

/**
 * Both shells say which way round they are, and both tell reka.
 *
 * Source assertions rather than a rendered check, for the reason
 * `shortcuts-surface.test.ts` gives: these two files need a Nuxt environment to
 * render, and the fault being guarded against is an OMISSION — a shell that
 * quietly stops declaring something. An omission renders perfectly.
 *
 * `error.vue` is the one that had it wrong: it set `lang` and not `dir`, so the
 * one page a reader reaches by accident would have stayed left-to-right after
 * everything else turned round. Nothing failed; it just looked broken.
 */
describe('the app shells', () => {
  const shell = (name: string) =>
    readFileSync(
      fileURLToPath(new URL(`../app/${name}`, import.meta.url)),
      'utf8'
    );

  for (const name of ['app.vue', 'error.vue']) {
    describe(name, () => {
      it('puts dir on the document, beside lang', () => {
        expect(shell(name)).toMatch(/htmlAttrs:\s*\{[^}]*\bdir:/);
      });

      /**
       * reka-ui's `useDirection` injects the ConfigProvider context and falls
       * back to `ltr` WITHOUT consulting the document — so `<html dir>` alone
       * leaves every menu, select and tooltip laid out the other way.
       */
      it('hands the same direction to reka, which never reads the document', () => {
        expect(shell(name)).toContain('<ConfigProvider :dir="direction">');
      });

      it('resolves it through the one shared composable', () => {
        expect(shell(name)).toContain('useDuxtDirection()');
      });
    });
  }
});
