<script setup lang="ts">
/**
 * A link inside a page, resolved against the source it was written in.
 *
 * Markdown has no idea it is being served under a prefix. `/getting-started`
 * written in this repository's `docs/` is correct on a site with one source and
 * a 404 on a site with two, where the same page lives at
 * `/duxt/getting-started` — and the author of the Markdown, who may be another
 * repository entirely, cannot know which. Worse across versions: a link written
 * in v0.7.0 must stay inside v0.7.0, or the reader silently changes version
 * mid-sentence.
 *
 * So an absolute internal path is read as relative TO ITS OWN SOURCE, and the
 * prefix is put back here. `~/` is the explicit website-root escape hatch for
 * a link that has to leave that source. A path that already carries the prefix
 * is left alone, so a link written the long way round still works.
 */
const props = defineProps<{
  href?: string;
  target?: string;
}>();

const { source } = useDuxtCollection();
const localeLink = useDuxtLink();

const external = computed(() =>
  Boolean(props.href && /^(?:[a-z]+:|\/\/)/i.test(props.href))
);

const internal = computed(() =>
  Boolean(props.href?.startsWith('/') || props.href?.startsWith('~/'))
);

const to = computed(() => {
  const href = props.href ?? '';
  if (external.value || !internal.value) return href;

  const prefix = source.value?.prefix ?? '';
  const [pathAndQuery, hash] = href.split('#');
  const [path, query] = pathAndQuery!.split('?');
  const resolved = resolveDocumentationPath(path!, prefix);

  return `${localeLink(resolved)}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
});
</script>

<template>
  <a
    v-if="external || !internal"
    :href="href"
    :target="target ?? (external ? '_blank' : undefined)"
    :rel="external ? 'noopener' : undefined"
  >
    <slot />
  </a>

  <NuxtLink v-else :to="to" :target="target">
    <slot />
  </NuxtLink>
</template>
