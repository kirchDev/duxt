---
title: Getting started
description: Extend the layer, put Markdown in docs/, and you have a site.
---

Install the layer and extend it. That is the whole setup for the common case:
one repository, one `docs/` folder, no versions.

::steps

1. Add the dependency.

   ::package-managers{command="add -D @kirchdev/duxt"}
   ::

2. Extend the layer in `nuxt.config.ts`.

   ```ts
   export default defineNuxtConfig({
     extends: ['@kirchdev/duxt']
   });
   ```

3. Write Markdown in `docs/` and start the app.
   ::

::callout{type="tip" title="Nothing else is required"}
The navbar, the sidebar, the table of contents and the landing page all come
from the layer's `app.config.ts` — override the parts you disagree with.
::

## What a project looks like

::file-tree{title="your-project/"}

- docs/
  - index.md
  - guides/
    - deploying.md
- nuxt.config.ts
- package.json
  ::

::callout{type="warning" title="One docs/ per repository"}
The layer resolves `docs/` against the repository root, so a site in a
subfolder still finds it.
::
