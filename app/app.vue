<script setup lang="ts">
import { ConfigProvider } from 'reka-ui';

/**
 * The locale's head tags.
 *
 * `lang` and `dir` are set by hand rather than through `useLocaleHead`, because
 * that composable warns ONCE PER RENDER when the site has no `baseUrl` — and it
 * does so from `createHeadContext`, before it ever looks at whether alternate
 * links were asked for. Passing `seo: false` does not quiet it; not calling it
 * does.
 *
 * So the alternate links — the ones telling a search engine these pages are
 * translations of one another rather than duplicates — are emitted only when
 * the site knows its own origin. That is also the honest way round: a relative
 * `hreflang` is not a valid one, and telling a crawler nothing beats telling it
 * something untrue.
 *
 * Set `NUXT_PUBLIC_I18N_BASE_URL` in the deployment, or `i18n.baseUrl` in the
 * consumer's config; duxt cannot guess it.
 */
const { locale, locales } = useI18n();
const duxt = useDuxtConfig();
const direction = useDuxtDirection();

const baseUrl = (useRuntimeConfig().public as { i18n?: { baseUrl?: string } })
  .i18n?.baseUrl;

useHead(() => ({
  htmlAttrs: { lang: locale.value, dir: direction.value },

  // Every page said only its own title, so a tab, a bookmark and a search
  // result all read "Deploying" with nothing saying whose documentation it is.
  // A page setting no title of its own gets the site name alone rather than a
  // dangling separator.
  titleTemplate: (title?: string) =>
    title ? `${title} · ${duxt.title}` : duxt.title,

  // A feed a reader's client can find without being told where it is. Only
  // when there is one — see `duxt.feed`.
  link: duxt.feed?.path
    ? [
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          title: duxt.feed.title ?? duxt.title,
          href: '/rss.xml'
        }
      ]
    : []
}));

if (baseUrl) {
  const localeHead = useLocaleHead({ dir: false, lang: false, seo: true });
  useHead(() => localeHead.value);
}

/**
 * `og:locale`, which nuxt-seo-utils does not derive from i18n.
 *
 * Open Graph spells a locale with an underscore — `de_DE`, not `de-DE` — and
 * the alternates are the OTHER locales this site serves, so a share card comes
 * back in the reader's language where the network offers the choice. Only where
 * the site has more than one; a single-locale site listing no alternates is
 * correct, not incomplete.
 */
const ogLocale = (code: string) => code.replace('-', '_');

useSeoMeta({
  ogSiteName: () => duxt.title,
  ogLocale: () => ogLocale(locale.value),
  ogLocaleAlternate: () =>
    locales.value
      .map((entry) => (typeof entry === 'string' ? entry : entry.code))
      .filter((code) => code !== locale.value)
      .map(ogLocale)
});

/**
 * WHAT THE SITE IS, once, for every page under it.
 *
 * nuxt-schema-org keeps one `@graph` per document and merges into it, so this
 * node and the per-page `Article` in `[...slug].vue` end up in the same script
 * tag with the references between them resolved — which is the whole reason the
 * hand-written JSON-LD that used to live there could go.
 *
 * The `Organization` is conditional and stays that way: duxt renders somebody
 * else's documentation and must not name a publisher it invented. A consumer
 * fills in `duxt.organization`; until then the site describes itself and no
 * more.
 */
useSchemaOrg([
  defineWebSite({
    name: duxt.title,
    inLanguage: locale.value
  }),
  ...(duxt.organization?.name
    ? [
        defineOrganization({
          name: duxt.organization.name,
          url: duxt.organization.url,
          logo: duxt.organization.logo
        })
      ]
    : [])
]);
</script>

<template>
  <!-- Reads the new page's title into a live region after a client-side
       navigation; the focus half of the same problem is useDuxtPageFocus. -->
  <NuxtRouteAnnouncer />

  <!-- reka-ui reads its direction from HERE and from nowhere else: its
       `useDirection` injects this context and falls back to `ltr` without ever
       consulting the document, so `<html dir>` alone leaves every menu, select,
       tooltip and scroll area laid out left-to-right under a right-to-left
       page. Renderless — it draws no element and changes no landmark. -->
  <ConfigProvider :dir="direction">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </ConfigProvider>
</template>
