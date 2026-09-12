// @vitest-environment jsdom
// A real DOM, not a stub: these guards ask the document what an element IS —
// its tag, its role, what it sits inside — and a hand-rolled `closest` would
// only restate the selector the implementation already uses.
import { afterEach, describe, expect, it } from 'vitest';
import {
  activeDuxtShortcuts,
  duxtPlatform,
  duxtShortcutFor,
  duxtShortcuts,
  findDuxtShortcut,
  shortcutHint,
  shortcutKeys
} from '../app/composables/useDuxtShortcuts';

describe('activeDuxtShortcuts', () => {
  it('binds search, help and both adjacent-page keys by default', () => {
    expect(
      activeDuxtShortcuts().map((shortcut) => [shortcut.action, shortcut.key])
    ).toEqual([
      ['search', 'k'],
      ['help', '?'],
      ['previous', '['],
      ['next', ']']
    ]);
  });

  it('leaves only the modified search key when single characters are off', () => {
    expect(
      activeDuxtShortcuts({ singleCharacter: false }).map(
        (shortcut) => shortcut.key
      )
    ).toEqual(['k']);
  });

  it('treats an unset policy as single characters allowed', () => {
    expect(activeDuxtShortcuts({}).map((shortcut) => shortcut.key)).toEqual([
      'k',
      '?',
      '[',
      ']'
    ]);
  });
});

describe('findDuxtShortcut', () => {
  const press = (
    key: string,
    target: EventTarget | null,
    extra: { metaKey?: boolean; defaultPrevented?: boolean } = {}
  ) => ({
    key,
    metaKey: extra.metaKey ?? false,
    ctrlKey: false,
    defaultPrevented: extra.defaultPrevented ?? false,
    target
  });

  const at = (html: string) => {
    document.body.innerHTML = html;
    return document.getElementById('focused')!;
  };

  afterEach(() => (document.body.innerHTML = ''));

  it('resolves a modified key to its action', () => {
    const article = at('<article id="focused">text</article>');
    expect(
      findDuxtShortcut(duxtShortcuts, press('k', article, { metaKey: true }))
        ?.action
    ).toBe('search');
  });

  it('ignores the same key without its modifier', () => {
    const article = at('<article id="focused">text</article>');
    expect(
      findDuxtShortcut(duxtShortcuts, press('k', article))
    ).toBeUndefined();
  });

  it('resolves a bare key to its action on page content', () => {
    const article = at('<article id="focused">text</article>');
    expect(findDuxtShortcut(duxtShortcuts, press('?', article))?.action).toBe(
      'help'
    );
  });

  it('runs nothing once something else has handled the key', () => {
    const article = at('<article id="focused">text</article>');
    expect(
      findDuxtShortcut(
        duxtShortcuts,
        press('?', article, {
          defaultPrevented: true
        })
      )
    ).toBeUndefined();
    expect(
      findDuxtShortcut(
        duxtShortcuts,
        press('k', article, {
          metaKey: true,
          defaultPrevented: true
        })
      )
    ).toBeUndefined();
  });

  it.each([
    ['a text field', '<input id="focused">'],
    ['a textarea', '<textarea id="focused"></textarea>'],
    ['a select', '<select id="focused"></select>'],
    ['rich text', '<div id="focused" contenteditable="true"></div>']
  ])('runs nothing while the reader types in %s', (_label, html) => {
    const typing = at(html);
    expect(findDuxtShortcut(duxtShortcuts, press('?', typing))).toBeUndefined();
    expect(
      findDuxtShortcut(duxtShortcuts, press('k', typing, { metaKey: true }))
    ).toBeUndefined();
  });

  it.each([
    ['a dialog', '<div role="dialog"><p id="focused">text</p></div>'],
    ['a menu', '<div role="menu"><p id="focused">text</p></div>'],
    ['a listbox', '<div role="listbox"><p id="focused">text</p></div>']
  ])('runs nothing while focus sits inside %s', (_label, html) => {
    const owned = at(html);
    expect(findDuxtShortcut(duxtShortcuts, press('?', owned))).toBeUndefined();
    expect(
      findDuxtShortcut(duxtShortcuts, press('k', owned, { metaKey: true }))
    ).toBeUndefined();
  });

  it.each([
    ['a button', '<button id="focused">Copy</button>'],
    ['a link', '<a id="focused" href="/next">Next</a>'],
    ['a tab', '<div id="focused" role="tab">pnpm</div>']
  ])('keeps a bare key off %s but leaves search reachable', (_label, html) => {
    const control = at(html);
    expect(
      findDuxtShortcut(duxtShortcuts, press('?', control))
    ).toBeUndefined();
    expect(
      findDuxtShortcut(duxtShortcuts, press('[', control))
    ).toBeUndefined();
    expect(
      findDuxtShortcut(duxtShortcuts, press('k', control, { metaKey: true }))
        ?.action
    ).toBe('search');
  });

  it('treats the focused page heading as content, not a control', () => {
    const heading = at('<h1 id="focused" tabindex="-1">Page</h1>');
    expect(findDuxtShortcut(duxtShortcuts, press(']', heading))?.action).toBe(
      'next'
    );
  });

  it('binds nothing a policy has switched off', () => {
    const article = at('<article id="focused">text</article>');
    const active = activeDuxtShortcuts({ singleCharacter: false });
    expect(findDuxtShortcut(active, press('?', article))).toBeUndefined();
    expect(
      findDuxtShortcut(active, press('k', article, { metaKey: true }))?.action
    ).toBe('search');
  });
});

describe('platform-aware labels', () => {
  it('draws the Apple modifier on a Mac and the word elsewhere', () => {
    const search = duxtShortcuts.find((s) => s.action === 'search')!;
    expect(shortcutKeys(search, 'mac')).toEqual(['⌘', 'K']);
    expect(shortcutKeys(search, 'other')).toEqual(['Ctrl', 'K']);
  });

  it('draws an unmodified key the same everywhere', () => {
    const help = duxtShortcuts.find((s) => s.action === 'help')!;
    expect(shortcutKeys(help, 'mac')).toEqual(['?']);
    expect(shortcutKeys(help, 'other')).toEqual(['?']);
  });

  it.each([
    ['MacIntel', 'macOS'],
    ['iPhone', 'iOS'],
    ['iPad', 'iPadOS']
  ])('reads %s as an Apple keyboard', (platform) => {
    expect(duxtPlatform({ platform })).toBe('mac');
  });

  it.each([['Win32'], ['Linux x86_64']])('reads %s as Ctrl', (platform) => {
    expect(duxtPlatform({ platform })).toBe('other');
  });

  it('prefers the modern client hint over the legacy string', () => {
    expect(
      duxtPlatform({ platform: 'Win32', userAgentData: { platform: 'macOS' } })
    ).toBe('mac');
  });

  it('assumes Ctrl where there is no browser to ask', () => {
    expect(duxtPlatform()).toBe('other');
    expect(duxtPlatform({})).toBe('other');
  });
});

describe('shortcutHint', () => {
  it('runs an Apple glyph straight into its key', () => {
    expect(shortcutHint(['⌘', 'K'])).toBe('⌘K');
  });

  it('separates a spelled-out modifier from its key', () => {
    expect(shortcutHint(['Ctrl', 'K'])).toBe('Ctrl+K');
  });

  it('leaves a lone key alone', () => {
    expect(shortcutHint(['?'])).toBe('?');
  });
});

describe('duxtShortcutFor', () => {
  it('finds the binding behind an action', () => {
    expect(duxtShortcutFor(duxtShortcuts, 'next')?.key).toBe(']');
  });

  it('finds nothing where the policy unbound the action', () => {
    const active = activeDuxtShortcuts({ singleCharacter: false });

    expect(duxtShortcutFor(active, 'search')?.key).toBe('k');
    expect(duxtShortcutFor(active, 'next')).toBeUndefined();
  });
});
