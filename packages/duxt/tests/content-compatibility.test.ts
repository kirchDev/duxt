import { expect, it } from 'vitest';
import {
  assertContentCompatibility,
  contentCompatHash
} from '../build/content/content-bundle';
import { readContentManifest } from '../build/content/content-compatibility';
const compat = {
  databaseVersion: 'v3.5.0',
  checksumsStructure: { docs: 'schema' },
  tables: { docs: '_content_docs' },
  collectionMetaHash: 'meta',
  resolvedSourcesHash: 'sources'
};
it('accepts component subsets without including them in the structural hash', () => {
  const expected = {
    compatHash: contentCompatHash(compat),
    availableComponents: ['Callout', 'Tabs']
  };
  expect(() =>
    assertContentCompatibility(compat, ['Callout', 'Tabs'], expected)
  ).not.toThrow();
  expect(() => assertContentCompatibility(compat, [], expected)).not.toThrow();
  expect(() =>
    assertContentCompatibility(compat, ['NewWidget'], expected)
  ).toThrow('NewWidget');
  for (const changed of [
    { ...compat, databaseVersion: 'v4' },
    { ...compat, checksumsStructure: { docs: 'changed' } },
    { ...compat, tables: { docs: 'changed' } },
    { ...compat, collectionMetaHash: 'changed' },
    { ...compat, resolvedSourcesHash: 'changed' }
  ])
    expect(() => assertContentCompatibility(changed, [], expected)).toThrow(
      'hash differs'
    );
  expect(contentCompatHash({ ...compat, tables: { b: 'b', a: 'a' } })).toBe(
    contentCompatHash({ ...compat, tables: { a: 'a', b: 'b' } })
  );
});
it('reads only literal manifest data and refuses an executable expression', () => {
  const literal =
    'export const checksums = {"docs":"v3.5.0--one"}\nexport const checksumsStructure = {"docs":"schema"}\nexport const tables = {"docs":"_content_docs"}\nexport default {"docs":{"type":"page","fields":{}}}';
  expect(readContentManifest(literal).checksums).toEqual({
    docs: 'v3.5.0--one'
  });
  expect(() =>
    readContentManifest(
      literal.replace('{"docs":"v3.5.0--one"}', 'process.exit(9)')
    )
  ).toThrow();
});
