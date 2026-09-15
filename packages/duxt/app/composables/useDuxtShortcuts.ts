/**
 * One place that knows which keys the theme listens to — and when it may.
 *
 * Four things used to be able to disagree: the sheet on `?`, the handlers, the
 * guards each handler remembered for itself, and a binding table a consumer
 * could rewrite. They are one definition now. A consumer keeps the decision
 * that is genuinely its own — whether unmodified keys are bound at all — and
 * that is a boolean, which cannot drift from a list it is not.
 *
 * The guards matter as much as the bindings. A global single-character
 * shortcut is a key the reader never opted into: it has to stand down while
 * they are typing, while a dialog or menu owns the keyboard, when something
 * nearer the event has already handled it, and whenever focus is on a control
 * rather than on the page itself. `⌘/Ctrl+K` is the one exception to the last
 * of those, because no control wants that chord.
 */
export type DuxtShortcutAction = 'search' | 'help' | 'previous' | 'next';

export interface DuxtShortcut {
  action: DuxtShortcutAction;
  /** The key, as `KeyboardEvent.key` reports it. */
  key: string;
  /** Requires ⌘ on a Mac, Ctrl elsewhere. */
  meta?: boolean;
  /** i18n key for what it does. */
  label: string;
}

/**
 * The bindings, and the only place they are written down.
 *
 * Not `app.config`: a table of keys a consumer may rewrite is a table the
 * sheet, the handlers and the guards each have to agree with, and the whole
 * defect this replaces was those four drifting apart. What a consumer owns is
 * the POLICY below — whether the unmodified keys are live at all — which is
 * one boolean and has nothing to drift from.
 */
export const duxtShortcuts: readonly DuxtShortcut[] = [
  { action: 'search', key: 'k', meta: true, label: 'duxt.shortcuts.search' },
  { action: 'help', key: '?', label: 'duxt.shortcuts.help' },
  { action: 'previous', key: '[', label: 'duxt.shortcuts.previous' },
  { action: 'next', key: ']', label: 'duxt.shortcuts.next' }
];

/** Which modifier the reader's keyboard actually carries. */
export type DuxtPlatform = 'mac' | 'other';

/**
 * Apple or not, from whatever the browser is willing to say.
 *
 * `userAgentData` first because `navigator.platform` is deprecated and frozen
 * — Chrome reports `MacIntel` from an iPad and `Win32` from anything it has
 * decided to lie to. No browser at all (the server, and the first paint of a
 * prerendered page) answers `other`: `Ctrl` is the safe thing to have drawn if
 * the guess has to be wrong, since it is what the larger half of readers use.
 */
export function duxtPlatform(navigatorLike?: {
  platform?: string;
  userAgentData?: { platform?: string };
}): DuxtPlatform {
  const reported =
    navigatorLike?.userAgentData?.platform ?? navigatorLike?.platform ?? '';

  return /mac|iphone|ipad|ipod/i.test(reported) ? 'mac' : 'other';
}

/**
 * How to draw a binding — the only place a key becomes glyphs.
 *
 * Derived rather than stored, so a binding cannot come to advertise a key it
 * does not listen to, and so `⌘` and `Ctrl` are one branch instead of two
 * entries somebody has to keep in step.
 */
export function shortcutKeys(
  shortcut: Pick<DuxtShortcut, 'key' | 'meta'>,
  platform: DuxtPlatform
): string[] {
  const key =
    shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;

  return shortcut.meta ? [platform === 'mac' ? '⌘' : 'Ctrl', key] : [key];
}

/**
 * The same keys on one line, for a hint drawn inside a control.
 *
 * `⌘K` needs no separator and reads worse with one; `Ctrl` is a word, and
 * `CtrlK` is not a thing anybody has ever pressed.
 */
export const shortcutHint = (keys: string[]): string =>
  keys.join((keys[0]?.length ?? 0) > 1 ? '+' : '');

/** What a consumer decides about the keys duxt listens to globally. */
export interface DuxtShortcutPolicy {
  /**
   * Whether a bare keystroke — `?`, `[`, `]` — triggers anything at all.
   *
   * A global single-character shortcut is the one binding that can fire under
   * a reader who never asked for it: switch access, voice control and dictation
   * all emit bare characters as a matter of course, and a page that navigates
   * away under them shows no cause. `false` leaves `⌘/Ctrl+K`, which no input
   * method produces by accident.
   */
  singleCharacter?: boolean;
}

/** One unmodified keystroke — the tier a consumer can switch off. */
export const isSingleCharacterShortcut = (
  shortcut: Pick<DuxtShortcut, 'meta'>
) => !shortcut.meta;

/** The bindings that are live under a consumer's policy. */
export function activeDuxtShortcuts(
  policy?: DuxtShortcutPolicy
): readonly DuxtShortcut[] {
  return policy?.singleCharacter === false
    ? duxtShortcuts.filter((shortcut) => !isSingleCharacterShortcut(shortcut))
    : duxtShortcuts;
}

/**
 * The live binding behind one action, or nothing.
 *
 * Every visible hint goes through this rather than through `duxtShortcuts`
 * directly, and the difference is the whole point: a hint read off the raw
 * table would keep drawing `[` on a site whose policy unbound it — a label for
 * a key that does nothing, which is the sheet's own defect one level further
 * out.
 */
export function duxtShortcutFor<T extends Pick<DuxtShortcut, 'action'>>(
  shortcuts: readonly T[],
  action: DuxtShortcutAction
): T | undefined {
  return shortcuts.find((shortcut) => shortcut.action === action);
}

/** Is the reader typing? Then the key belongs to whatever they are typing in. */
export function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;

  return (
    element.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
  );
}

/**
 * Widgets that answer keystrokes themselves, so a global binding must not.
 *
 * Ancestry rather than the focused element alone: a dialog's keys belong to the
 * dialog wherever focus has landed inside it, and a contenteditable region is
 * being typed into even when the event target is some `<span>` within it.
 */
const OWNING_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  'dialog',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="menubar"]',
  '[role="listbox"]',
  '[role="combobox"]',
  '[role="grid"]',
  '[role="treegrid"]',
  '[role="tree"]'
].join(',');

/**
 * Anything the reader can operate — which is not the same set as above.
 *
 * A link or a button owns no keystroke, so `⌘/Ctrl+K` is still the reader's to
 * press while one has focus. A BARE character is different: it is the keystroke
 * a control is most likely to want next, so the unmodified tier stands down
 * here and fires only on the page's own content.
 *
 * `tabindex="-1"` is excluded deliberately — that is the focus target
 * `useDuxtPageFocus` moves to after a navigation, and a reader who has just
 * arrived on a page is exactly who `[` and `]` are for.
 */
const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'summary',
  'details',
  'audio',
  'video',
  '[tabindex]:not([tabindex^="-"])',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="tab"]',
  '[role="option"]',
  '[role="menuitem"]',
  '[role="textbox"]'
].join(',');

const within = (target: EventTarget | null, selector: string): boolean => {
  const element = target as Element | null;

  return typeof element?.closest === 'function'
    ? element.closest(selector) !== null
    : false;
};

/** Focus sits in something that answers this keystroke itself. */
export const ownsKeyboard = (target: EventTarget | null): boolean =>
  isTyping(target) || within(target, OWNING_SELECTOR);

/** Focus is on a control rather than on the page's own content. */
export const isInteractiveTarget = (target: EventTarget | null): boolean =>
  within(target, INTERACTIVE_SELECTOR);

/** What matching reads off a keydown — the whole event is never needed. */
export type DuxtShortcutEvent = Pick<
  KeyboardEvent,
  'key' | 'metaKey' | 'ctrlKey' | 'defaultPrevented' | 'target'
>;

const matchesKey = (
  shortcut: Pick<DuxtShortcut, 'key' | 'meta'>,
  event: DuxtShortcutEvent
) =>
  shortcut.key.toLowerCase() === event.key.toLowerCase() &&
  Boolean(shortcut.meta) === Boolean(event.metaKey || event.ctrlKey);

/**
 * The shortcut this keystroke fires, or nothing — the one gate every binding
 * passes through.
 *
 * Every guard lives here rather than at the four call sites, because a guard
 * that only three of them remembered is the bug this replaces.
 */
export function findDuxtShortcut<
  T extends Pick<DuxtShortcut, 'action' | 'key' | 'meta'>
>(shortcuts: readonly T[], event: DuxtShortcutEvent): T | undefined {
  // Something nearer the key has already answered it.
  if (event.defaultPrevented) return undefined;
  if (ownsKeyboard(event.target)) return undefined;

  const interactive = isInteractiveTarget(event.target);

  return shortcuts.find(
    (shortcut) =>
      matchesKey(shortcut, event) &&
      !(interactive && isSingleCharacterShortcut(shortcut))
  );
}

/**
 * Bind a set of actions, with every guard the policy requires.
 *
 * Takes a getter rather than a list: the policy is reactive config, and a
 * binding captured once would keep firing for a key the site has since
 * switched off.
 */
export function onDuxtShortcut(
  shortcuts: () => readonly DuxtShortcut[],
  run: (action: DuxtShortcutAction, event: KeyboardEvent) => void
) {
  onMounted(() => {
    const handler = (event: KeyboardEvent) => {
      const shortcut = findDuxtShortcut(shortcuts(), event);
      if (!shortcut) return;

      event.preventDefault();
      run(shortcut.action, event);
    };

    window.addEventListener('keydown', handler);
    onBeforeUnmount(() => window.removeEventListener('keydown', handler));
  });
}

/**
 * The shortcuts this site actually has, how to draw them, and how to bind one.
 *
 * The single entry point for every component that cares: the sheet renders
 * `shortcuts`, the handlers call `on()`, and both read the same list under the
 * same policy — which is what stops a sheet advertising a key nothing listens
 * to.
 */
export function useDuxtShortcuts() {
  const duxt = useDuxtConfig();

  // After mount, never during render. The server has no keyboard to ask, and a
  // prerendered page is a file — so the modifier is resolved once the reader's
  // own browser is there to answer, and `Ctrl` stands until it does.
  const platform = ref<DuxtPlatform>('other');
  onMounted(() => {
    platform.value = duxtPlatform(globalThis.navigator);
  });

  const shortcuts = computed(() => activeDuxtShortcuts(duxt.shortcuts));

  /** How to draw one, on the keyboard the reader is actually holding. */
  const keys = (shortcut: Pick<DuxtShortcut, 'key' | 'meta'>) =>
    shortcutKeys(shortcut, platform.value);

  /**
   * What to print beside a control, or nothing where the key is not bound.
   *
   * `undefined` rather than an empty string, so a template writes
   * `v-if="hint('next')"` and draws no `<kbd>` at all — an empty key cap beside
   * a link is worse than no hint, and a site with `singleCharacter: false` has
   * two of them on every page.
   */
  const hint = (action: DuxtShortcutAction) => {
    const shortcut = duxtShortcutFor(shortcuts.value, action);

    return shortcut ? shortcutHint(keys(shortcut)) : undefined;
  };

  /** Bind one action, or several that share a handler. */
  const on = (
    actions: DuxtShortcutAction | DuxtShortcutAction[],
    run: (action: DuxtShortcutAction, event: KeyboardEvent) => void
  ) => {
    const wanted = Array.isArray(actions) ? actions : [actions];

    onDuxtShortcut(
      () =>
        shortcuts.value.filter((shortcut) => wanted.includes(shortcut.action)),
      run
    );
  };

  return { shortcuts, keys, hint, on, platform };
}

/**
 * Whether the shortcut sheet is open — shared, because the key is no longer the
 * only way in.
 *
 * The sheet used to own a `ref` of its own, which worked while `?` was the only
 * opener. A visible control has to reach the same boolean from elsewhere in the
 * tree, and it has to be ONE boolean: a second instance of the sheet would be a
 * second dialog, and two dialogs listening to `?` is the drift this file
 * exists to prevent. `useState` rather than a module-level `ref` because a
 * module-level one is shared between requests on the server.
 *
 * It matters most where `?` is not bound at all. With
 * `shortcuts.singleCharacter: false` the visible control is the ONLY entry
 * point, so nothing about the sheet may depend on the key having fired.
 */
export function useDuxtShortcutSheet() {
  const open = useState('duxt-shortcuts', () => false);

  return { open, toggle: () => (open.value = !open.value) };
}
