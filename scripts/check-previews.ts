import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

/**
 * Are the committed panel previews still what the panels render?
 *
 * The documentation embeds generated HTML rather than screenshots so it cannot
 * go stale — but only if something notices when the generator's output moves.
 * This is that something: it renders the fixtures again and compares, exactly
 * as `check:policy` proves the two permission files still agree.
 *
 * Regenerate with `pnpm previews`.
 */
const jiti = createJiti(import.meta.url, { interopDefault: true });

/**
 * The preview module's shape, declared rather than imported.
 *
 * `tsc` here compiles the meta scripts under Node's own resolution, and the
 * layer's sources are extensionless TypeScript meant for Vite — importing one
 * for its types drags the whole layer, its ambient globals included, into a
 * project built for four scripts. jiti loads it at runtime; this says what
 * comes back, and `pnpm check:previews` is what notices if that ever changes.
 */
interface PreviewModule {
  PREVIEW_TABS: { slug: string; title: string; file: string }[];
  previewPage: (slug: string) => string;
}

const { PREVIEW_TABS, previewPage } = (await jiti.import(
  '../server/devtools/preview'
)) as PreviewModule;

const OUT = fileURLToPath(new URL('../public/devtools/', import.meta.url));

const stale: string[] = [];
const expected = new Set(PREVIEW_TABS.map((tab) => tab.file));

for (const tab of PREVIEW_TABS) {
  let committed: string;
  try {
    committed = readFileSync(join(OUT, tab.file), 'utf8');
  } catch {
    stale.push(`${tab.file} is missing`);
    continue;
  }

  if (committed !== previewPage(tab.slug)) {
    stale.push(`${tab.file} differs from what the panel renders`);
  }
}

// A tab that was renamed leaves its old file behind, and a docs page can go on
// embedding it for months — the file is there, it simply describes nothing.
let present: string[] = [];
try {
  present = readdirSync(OUT).filter((file) => file.endsWith('.html'));
} catch {
  stale.push('public/devtools/ does not exist');
}

for (const file of present) {
  if (!expected.has(file)) stale.push(`${file} belongs to no panel`);
}

if (stale.length) {
  console.error('Devtools previews are out of date:');
  for (const line of stale) console.error(`  - ${line}`);
  console.error('\nRun `pnpm previews` and commit the result.');
  process.exit(1);
}

console.log(`${PREVIEW_TABS.length} devtools previews match their panels.`);
