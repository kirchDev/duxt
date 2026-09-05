<script setup lang="ts">
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

const baseUrl = (useRuntimeConfig().public as { i18n?: { baseUrl?: string } })
  .i18n?.baseUrl;

const direction = computed(() => {
  const current = locales.value.find(
    (entry) => (typeof entry === 'string' ? entry : entry.code) === locale.value
  );

  return (typeof current === 'object' && current?.dir) || 'ltr';
});

useHead(() => ({
  htmlAttrs: { lang: locale.value, dir: direction.value }
}));

if (baseUrl) {
  const localeHead = useLocaleHead({ dir: false, lang: false, seo: true });
  useHead(() => localeHead.value);
}
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
