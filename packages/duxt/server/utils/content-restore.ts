/**
 * The part of a D1 binding this file uses — written out rather than imported,
 * because the layer does not depend on Cloudflare's types and no other
 * runtime ever reaches this code.
 */
export interface DuxtD1 {
  prepare(sql: string): DuxtD1Statement;
  batch(statements: DuxtD1Statement[]): Promise<unknown>;
}

export interface DuxtD1Statement {
  bind(...values: unknown[]): DuxtD1Statement;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

/**
 * Twice the 90 seconds Content waits for another restore before giving up.
 * A restore takes about ten seconds a collection on duxt.app, so a row still
 * unready after this has nobody left writing it.
 */
export const DUXT_STALE_RESTORE_MS = 180_000;

/** Where a row was first seen unready. Content owns `_content_info`; this is ours. */
const SEEN = '_duxt_content_unready';

/**
 * Removes every Content restore that was abandoned halfway, so the next read
 * of that collection restores it again instead of waiting on it forever.
 *
 * Content marks a collection `ready = 0` in `_content_info`, replays its dump
 * and flips the row as the dump's last statement. A Worker cancelled before
 * that statement leaves the row unready for good, and every later read waits
 * 90 seconds and fails — see `server/plugins/content-restore-recovery.ts`.
 *
 * The row carries no timestamp, and an unready row is also exactly what a
 * restore IN PROGRESS looks like, so a single look cannot tell the two apart.
 * Two looks can: the first records when a row was seen unready, and a later
 * one removes it only if the SAME version is still unready past the threshold.
 * A new deploy writes a new version, which starts the clock again.
 *
 * Returns the ids it removed.
 */
export async function duxtRecoverContentRestores(
  db: DuxtD1,
  now: number,
  staleMs = DUXT_STALE_RESTORE_MS
): Promise<string[]> {
  const unready = await db
    .prepare('SELECT id, version FROM _content_info WHERE ready = 0')
    .all<{ id: string; version: string }>();

  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS ${SEEN} (id TEXT PRIMARY KEY, version TEXT NOT NULL, since INTEGER NOT NULL)`
    ),
    // A row that finished, or that Content replaced, is forgotten — otherwise
    // its old clock would condemn the next restore of the same version.
    db.prepare(
      `DELETE FROM ${SEEN} WHERE NOT EXISTS (SELECT 1 FROM _content_info AS info WHERE info.id = ${SEEN}.id AND info.version = ${SEEN}.version AND info.ready = 0)`
    ),
    ...unready.results.map((row) =>
      db
        .prepare(
          `INSERT INTO ${SEEN} (id, version, since) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING`
        )
        .bind(row.id, row.version, now)
    )
  ]);

  const stale = await db
    .prepare(`SELECT id, version FROM ${SEEN} WHERE since <= ?`)
    .bind(now - staleMs)
    .all<{ id: string; version: string }>();
  if (!stale.results.length) return [];

  // `ready = 0` and the version in the condition: a restore that finished, or
  // a deploy that replaced the row, since the look above keeps its row.
  await db.batch(
    stale.results.flatMap((row) => [
      db
        .prepare(
          'DELETE FROM _content_info WHERE id = ? AND version = ? AND ready = 0'
        )
        .bind(row.id, row.version),
      db.prepare(`DELETE FROM ${SEEN} WHERE id = ?`).bind(row.id)
    ])
  );

  return stale.results.map((row) => row.id);
}
