import assert from 'node:assert/strict';

export async function assertWikiFixture(origin: string, changed = false) {
  const response = await fetch(
    `${origin}/api/wiki-fixture${changed ? '?title=RENAMED&path=/renamed' : ''}`
  );
  assert.equal(response.status, 200, await response.clone().text());
  const data = (await response.json()) as {
    pages: {
      path: string;
      links: { target: string; kind: string }[];
      categories: string[];
      aliases: string[];
    }[];
    resolved: { pages: { path: string }[] }[];
    incoming: { path: string }[];
    category: { parents: string[]; members: { path: string }[] };
    unpaged: { parents: string[]; members: { path: string }[] };
  };
  const row = data.pages.find((page) => page.path === '/wiki');
  assert.ok(row, 'the actual wiki database row is present');
  assert.deepEqual(row.links, [
    { target: '/target', kind: 'markdown' },
    { target: 'FAST#Part', kind: 'wiki' },
    { target: '#user-content-fn-wiki', kind: 'markdown' },
    { target: '/wiki/category/unpaged', kind: 'markdown' },
    { target: '/wiki/disambiguation', kind: 'markdown' },
    { target: '/wiki/category/modes', kind: 'markdown' },
    { target: '#user-content-fnref-wiki', kind: 'markdown' }
  ]);
  assert.deepEqual(row.categories, ['Modes', 'Unpaged']);
  assert.deepEqual(row.aliases, ['Entry']);
  assert.deepEqual(
    data.resolved.map((result) => result.pages.map((page) => page.path)),
    Array.from({ length: 3 }, () => [
      changed ? '/wiki/renamed' : '/wiki/target'
    ])
  );
  assert.deepEqual(
    data.incoming.map((page) => page.path),
    changed ? ['/wiki'] : ['/wiki', '/wiki/disambiguation']
  );
  assert.deepEqual(data.category.parents, ['Catalog']);
  assert.ok(data.category.members.some((page) => page.path === '/wiki'));
  assert.deepEqual(data.unpaged.parents, []);
  assert.deepEqual(
    data.unpaged.members.map((page) => page.path),
    ['/wiki']
  );
  return data;
}
