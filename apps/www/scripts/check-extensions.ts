#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { startBuiltServer } from './built-server.ts';

const site = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:3125';
const server = startBuiltServer({
  port: 3125,
  origin,
  env: { NUXT_SITE_URL: origin, NUXT_PUBLIC_I18N_BASE_URL: origin }
});
try {
  await server.ready();
  const response = await fetch(`${origin}/api/extension-fixture`);
  assert.equal(response.status, 200);
  const result = (await response.json()) as {
    page: { title: string; extensionFixture: string };
    generated: { title: string; extensionFixture: string };
  };
  assert.equal(result.page.title, 'Layer source flavor');
  assert.equal(result.page.extensionFixture, 'flavor-from-layer');
  assert.equal(result.generated.title, 'Site section override');
  assert.equal(result.generated.extensionFixture, 'generated-schema-field');
  const generated = await (
    await fetch(`${origin}/extension-fixture/fixture-section`)
  ).text();
  assert.match(generated, /Site section override/);
  const markdown = await (
    await fetch(`${origin}/extension-fixture/fixture-section.md`)
  ).text();
  assert.match(markdown, /Generated fixture prose from the site override/);
  const llms = await (await fetch(`${origin}/llms.txt`)).text();
  assert.match(llms, /extension-fixture\/fixture-section/);
  const home = await (await fetch(origin)).text();
  assert.match(home, /data-form-type="other"/);
  assert.match(home, /echoconsignment|\/echo/);
  const js = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? js(join(dir, entry.name))
        : entry.name.endsWith('.js')
          ? [join(dir, entry.name)]
          : []
    );
  for (const file of js(join(site, '.output/public/_nuxt')))
    assert.doesNotMatch(
      readFileSync(file, 'utf8'),
      /DUXT_FIXTURE_PARSER_BUILD_ONLY/
    );
  console.log(
    'Build extensions: layer flavor, shared schema, site parser override, rendered operation demo, Markdown/llms exports and browser separation passed.'
  );
} finally {
  await server.stop();
}
