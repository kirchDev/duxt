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
| `links`      | Icon links on the right of the navbar — **empty by default** |
| `landing`    | The hero and feature cards at `/`                         |
| `aside`      | Fixed links under the table of contents — **empty by default** |
| `footer`     | The note and links at the bottom                          |
| `breadcrumb` | `false` drops the trail above the page title              |
| `packageManagers` | Which managers a command block offers, in order      |
| `locales`    | Which of the layer's languages this site serves            |
| `sources`    | The documentation sources — see the sources reference      |
| `sourceOptions` | How those sources become URL prefixes                   |
| `feed`       | The section `/rss.xml` publishes                            |

## Links belong to whoever runs the site

`links`, `aside.links` and `footer.legal` ship **empty**. A repository, an issue
tracker, a Discord and an imprint all name a specific project, and a default
that names duxt's would give your readers a "Star on GitHub" that stars somebody
else's work.

The layer's own i18n keys stay available, so a link you add is still translated
in every language duxt ships:

```ts
links: [
  {
    icon: 'lucide:github',
    to: 'https://github.com/you/your-project',
    label: 'duxt.defaults.links.repository'
  }
]
```

## The feed

`/rss.xml` is off until `feed.path` names a section:

```ts
feed: { path: '/changelog', title: 'my project — releases' }
```

Off by default on purpose. A feed is a list of things that **happened**, and a
reference page being edited is not an event — a site publishing every page edit
as an item teaches its readers to unsubscribe. Items are ordered by a page's own
`date` frontmatter, falling back to the last commit that touched it.

Only the default version of each source contributes, so a versioned changelog
does not repeat every entry once per version.

## The site's origin

duxt cannot guess the domain it will be served from, and four things need it:
`hreflang`, `canonical`, the sitemap and the Open Graph images. State it once,
where Nuxt already asks for it:

```ts [nuxt.config.ts]
i18n: { baseUrl: 'https://docs.example.com' }
```

or `NUXT_PUBLIC_I18N_BASE_URL` in the deployment. The layer copies it to
`site.url`, which is where the SEO modules look. Left unset, every one of them
degrades to relative output rather than inventing a domain — a relative
`canonical` resolves correctly, and a guessed one is actively wrong.
