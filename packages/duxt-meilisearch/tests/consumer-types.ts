import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run explicitly after a frozen workspace install; no engine is contacted.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const site = join(root, 'apps/www');
const nuxt = join(site, 'node_modules/nuxt/bin/nuxt.mjs');
execFileSync(process.execPath, [nuxt, 'prepare'], {
  cwd: site,
  stdio: 'inherit'
});
mkdirSync(join(site, '.data'), { recursive: true });
const consumer = mkdtempSync(join(site, '.data/meilisearch-types-'));
try {
  cpSync(
    fileURLToPath(new URL('./fixtures/consumer', import.meta.url)),
    consumer,
    { recursive: true }
  );
  // Local source resolution stops at this consuming app, not the workspace.
  execFileSync('git', ['init', '-q', consumer]);
  execFileSync(process.execPath, [nuxt, 'typecheck'], {
    cwd: consumer,
    stdio: 'inherit'
  });
  const config = join(consumer, 'nuxt.config.ts');
  writeFileSync(
    config,
    readFileSync(config, 'utf8').replace(
      '    // @ts-expect-error A browser search key must be a string.\n',
      ''
    )
  );
  const invalid = spawnSync(process.execPath, [nuxt, 'typecheck'], {
    cwd: consumer,
    encoding: 'utf8'
  });
  const diagnostics = `${invalid.stdout}${invalid.stderr}`;
  assert.notEqual(
    invalid.status,
    0,
    'A numeric search key must fail the real consumer typecheck'
  );
  assert.match(diagnostics, /Type 'number' is not assignable to type 'string'/);
  assert.doesNotMatch(diagnostics, /duxtMeilisearch.*does not exist/);
  console.log('Consumer typecheck passed; a numeric search key is rejected.');
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
