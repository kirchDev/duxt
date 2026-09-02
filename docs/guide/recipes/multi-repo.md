---
title: Documentation across repositories
description: One site, many projects.
icon: lucide:folder-git
---

Each source repository holds nothing but Markdown. The site declares one
collection per repository and gives each its own prefix:

::file-tree{title="the site"}
---
tree:
  - name: content.config.ts
  - name: nuxt.config.ts
  - name: package.json
---
::

The source repositories stay free of Nuxt entirely — which is what makes this
work for a Go or PHP project.
