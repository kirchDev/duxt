import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  duxtRecoverContentRestores,
  type DuxtD1,
  type DuxtD1Statement
} from '../server/utils/content-restore';

/**
 * D1 is SQLite behind an async API, so the SQL is run for real against
 * `node:sqlite` through the few calls the recovery uses — a typo in a
 * statement fails here rather than in a Worker's log.
 */
function d1(database: DatabaseSync): DuxtD1 {
  const statement = (sql: string, values: unknown[] = []): DuxtD1Statement => ({
    bind: (...bound) => statement(sql, bound),
    all: async <T>() => ({
      results: database.prepare(sql).all(...(values as never[])) as T[]
    }),
    run: async () => database.prepare(sql).run(...(values as never[]))
  });

  return {
    prepare: (sql) => statement(sql),
    batch: async (statements) => {
      for (const one of statements) await one.run();
    }
  };
}

const MINUTE = 60_000;

describe('duxtRecoverContentRestores', () => {
  let database: DatabaseSync;
  let db: DuxtD1;

  const info = () =>
    database
      .prepare('SELECT id, version, ready FROM _content_info ORDER BY id')
      .all();

  beforeEach(() => {
    database = new DatabaseSync(':memory:');
    database.exec(
      'CREATE TABLE _content_info (id TEXT PRIMARY KEY, version TEXT, structureVersion TEXT, ready BOOLEAN)'
    );
    database.exec(
      "INSERT INTO _content_info VALUES ('checksum_docs', 'v1', 's', 1), ('checksum_docs_v0_8_1', 'v1', 's', 0)"
    );
    db = d1(database);
  });

  it('leaves a restore alone the first time it sees it unready', async () => {
    expect(await duxtRecoverContentRestores(db, 0)).toEqual([]);
    expect(info()).toHaveLength(2);
  });

  it('removes a row that stayed unready past the threshold', async () => {
    await duxtRecoverContentRestores(db, 0);

    expect(await duxtRecoverContentRestores(db, 2 * MINUTE)).toEqual([]);
    expect(await duxtRecoverContentRestores(db, 3 * MINUTE)).toEqual([
      'checksum_docs_v0_8_1'
    ]);
    expect(info()).toEqual([{ id: 'checksum_docs', version: 'v1', ready: 1 }]);
  });

  it('spares a restore that finished in between', async () => {
    await duxtRecoverContentRestores(db, 0);
    database.exec(
      "UPDATE _content_info SET ready = 1 WHERE id = 'checksum_docs_v0_8_1'"
    );

    expect(await duxtRecoverContentRestores(db, 5 * MINUTE)).toEqual([]);
    expect(info()).toHaveLength(2);
  });

  it('starts the clock again for a new version of the same collection', async () => {
    await duxtRecoverContentRestores(db, 0);
    database.exec(
      "UPDATE _content_info SET version = 'v2' WHERE id = 'checksum_docs_v0_8_1'"
    );

    expect(await duxtRecoverContentRestores(db, 2 * MINUTE)).toEqual([]);
    expect(await duxtRecoverContentRestores(db, 4 * MINUTE)).toEqual([]);
    expect(await duxtRecoverContentRestores(db, 5 * MINUTE)).toEqual([
      'checksum_docs_v0_8_1'
    ]);
  });

  it('gives the restore after a removal its own clock', async () => {
    await duxtRecoverContentRestores(db, 0);
    await duxtRecoverContentRestores(db, 3 * MINUTE);

    // Content restores it again, under the same version, and is slow about it.
    database.exec(
      "INSERT INTO _content_info VALUES ('checksum_docs_v0_8_1', 'v1', 's', 0)"
    );

    expect(await duxtRecoverContentRestores(db, 4 * MINUTE)).toEqual([]);
    expect(info()).toHaveLength(2);
  });
});
