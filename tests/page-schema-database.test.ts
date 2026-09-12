import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { beforeAll, describe, expect, it } from 'vitest';
import { defineCollection } from '@nuxt/content';
import { pageSchema } from '../sources';
import {
  duxtPageControls,
  duxtPageSearchable
} from '../app/utils/page-controls';

/**
 * WHAT THE DATABASE HANDS BACK, NOT WHAT JAVASCRIPT WOULD.
 *
 * Every page-control predicate in the layer reads a frontmatter flag that was
 * written by nobody: `search: false` is the opt-out, and the overwhelming
 * majority of pages say nothing at all. A unit test can build `{}` and prove
 * `duxtPageSearchable({})` is true for ever, and it did — while search returned
 * zero results on every duxt site, for every query (#88). The reason is that no
 * page object in production is ever built in JavaScript:
 *
 * 1. `z.boolean().optional()` generates a `BOOLEAN` column with no default, so
 *    a page that says nothing stores SQL `NULL`.
 * 2. Content decodes a row through `refineContentFields`, which casts every
 *    column it typed `boolean` with `Boolean(value)` — and `Boolean(null)` is
 *    `false`, on every adapter, server and client alike.
 * 3. `page.search !== false` is then false for every page ever written.
 *
 * So the assertion has to be made on a row that has been through a real
 * database, and the schema has to be the layer's own. Everything between the
 * two comes from Content itself: the collection is built by Content's
 * `defineCollection`, the columns by Content's `describeProperty`, and the
 * inserted value by the rule Content's `generateCollectionInsert` applies. The
 * only thing this file decides is what a page says in its frontmatter.
 *
 * The fix is at the schema — a default, so the column is never NULL — because
 * the predicate cannot be fixed: once the cast has run, "absent" and
 * "explicitly false" are the same value.
 */

const require = createRequire(import.meta.url);
const contentEntry = require.resolve('@nuxt/content');
const contentDist = dirname(contentEntry);
const contentRequire = createRequire(pathToFileURL(contentEntry));

const internal = (file: string) =>
  pathToFileURL(join(contentDist, 'runtime/internal', file)).href;

interface ContentProperty {
  sqlType: string;
  nullable: boolean;
  json: boolean;
  maxLength?: number;
  default?: unknown;
}

interface ContentSchemaModule {
  describeProperty: (schema: unknown, key: string) => ContentProperty;
  getOrderedSchemaKeys: (schema: unknown) => string[];
  getCollectionFieldsTypes: (schema: unknown) => Record<string, string>;
}

let content: ContentSchemaModule;

/**
 * Content converts a collection schema inside Nuxt, not on import.
 *
 * `defineCollection` asks a context for the converter matching the schema's
 * vendor, and outside a Nuxt build that context holds only the stub that throws
 * "Zod is not installed". The module's own `setup` fills it in; this does the
 * same thing with the same packages, resolved out of Content's own tree so
 * pnpm's isolated node-linker cannot answer about a different copy.
 */
beforeAll(async () => {
  const { getContext } = await import(
    pathToFileURL(contentRequire.resolve('unctx')).href
  );
  const { zodToJsonSchema } = await import(
    pathToFileURL(contentRequire.resolve('zod-to-json-schema')).href
  );

  getContext('@nuxt/content:validators-context')
    .use()
    .set('zod3', {
      toJSONSchema: (schema: unknown, name: string) =>
        zodToJsonSchema(schema, {
          name,
          $refStrategy: 'none',
          dateStrategy: 'format:date'
        })
    });

  content = (await import(internal('schema.js'))) as ContentSchemaModule;
});

/** The collection duxt declares for a documentation source, schema and all. */
const collection = () =>
  defineCollection({
    type: 'page',
    schema: pageSchema,
    source: 'docs/**'
  }) as unknown as { extendedSchema: unknown };

/**
 * The table Content would create for that collection.
 *
 * `generateCollectionTableDefinition` is not exported, so its three lines are
 * restated here — but every value in them comes out of `describeProperty`,
 * which is Content's. A column that gains a default here gained one there.
 */
function tableDefinition(schema: unknown, table: string): string {
  const columns = content.getOrderedSchemaKeys(schema).map((key) => {
    if (key === 'id') return '"id" TEXT PRIMARY KEY';

    const property = content.describeProperty(schema, key);
    const type =
      property.sqlType === 'VARCHAR' && property.maxLength
        ? `${property.sqlType}(${property.maxLength})`
        : property.sqlType;
    const constraints = [property.nullable ? ' NULL' : ''];

    if ('default' in property) {
      const value = property.default;
      constraints.push(
        `DEFAULT ${
          typeof value === 'string'
            ? `'${value}'`
            : typeof value === 'object' && value !== null
              ? `'${JSON.stringify(value)}'`
              : String(value)
        }`
      );
    }

    return `"${key}" ${type}${constraints.join(' ')}`;
  });

  return `CREATE TABLE ${table} (${columns.join(', ')});`;
}

/** A SQL literal for one column, by the rule `generateCollectionInsert` uses. */
function literal(property: ContentProperty, value: unknown): string {
  // The line that matters: an absent field is stored as the column's DEFAULT,
  // and as NULL only when the schema declared none.
  const resolved =
    value === undefined
      ? 'default' in property
        ? property.default
        : null
      : value;

  if (resolved === null) return 'NULL';
  if (property.json) return `'${JSON.stringify(resolved).replace(/'/g, "''")}'`;
  if (property.sqlType === 'BOOLEAN') return String(Boolean(resolved));
  if (property.sqlType === 'INT') return String(Number(resolved));
  return `'${String(resolved).replace(/'/g, "''")}'`;
}

/**
 * One page, written to a real SQLite database and read back out of it.
 *
 * The decode mirrors `refineContentFields` — Content's own row refiner, which
 * cannot be imported here because it resolves `#content/manifest`, a virtual
 * module that exists only inside a Nuxt build. The field types it switches on
 * are not mirrored: `getCollectionFieldsTypes` is Content's, and it is the same
 * function that fills that manifest.
 */
function storedPage(frontmatter: Record<string, unknown>) {
  const { extendedSchema } = collection();
  const table = '_content_docs';
  const db = new DatabaseSync(':memory:');

  db.exec(tableDefinition(extendedSchema, table));

  const page: Record<string, unknown> = {
    id: 'docs/page.md',
    path: '/page',
    title: 'A page',
    description: '',
    stem: 'page',
    extension: 'md',
    meta: '{}',
    body: '{}',
    ...frontmatter
  };
  const keys = content.getOrderedSchemaKeys(extendedSchema);
  const values = keys.map((key) =>
    literal(content.describeProperty(extendedSchema, key), page[key])
  );

  db.exec(`INSERT INTO ${table} VALUES (${values.join(', ')});`);

  const row = db.prepare(`SELECT * FROM ${table}`).get() as Record<
    string,
    unknown
  >;
  db.close();

  const fields = content.getCollectionFieldsTypes(extendedSchema);
  for (const key in row) {
    if (fields[key] === 'json' && row[key] && row[key] !== 'undefined')
      row[key] = JSON.parse(row[key] as string);
    if (fields[key] === 'boolean' && row[key] !== 'undefined')
      row[key] = Boolean(row[key]);
  }

  return row;
}

describe('a page read back out of the database', () => {
  it('is searchable when its frontmatter says nothing', () => {
    expect(duxtPageSearchable(storedPage({}))).toBe(true);
  });

  it('is excluded when its frontmatter says so', () => {
    expect(duxtPageSearchable(storedPage({ search: false }))).toBe(false);
  });

  it('keeps every part of the docs shell it did not refuse', () => {
    expect(duxtPageControls(storedPage({}))).toMatchObject({
      toc: true,
      breadcrumb: true,
      prevNext: true,
      feedback: true,
      pageInfo: true,
      copyPage: true,
      search: true,
      // The one control that is off until a page asks for it.
      fullWidth: false
    });
  });

  it('refuses only what the page refused', () => {
    expect(duxtPageControls(storedPage({ copyPage: false }))).toMatchObject({
      copyPage: false,
      feedback: true,
      pageInfo: true,
      search: true
    });
  });

  it('stays in the navigation', () => {
    // Content's own navigation query drops a page whose `navigation` column is
    // the string `false`; duxt must not turn that column into something that
    // reads as a refusal for every page instead.
    expect(storedPage({}).navigation).not.toBe(false);
    expect(storedPage({ navigation: false }).navigation).toBe(false);
  });
});
