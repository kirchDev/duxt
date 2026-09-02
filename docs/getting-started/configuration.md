---
title: Configuration
description: What lives in app.config.ts, and what you can override.
icon: lucide:settings
---

Everything the theme shows is data. Your own `app/app.config.ts` is merged over
the layer's, so overriding one key leaves the rest alone.

```ts [app/app.config.ts]
export default defineAppConfig({
  duxt: {
    title: 'my project',
    version: 'v1.4.0',
    sections: [{ label: 'Guide', to: '/guide', icon: 'lucide:book-open' }]
  }
});
```

## Keys

| Key          | What it controls                                          |
| :----------- | :-------------------------------------------------------- |
| `title`      | The name in the navbar and the SEO title                  |
| `version`    | The badge beside it                                       |
| `sections`   | The second navbar row                                     |
| `navigation` | Navbar links; an entry with `children` becomes a dropdown |
| `links`      | Icon links on the right of the navbar                     |
| `landing`    | The hero and feature cards at `/`                         |
| `aside`      | Fixed links under the table of contents                   |
| `footer`     | The note and links at the bottom                          |
