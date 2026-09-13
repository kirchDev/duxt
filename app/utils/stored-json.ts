/**
 * A JSON value kept in `localStorage`, read and written without ever throwing.
 *
 * Storage is the one browser API that fails for reasons the page cannot see: a
 * private window, a blocked site, a full quota, or a value some other script
 * wrote under the same key. Every reader here wants the same answer to all of
 * those — "nothing stored" — and every writer the same shrug, because what is
 * kept is a convenience and never worth an error the reader has to read.
 *
 * `unknown` on the way out, deliberately: the stored value crossed a boundary
 * the type system cannot follow, so the caller checks its shape rather than
 * trusting a cast.
 */
export function readStoredJson(key: string): unknown {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

/** Whether the value was kept. A failure is not reported further than that. */
export function writeStoredJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
