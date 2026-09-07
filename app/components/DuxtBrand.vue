<script setup lang="ts">
/**
 * Whose site this is, in one place.
 *
 * The header draws it twice (mobile sheet, desktop bar) and the footer once, so
 * without this the branching between "a logo image" and "an icon beside a
 * title" would sit in three templates and drift between them.
 *
 * THE LAYER STAYS UNBRANDED. `logo` is unset by default and the fallback is a
 * generic book icon beside `title` — a site extending duxt must show its own
 * name, never this one. duxt's own `www/` sets `logo` like any other consumer,
 * which is also what keeps the option honest: the development site exercises
 * the same path a stranger takes.
 */
const props = withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), {
  size: 'md'
});

const duxt = useDuxtConfig();

// A wordmark is wider than it is tall and every one has its own ratio, so the
// height is fixed and the width follows. Matching the icon's box would squash
// one logo and starve another.
const logoHeight = computed(() => (props.size === 'sm' ? 'h-4' : 'h-5'));
const iconSize = computed(() => (props.size === 'sm' ? 'size-4' : 'size-5'));
</script>

<template>
  <template v-if="duxt.logo?.src">
    <!-- Two images and a CSS swap rather than reading the colour mode in
         script: `useColorMode()` resolves on the client, so a scripted choice
         renders the light mark into the server HTML and flips it after
         hydration. The same pattern the landing preview uses. -->
    <img
      :src="duxt.logo.src"
      :alt="duxt.logo.alt ?? duxt.title"
      :class="[logoHeight, duxt.logo.srcDark ? 'w-auto dark:hidden' : 'w-auto']"
      decoding="async"
    />
    <img
      v-if="duxt.logo.srcDark"
      :src="duxt.logo.srcDark"
      alt=""
      :class="[logoHeight, 'hidden w-auto dark:block']"
      decoding="async"
    />
  </template>

  <template v-else>
    <Icon name="lucide:book-open-text" :class="[iconSize, 'text-primary']" />
    {{ duxt.title }}
  </template>
</template>
