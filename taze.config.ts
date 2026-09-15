import { defineConfig } from 'taze';

export default defineConfig({
  // A workspace: the root carries only the meta tooling, and every dependency
  // the layer and the site run on lives in `packages/*` and `apps/*`.
  recursive: true,
  ignorePaths: ['**/node_modules/**']
});
