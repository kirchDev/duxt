import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Walk up to the repository root, so `docs/` resolves there and not in a
 * subfolder.
 *
 * A FILE OF ITS OWN, for eight lines, because of what importing it drags along.
 * It lived in `sources.ts`, which imports `@nuxt/content` and `@nuxtjs/sitemap`
 * — types that resolve inside the Content config and not inside a Nuxt module,
 * so a module reaching for this function pulled that whole graph into a
 * typecheck it does not belong to. Node-only either way, and therefore still
 * not beside the resolver: that half is read by `app.config.ts` and bundled for
 * the browser.
 */
export function repositoryRoot(): string {
  let dir = process.cwd();

  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;

    const parent = dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}
