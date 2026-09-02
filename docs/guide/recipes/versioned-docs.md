---
title: Versioned docs
description: Serving several versions of the same documentation.
icon: lucide:git-compare
---

Point a collection at a tag and it becomes a version. The URL prefix keeps them
apart:

```ts [content.config.ts]
const versions = ['v1.x', 'v2.x', 'main']
```

::callout{type="warning" title="A page can be missing from a version"}
Linking between versions needs a fallback rule for a page that only exists in
one of them. That rule is not designed yet.
::
