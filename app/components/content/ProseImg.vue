<script setup lang="ts">
/**
 * An image in a page: theme-aware, and zoomable.
 *
 * TWO VARIANTS. A screenshot of a dark editor on a white page — or the reverse
 * — is the most common ugly thing in documentation, and CSS cannot fix it
 * because the pixels are wrong, not the frame. So a page may name a second
 * file:
 *
 *     ![The sidebar](/shots/sidebar.png){dark="/shots/sidebar-dark.png"}
 *
 * Named explicitly rather than guessed by convention. Deriving `-dark.png` from
 * the light path would 404 on every image that has no dark twin, and a broken
 * image is worse than a mismatched one. Both are rendered and CSS picks: a
 * `<picture>` with `prefers-color-scheme` would ignore the site's own toggle,
 * which is a class on `<html>` and not a media query.
 *
 * ZOOM. A screenshot scaled to a 48rem column is often unreadable, and the
 * browser's own zoom is not the answer when the image is 2400px wide. Clicking
 * opens it at full size; Escape and a click outside close it, both from the
 * Dialog primitive rather than hand-rolled.
 */
const props = defineProps<{
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  /** A second file for dark mode. */
  dark?: string;
  /** `false` turns the zoom off for a decorative image. */
  zoom?: boolean | string;
}>();

const open = ref(false);

const zoomable = computed(() => props.zoom !== false && props.zoom !== 'false');
</script>

<template>
  <span class="my-6 block">
    <component
      :is="zoomable ? 'button' : 'span'"
      :type="zoomable ? 'button' : undefined"
      class="block w-full"
      :class="zoomable ? 'cursor-zoom-in' : undefined"
      :aria-label="zoomable ? alt : undefined"
      @click="zoomable && (open = true)"
    >
      <NuxtImg
        :src="src"
        :alt="alt"
        :width="width"
        :height="height"
        loading="lazy"
        class="rounded-lg border"
        :class="dark ? 'block dark:hidden' : undefined"
      />
      <NuxtImg
        v-if="dark"
        :src="dark"
        :alt="alt"
        :width="width"
        :height="height"
        loading="lazy"
        class="hidden rounded-lg border dark:block"
      />
    </component>

    <Dialog v-if="zoomable" v-model:open="open">
      <DialogContent class="max-w-[min(96vw,80rem)] p-2">
        <DialogTitle class="sr-only">{{ alt }}</DialogTitle>
        <NuxtImg
          :src="src"
          :alt="alt"
          class="max-h-[85vh] w-full rounded-md object-contain"
          :class="dark ? 'block dark:hidden' : undefined"
        />
        <NuxtImg
          v-if="dark"
          :src="dark"
          :alt="alt"
          class="hidden max-h-[85vh] w-full rounded-md object-contain dark:block"
        />
      </DialogContent>
    </Dialog>
  </span>
</template>
