<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';

// The docs tree. Groups carry their icon and title as a heading; leaves are
// plain links — no boxes, no borders, so the active item is the only thing
// with weight on the page.
defineProps<{ items: ContentNavigationItem[] }>();

/** `icon` comes from a page's frontmatter, which Content types as unknown. */
const iconOf = (item: ContentNavigationItem) =>
  typeof item.icon === 'string' ? item.icon : undefined;

const route = useRoute();
</script>

<template>
  <nav class="text-sm">
    <template v-for="item in items" :key="item.path">
      <div v-if="item.children?.length" class="mb-6">
        <p
          class="mb-2 flex items-center gap-2 px-2 text-[13px] font-medium text-foreground"
        >
          <Icon
            v-if="iconOf(item)"
            :name="iconOf(item)!"
            class="size-4 text-muted-foreground"
          />
          {{ item.title }}
        </p>
        <ul class="space-y-px">
          <li v-for="child in item.children" :key="child.path">
            <NuxtLink
              :to="child.path"
              class="block rounded-md px-2 py-1.5 transition-colors"
              :class="
                route.path === child.path
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              "
            >
              {{ child.title }}
            </NuxtLink>
          </li>
        </ul>
      </div>

      <NuxtLink
        v-else
        :to="item.path"
        class="mb-px flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
        :class="
          route.path === item.path
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        "
      >
        <Icon v-if="iconOf(item)" :name="iconOf(item)!" class="size-4" />
        {{ item.title }}
      </NuxtLink>
    </template>
  </nav>
</template>
