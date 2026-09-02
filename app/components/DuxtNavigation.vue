<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';

defineProps<{ items: ContentNavigationItem[] }>();

const route = useRoute();
</script>

<template>
  <nav class="text-sm">
    <ul class="space-y-1">
      <li v-for="item in items" :key="item.path">
        <NuxtLink
          :to="item.path"
          class="block rounded-md px-3 py-1.5 transition-colors hover:bg-accent hover:text-accent-foreground"
          :class="
            route.path === item.path
              ? 'bg-accent font-medium text-accent-foreground'
              : 'text-muted-foreground'
          "
        >
          {{ item.title }}
        </NuxtLink>

        <!-- One level of nesting is enough for a docs tree; deeper sections are
             a sign the docs need splitting, not the navigation more levels. -->
        <ul
          v-if="item.children?.length"
          class="mt-1 ml-3 space-y-1 border-l pl-3"
        >
          <li v-for="child in item.children" :key="child.path">
            <NuxtLink
              :to="child.path"
              class="block rounded-md px-3 py-1.5 transition-colors hover:bg-accent hover:text-accent-foreground"
              :class="
                route.path === child.path
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground'
              "
            >
              {{ child.title }}
            </NuxtLink>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
