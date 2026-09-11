/**
 * One place that knows which keys the theme listens to.
 *
 * The overlay on `?` and the handlers themselves have to agree, and the only
 * way they do is by being the same list — a shortcut sheet that lists a key
 * nothing binds is worse than no sheet.
 *
 * A shortcut never fires while the reader is typing. Without that guard, `?`
 * in the search box opens the overlay instead of being searched for, which is
 * the single most common bug in this kind of feature.
 */
export interface DuxtShortcut {
  action: 'search' | 'help' | 'previous' | 'next';
  /** The key, as `KeyboardEvent.key` reports it. */
  key: string;
  /** Requires ⌘ on a Mac, Ctrl elsewhere. */
  meta?: boolean;
  /** i18n key for what it does. */
  label: string;
  /** How to draw it. */
  keys: string[];
}

export const duxtShortcuts: DuxtShortcut[] = [
  {
    action: 'search',
    key: 'k',
    meta: true,
    label: 'duxt.shortcuts.search',
    keys: ['⌘', 'K']
  },
  { action: 'help', key: '?', label: 'duxt.shortcuts.help', keys: ['?'] },
  {
    action: 'previous',
    key: '[',
    label: 'duxt.shortcuts.previous',
    keys: ['[']
  },
  { action: 'next', key: ']', label: 'duxt.shortcuts.next', keys: [']'] }
];

const labels = {
  search: 'duxt.shortcuts.search',
  help: 'duxt.shortcuts.help',
  previous: 'duxt.shortcuts.previous',
  next: 'duxt.shortcuts.next'
} as const;

export const shortcutLabel = (action: DuxtShortcut['action']) => labels[action];

export function matchesDuxtShortcut(
  shortcuts: readonly Pick<DuxtShortcut, 'action' | 'key' | 'meta'>[],
  action: DuxtShortcut['action'],
  event: KeyboardEvent
) {
  return shortcuts.some(
    (shortcut) =>
      shortcut.action === action &&
      shortcut.key.toLowerCase() === event.key.toLowerCase() &&
      Boolean(shortcut.meta) === Boolean(event.metaKey || event.ctrlKey)
  );
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

/** Bind one key, with the guards every one of them needs. */
export function onDuxtShortcut(
  match: (event: KeyboardEvent) => boolean,
  run: (event: KeyboardEvent) => void
) {
  onMounted(() => {
    const handler = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      if (!match(event)) return;

      event.preventDefault();
      run(event);
    };

    window.addEventListener('keydown', handler);
    onBeforeUnmount(() => window.removeEventListener('keydown', handler));
  });
}
