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
 * The stored value is read by a `pre` plugin before the app mounts rather than
 * here, so the first painted frame already shows the right tab. State is
 * `undefined` until something sets it, which lets a block fall back to its own
 * first entry without pretending the reader chose it.
 */
export function usePackageManager() {
  const stored = useState<string | undefined>(
    'duxt-package-manager',
    () => undefined
  );

  watch(stored, (value) => {
    if (!value) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // A preference not worth an error.
    }
  });

  return stored;
}
