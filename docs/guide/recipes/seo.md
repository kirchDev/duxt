---
title: SEO and machine readers
description: What the layer emits for crawlers, social cards and models — and the one value it cannot guess.
icon: lucide:search
---

Every page emits a full head, a structured description of itself, a social card
and an entry in the sitemap. One value has to come from you.

## State the origin once

duxt cannot guess the domain it will be served from, and four things need it:
`hreflang`, `canonical`, the sitemap and the Open Graph images.

```ts [nuxt.config.ts]
i18n: { baseUrl: 'https://docs.example.com' }
```

Or `NUXT_PUBLIC_I18N_BASE_URL` in the deployment. The layer copies it to
`site.url`, which is where the SEO modules look — an explicit `site.url` still
wins, because a human wrote it.

Left unset, every one of them degrades to relative output rather than inventing
a domain. That is the honest way round: a relative `canonical` resolves
correctly, a guessed origin does not, and telling a crawler nothing beats
telling it something untrue.

## Versions do not compete with each other

A version that is not the current one carries `noindex, follow` and a
`canonical` pointing at the same page in the current version, and it is left out
of the sitemap. An `eol` version is left out whether or not it is the default.

The three have to agree: listing a page in the sitemap that then tells the
crawler to drop it is asking for a fetch you did not want. All three are derived
from the same resolved manifest, so they cannot come apart.

The reader gets the other half — see the version banner in the components
reference.

## What each page emits

| Tag                          | Where it comes from             |
| :--------------------------- | :------------------------------ |
| `title`, with the site name   | `titleTemplate` in `app.vue`    |
| `description`                | The page's frontmatter          |
| `ogTitle` / `ogDescription`  | The same two                    |
| `ogType`, `ogUrl`            | `article`, the absolute path    |
| `twitterCard`                | `summary_large_image`           |
| `og:image`                   | `OgImage/Duxt.satori.vue`       |
| `canonical`                  | The preferred version's path    |
| `robots`                     | The version rules above         |
| `TechArticle` JSON-LD        | The page                        |
| `BreadcrumbList` JSON-LD     | The trail the breadcrumb draws  |

## Machine readers

| Route            | What it is                                          |
| :--------------- | :-------------------------------------------------- |
| `/llms.txt`      | The index: every page, linked, with its description  |
| `/llms-full.txt` | The same pages, whole, in one Markdown file          |
| `/mcp`           | An MCP server over the same content                  |
| `/rss.xml`       | The feed, once `duxt.feed.path` names a section      |
| `<page>.md`      | One page's Markdown source                          |

`llms-full.txt` serves the Markdown as written, not the rendered HTML — an MDC
block reaches the reader as the component call it is, and a code fence is still
a fence. Appending `.md` to any page's URL serves the same thing for one page,
which is what the **Copy page** control beside each title hands to ChatGPT and
Claude.

::callout{type="tip" title="hreflang and the version prefix compose"}
The locale segment goes in front: `/de-DE/workflows/v0.7.0/guides/add-a-body`.
Every alternate link keeps the version prefix, so the two schemes agree.
::
