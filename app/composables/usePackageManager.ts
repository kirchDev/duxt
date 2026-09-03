/** Where the choice is kept. Namespaced so a consumer's own keys cannot collide. */
const STORAGE_KEY = 'duxt:package-manager';

/**
 * The package manager the reader picked, remembered across pages.
 *
 * localStorage rather than a cookie: the value never leaves the browser, is
 * not sent with any request, and identifies nobody — a UI preference the
 * reader asked for by clicking it, so it needs no consent banner. Nothing else
 * is stored, and clearing site data forgets it.
 *
 * The state starts at the server-rendered default and only adopts the stored
 * value after mount, because reading storage during hydration would make the
 * markup disagree with what the server sent.
 */
export function usePackageManager(fallback = 'pnpm') {
  const manager = useState('duxt-package-manager', () => fallback);

  onMounted(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) manager.value = stored;
    } catch {
      // Storage can be unavailable — private mode, or blocked entirely. The
      // component keeps working, it just forgets between pages.
    }
  });

  watch(manager, (value) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Same again: a preference not worth an error.
    }
  });

  return manager;
}
