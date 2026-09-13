/** Where the list is kept. Namespaced so a consumer's own keys cannot collide. */
const STORAGE_KEY = 'duxt:recent-pages';
export interface RecentPage {
  path: string;
  title: string;
}

/**
 * The pages this reader visited last, for the search dialog's empty state.
 *
 * localStorage, not a cookie: unlike the package-manager choice this is never
 * needed during server rendering, so it has no business travelling with every
 * request. It stays in the browser, identifies nobody, and clearing site data
 * forgets it.
 */
export function useRecentPages(limit = 5) {
  const recent = useState<RecentPage[]>('duxt-recent-pages', () => []);

  function read(): RecentPage[] {
    // Blocked storage, or a value someone else wrote — either way, no history.
    const parsed = readStoredJson(STORAGE_KEY);

    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is RecentPage =>
            typeof entry?.path === 'string' && typeof entry?.title === 'string'
        )
      : [];
  }

  function remember(page: RecentPage) {
    if (!import.meta.client || !page.path || !page.title) return;

    const next = [
      page,
      ...read().filter((entry) => entry.path !== page.path)
    ].slice(0, Math.max(0, limit));
    recent.value = next;

    // A convenience not worth an error.
    writeStoredJson(STORAGE_KEY, next);
  }

  function load() {
    if (import.meta.client) recent.value = read().slice(0, Math.max(0, limit));
  }

  return { recent, remember, load };
}
