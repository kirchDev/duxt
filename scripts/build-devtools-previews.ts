import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

/**
 * The devtools panels, rendered from fixtures into static files.
 *
 * The documentation embeds these, and they are generated rather than captured:
 * a screenshot of a panel is out of date the day a column is added, and the
 * real route only exists inside a dev server — the tab is not registered in a
 * build at all. Rendering them through the panels' own functions means the
 * pictures in the documentation cannot disagree with the tab they describe.
 *
 * Loaded through jiti rather than imported, for the reason `duxt-app-config.ts`
 * uses it: the layer's own sources are extensionless TypeScript, which Vite
 * resolves and plain Node does not.
 *
 * The output is committed, so a clone renders the docs without running this
 * first. `pnpm check:previews` regenerates and fails on a difference — the same
 * proof `check:policy` gives for the two permission files.
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

/**
 * The LAYER's public directory, not `www`'s.
 *
 * The pages that embed these ship inside the package, so the documents they
 * ask for have to ship inside it too — served from `www` they resolve on this
 * repo's own site and on no other, which is ten empty frames for anyone else
 * rendering the reference. Nuxt serves every layer's `public/`, so a consumer
 * gets them by extending.
 */
const OUT = fileURLToPath(new URL('../public/devtools/', import.meta.url));

mkdirSync(OUT, { recursive: true });

for (const tab of PREVIEW_TABS) {
  writeFileSync(join(OUT, tab.file), previewPage(tab.slug));
  console.log(`wrote ${tab.file}`);
}
