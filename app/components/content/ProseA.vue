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
 * prefix is put back here. A path that already carries the prefix is left
 * alone, so a link written the long way round still works.
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

const to = computed(() => {
  const href = props.href ?? '';
  if (external.value || !href.startsWith('/')) return href;

  const prefix = source.value?.prefix ?? '';
  const [path, hash] = href.split('#');
  const resolved =
    prefix && !isInside(path!, prefix) ? `${prefix}${path}` : path!;

  return `${localeLink(resolved)}${hash ? `#${hash}` : ''}`;
});
</script>

<template>
  <a
    v-if="external || !href?.startsWith('/')"
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
