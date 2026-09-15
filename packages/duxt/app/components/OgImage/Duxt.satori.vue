<script setup lang="ts">
/**
 * The layer's Open Graph image.
 *
 * Rendered by satori, not a browser, so this is a deliberately small subset of
 * CSS: flexbox, colours, borders, and nothing that needs layout beyond that. No
 * icon font and no external image, because satori resolves neither.
 *
 * The `.satori` in the file name is not decoration: nuxt-og-image reads the
 * renderer out of it and ignores a template that does not name one.
 *
 * A consumer overrides it the ordinary way — its own
 * `app/components/OgImage/Duxt.satori.vue` wins over the layer's, and pages go
 * on asking for `'Duxt'`.
 */
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    site?: string;
    version?: string;
  }>(),
  {
    title: 'Documentation',
    description: '',
    site: '',
    version: ''
  }
);
</script>

<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 100%;
      height: 100%;
      padding: 80px;
      background: #0a0a0a;
      color: #fafafa;
      font-family: sans-serif;
    "
  >
    <div style="display: flex; align-items: center; font-size: 30px">
      <span style="font-weight: 700">{{ site }}</span>
      <span
        v-if="version"
        style="
          margin-left: 20px;
          padding: 6px 16px;
          border: 2px solid #404040;
          border-radius: 999px;
          font-size: 22px;
          color: #a3a3a3;
        "
      >
        {{ version }}
      </span>
    </div>

    <div style="display: flex; flex-direction: column">
      <div style="font-size: 68px; font-weight: 700; line-height: 1.1">
        {{ title }}
      </div>
      <div
        v-if="description"
        style="
          margin-top: 24px;
          font-size: 30px;
          line-height: 1.4;
          color: #a3a3a3;
        "
      >
        {{ description.slice(0, 140) }}
      </div>
    </div>

    <div style="display: flex; height: 10px; background: #fafafa" />
  </div>
</template>
