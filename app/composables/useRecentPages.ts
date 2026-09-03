/** Where the list is kept. Namespaced so a consumer's own keys cannot collide. */
const STORAGE_KEY = 'duxt:recent-pages';
const LIMIT = 5;

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
export function useRecentPages() {
  const recent = useState<RecentPage[]>('duxt-recent-pages', () => []);

  function read(): RecentPage[] {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as RecentPage[]) : [];
    } catch {
      // Blocked storage, or a value someone else wrote — either way, no history.
      return [];
    }
  }

  function remember(page: RecentPage) {
    if (!import.meta.client || !page.path || !page.title) return;

    const next = [
      page,
      ...read().filter((entry) => entry.path !== page.path)
    ].slice(0, LIMIT);
    recent.value = next;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // A convenience not worth an error.
    }
  }

  function load() {
    if (import.meta.client) recent.value = read();
  }

  return { recent, remember, load };
}
