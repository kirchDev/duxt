<script setup lang="ts">
import type { DuxtTocLink } from '@duxt/utils/page-controls';

withDefaults(
  defineProps<{
    links: DuxtTocLink[];
    active?: string;
    level?: number;
  }>(),
  { level: 0 }
);
</script>

<template>
  <ul :class="level === 0 ? 'space-y-1 border-s' : undefined">
    <li v-for="link in links" :key="link.id">
      <a
        :href="`#${link.id}`"
        class="-ms-px block border-s py-1 transition-colors"
        :style="{ paddingInlineStart: `${1 + level * 0.75}rem` }"
        :class="
          active === link.id
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:border-primary/60 hover:text-foreground'
        "
        >{{ link.text }}</a
      >
      <DuxtTocList
        v-if="link.children?.length"
        :links="link.children"
        :active="active"
        :level="level + 1"
      />
    </li>
  </ul>
</template>
