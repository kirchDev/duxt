import {
  duxtRecoverContentRestores,
  type DuxtD1
} from '../utils/content-restore';

/**
 * Clears Content restores a cancelled Worker left half done, from inside the
 * Worker, on D1.
 *
 * `content-import-lifetime.ts` keeps a restore running past a disconnect, but
 * only for the platform's grace period, and a row that was stranded before it
 * — or by a deploy that cut a running restore off — stays unready for good:
 * every read of that collection then waits 90 seconds and fails, and a docs
 * page reads every version's collection to draw its switcher. duxt.app sat
 * like that after the v0.10.0 deploy until the row was removed by hand.
 *
 * It runs here rather than in the deploy because the Worker is the one thing
 * that already holds the binding: a cleanup step in CI would need a token with
 * D1 rights for every repository that reads it, and would help no site but the
 * one whose workflow carries it.
 *
 * At most once a minute per isolate, after the response, so no reader waits on
 * it. A failure is logged and dropped: this is a repair, and a missing table
 * on a fresh database is not an error.
 */
const INTERVAL_MS = 60_000;

let last = 0;

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const env = event.context.cloudflare?.env as
      | Record<string, unknown>
      | undefined;
    if (!env || !event.waitUntil) return;

    const database = useRuntimeConfig(event).content?.database as
      | { type?: string; bindingName?: string; binding?: string }
      | undefined;
    if (database?.type !== 'd1') return;

    const db = env[database.bindingName || database.binding || 'DB'] as
      | DuxtD1
      | undefined;
    if (!db) return;

    const now = Date.now();
    if (now - last < INTERVAL_MS) return;
    last = now;

    event.waitUntil(
      duxtRecoverContentRestores(db, now)
        .then((removed) => {
          if (removed.length) {
            console.warn(
              `[duxt] cleared abandoned Content restores: ${removed.join(', ')}`
            );
          }
        })
        .catch((error) => {
          console.warn('[duxt] Content restore check failed', error);
        })
    );
  });
});
